<?php

namespace Tests\Feature;

use App\Http\Controllers\Api\EventController;
use App\Models\EventSubmissionToken;
use App\Models\User;
use Illuminate\Foundation\Testing\RefreshDatabase;
use Illuminate\Support\Facades\Http;
use Tests\TestCase;

class OrganizerEventWorkflowTest extends TestCase
{
    use RefreshDatabase;

    public function test_free_submission_token_is_single_use_and_consumed_when_approved(): void
    {
        $token = $this->postJson('/api/events/submission-token/free')->assertOk()->json('token');
        $response = $this->postJson('/api/events', $this->submissionPayload($token));

        $response->assertCreated();
        $eventId = $response->json('event.id');
        $this->assertDatabaseHas('events', ['id' => $eventId, 'tier' => 'Gratis', 'payment_status' => 'Tidak ada']);
        $this->assertDatabaseHas('event_submission_tokens', [
            'event_id' => $eventId,
            'consumed_at' => null,
        ]);
        $this->postJson('/api/events', $this->submissionPayload($token))->assertStatus(409);

        $admin = User::factory()->create(['role' => 'admin']);
        $apiToken = $admin->issueToken();
        $this->withToken($apiToken)
            ->patchJson("/api/events/{$eventId}", ['status' => 'Disetujui'])
            ->assertOk()
            ->assertJsonPath('event.status', 'Disetujui');

        $this->assertNotNull(EventSubmissionToken::where('event_id', $eventId)->firstOrFail()->consumed_at);
        $this->postJson('/api/events', $this->submissionPayload($token))->assertStatus(409);
    }

    public function test_paid_submission_uses_server_price_and_rejection_sets_97_percent_refund(): void
    {
        $token = $this->postJson('/api/events/submission-token/paid')->assertOk()->json('token');
        $payload = $this->submissionPayload($token, 'Prabayar') + [
            'eventInformation' => 'Tiket mulai dijual 1 Desember melalui situs resmi.',
            'eventPdfName' => 'rincian.pdf',
            'eventPdf' => $this->dataUrl('application/pdf', '%PDF-1.4'),
            'promotionDays' => 15,
            'paymentProofName' => 'bukti.jpg',
            'paymentProofImage' => $this->dataUrl('image/jpeg', 'proof'),
            'organizerEmail' => 'organizer@example.com',
            'refundBankName' => 'Bank Contoh',
            'refundAccountNumber' => '1234567890',
            'refundAccountHolder' => 'Pemilik Event',
        ];
        $response = $this->postJson('/api/events', $payload)
            ->assertCreated()
            ->assertJsonPath('event.eventInformation', 'Tiket mulai dijual 1 Desember melalui situs resmi.');
        $this->assertArrayNotHasKey('tickerText', $response->json('event'));
        $eventId = $response->json('event.id');

        $this->assertDatabaseHas('events', [
            'id' => $eventId,
            'promotion_price' => 45000,
            'amount_paid' => 45000,
            'payment_status' => 'Menunggu verifikasi',
            'wallet_status' => 'Belum masuk (simulasi)',
            'event_information' => 'Tiket mulai dijual 1 Desember melalui situs resmi.',
        ]);

        $admin = User::factory()->create(['role' => 'admin']);
        $this->withToken($admin->issueToken())
            ->patchJson("/api/events/{$eventId}", ['status' => 'Ditolak'])
            ->assertOk()
            ->assertJsonPath('event.refundAmount', 43650)
            ->assertJsonPath('event.paymentStatus', 'Refund perlu diproses')
            ->assertJsonPath('event.walletStatus', 'Tidak dikreditkan (simulasi)');
    }

    public function test_paid_approval_marks_simulated_wallet_funds_as_received(): void
    {
        $token = $this->postJson('/api/events/submission-token/paid')->assertOk()->json('token');
        $payload = $this->submissionPayload($token, 'Prabayar') + [
            'eventPdfName' => 'rincian.pdf',
            'eventPdf' => $this->dataUrl('application/pdf', '%PDF-1.4'),
            'promotionDays' => 15,
            'paymentProofName' => 'bukti.jpg',
            'paymentProofImage' => $this->dataUrl('image/jpeg', 'proof'),
            'organizerEmail' => 'organizer@example.com',
            'refundBankName' => 'Bank Contoh',
            'refundAccountNumber' => '1234567890',
            'refundAccountHolder' => 'Pemilik Event',
        ];
        $eventId = $this->postJson('/api/events', $payload)->assertCreated()->json('event.id');
        $admin = User::factory()->create(['role' => 'admin']);

        $this->withToken($admin->issueToken())
            ->patchJson("/api/events/{$eventId}", ['status' => 'Disetujui'])
            ->assertOk()
            ->assertJsonPath('event.paymentStatus', 'Terverifikasi')
            ->assertJsonPath('event.walletStatus', 'Dana diterima (simulasi)');

        $this->assertDatabaseHas('events', [
            'id' => $eventId,
            'status' => 'Disetujui',
            'wallet_status' => 'Dana diterima (simulasi)',
        ]);
    }

    public function test_unreviewed_paid_submission_becomes_full_refund_after_72_hours(): void
    {
        $token = $this->postJson('/api/events/submission-token/paid')->assertOk()->json('token');
        $payload = $this->submissionPayload($token, 'Prabayar') + [
            'eventPdfName' => 'rincian.pdf',
            'eventPdf' => $this->dataUrl('application/pdf', '%PDF-1.4'),
            'promotionDays' => 15,
            'paymentProofName' => 'bukti.jpg',
            'paymentProofImage' => $this->dataUrl('image/jpeg', 'proof'),
            'organizerEmail' => 'organizer@example.com',
            'refundBankName' => 'Bank Contoh',
            'refundAccountNumber' => '1234567890',
            'refundAccountHolder' => 'Pemilik Event',
        ];
        $eventId = $this->postJson('/api/events', $payload)->assertCreated()->json('event.id');

        $this->travel(73)->hours();
        EventController::expireUnreviewedPayments();

        $this->assertDatabaseHas('events', [
            'id' => $eventId,
            'status' => 'Ditolak',
            'payment_status' => 'Refund perlu diproses',
            'refund_amount' => 45000,
            'wallet_status' => 'Tidak dikreditkan (simulasi)',
            'refund_reason' => 'Tidak ada respons admin dalam 3×24 jam; refund penuh.',
        ]);
    }

    public function test_paid_event_draft_requires_gemini_when_not_configured(): void
    {
        config(['services.gemini.api_key' => null]);

        $this->postJson('/api/events/ai-draft', [
            'poster' => $this->dataUrl('image/jpeg', 'poster'),
            'pdf' => $this->dataUrl('application/pdf', '%PDF-1.4'),
        ])
            ->assertStatus(503)
            ->assertJsonPath('message', 'AI belum aktif. Admin perlu memasang GEMINI_API_KEY di konfigurasi server sebelum iklan Prabayar dapat dibuat.');
    }

    public function test_paid_event_draft_uses_poster_and_pdf_to_create_preview_data(): void
    {
        config(['services.gemini.api_key' => 'test-key']);
        Http::fake([
            'generativelanguage.googleapis.com/*' => Http::response([
                'candidates' => [[
                    'content' => ['parts' => [[
                        'text' => json_encode([
                            'title' => 'Anime Gathering',
                            'date' => '21 November 2026',
                            'location' => 'Jakarta',
                            'theme' => 'Anime',
                            'description' => 'Temui komunitas anime di acara sehari penuh.',
                            'eventInformation' => 'Pendaftaran melalui situs penyelenggara.',
                            'highlightText' => 'Bertemu sesama fans',
                            'copywriting' => 'Rayakan anime bersama komunitas dalam satu hari penuh.',
                            'themeRecommendation' => 'Sakura Pop',
                            'accentColor' => '#e84393',
                            'followUpQuestions' => [],
                        ], JSON_UNESCAPED_UNICODE),
                    ]]],
                ]],
            ], 200),
        ]);

        $this->postJson('/api/events/ai-draft', [
            'poster' => $this->dataUrl('image/jpeg', 'poster'),
            'pdf' => $this->dataUrl('application/pdf', '%PDF-1.4'),
        ])
            ->assertOk()
            ->assertJsonPath('draft.title', 'Anime Gathering')
            ->assertJsonPath('draft.eventInformation', 'Pendaftaran melalui situs penyelenggara.')
            ->assertJsonPath('draft.copywriting', 'Rayakan anime bersama komunitas dalam satu hari penuh.')
            ->assertJsonPath('draft.accentColor', '#e84393');
    }

    private function submissionPayload(string $token, string $tier = 'Gratis'): array
    {
        return [
            'submissionToken' => $token,
            'title' => 'Cosplay Gathering',
            'date' => '15 Desember 2026',
            'location' => 'Jakarta',
            'theme' => 'Anime',
            'description' => 'Acara komunitas cosplay.',
            'tier' => $tier,
            'image' => $this->dataUrl('image/jpeg', 'poster'),
            'organizerEmail' => 'organizer@example.com',
            'termsAccepted' => true,
        ];
    }

    private function dataUrl(string $mime, string $contents): string
    {
        return "data:{$mime};base64,".base64_encode($contents);
    }
}
