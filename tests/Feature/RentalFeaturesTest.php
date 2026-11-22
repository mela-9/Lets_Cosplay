<?php

namespace Tests\Feature;

use App\Models\Costume;
use App\Models\Order;
use App\Models\User;
use Illuminate\Foundation\Testing\RefreshDatabase;
use Tests\TestCase;

class RentalFeaturesTest extends TestCase
{
    use RefreshDatabase;

    private const IMG = 'data:image/jpeg;base64,/9j/4AAQ';

    private function admin(): array
    {
        $u = User::factory()->create(['role' => 'admin', 'email' => 'a@x.com']);

        return [$u, $u->issueToken()];
    }

    private function customer(array $over = []): array
    {
        $u = User::factory()->create($over + [
            'role' => 'customer', 'phone' => '081234567890', 'address' => 'Jl. Melati No. 12 Jakarta',
            'social_platform' => 'Instagram', 'social_handle' => '@x', 'guarantor_phone' => '081298765432',
            'id_selfie' => self::IMG, 'id_selfie_name' => 'ktp.jpg', 'id_status' => 'pending', 'previous_rental' => 'no',
        ]);

        return [$u, $u->issueToken()];
    }

    private function costume(array $sizeStock = ['S' => 2, 'M' => 3, 'L' => 0]): Costume
    {
        return Costume::create([
            'name' => 'Tes', 'series' => 'Seri', 'category' => 'Anime', 'price' => 100000, 'deposit' => 50000,
            'image' => 'https://x.test/a.jpg', 'size_stock' => $sizeStock,
        ]);
    }

    private function orderPayload(Costume $c, array $items, array $extra = []): array
    {
        $units = array_sum(array_column($items, 'qty'));
        $total = 100000 * 2 * $units + 18000 + 50000 * $units;

        return $extra + [
            'productId' => $c->id, 'items' => $items, 'days' => 2, 'rentalDate' => now()->addDay()->toDateString(),
            'dp' => (int) ceil($total * 0.5), 'paymentMethod' => 'Transfer bank', 'address' => 'Jl. Melati No. 12 Jakarta',
            'paymentProofImage' => self::IMG, 'rulesAccepted' => true,
        ];
    }

    public function test_stock_is_tracked_per_size_and_total_follows(): void
    {
        $c = $this->costume();
        $this->assertSame(5, $c->stock);
        $this->assertSame(['S', 'M', 'L'], $c->size);
    }

    public function test_multi_size_order_deducts_each_size_and_prices_per_unit(): void
    {
        $c = $this->costume();
        [, $token] = $this->customer();

        $res = $this->withToken($token)->postJson('/api/orders', $this->orderPayload($c, [
            ['size' => 'S', 'qty' => 2], ['size' => 'M', 'qty' => 1],
        ]))->assertCreated();

        $res->assertJsonPath('order.quantity', 3)->assertJsonPath('order.size', 'S×2, M×1');
        // 100.000×2 hari×3 unit + 18.000 ongkir + deposit 50.000×3
        $this->assertSame(600000 + 18000 + 150000, $res->json('order.total'));
        $c->refresh();
        $this->assertSame(['S' => 0, 'M' => 2, 'L' => 0], $c->size_stock);
        $this->assertSame(2, $c->stock);
    }

    public function test_cannot_order_more_than_size_stock(): void
    {
        $c = $this->costume();
        [, $token] = $this->customer();

        $this->withToken($token)->postJson('/api/orders', $this->orderPayload($c, [['size' => 'S', 'qty' => 3]]))
            ->assertStatus(422)->assertJsonPath('message', 'Stok ukuran S tersisa 2 unit (kamu memilih 3).');
        $this->withToken($token)->postJson('/api/orders', $this->orderPayload($c, [['size' => 'L', 'qty' => 1]]))
            ->assertStatus(422)->assertJsonPath('message', 'Maaf, stok ukuran L sedang habis.');
        $this->assertSame(5, $c->fresh()->stock);
    }

    public function test_group_order_needs_name_and_two_units_and_stock_returns_on_completion(): void
    {
        $c = $this->costume();
        [, $token] = $this->customer();
        [, $adminToken] = $this->admin();

        $this->withToken($token)->postJson('/api/orders', $this->orderPayload($c, [['size' => 'M', 'qty' => 2]], ['isGroup' => true]))
            ->assertStatus(422);
        $this->withToken($token)->postJson('/api/orders', $this->orderPayload($c, [['size' => 'M', 'qty' => 1]], ['isGroup' => true, 'groupName' => 'Tim']))
            ->assertStatus(422);

        $res = $this->withToken($token)->postJson('/api/orders', $this->orderPayload($c, [['size' => 'M', 'qty' => 3]], [
            'isGroup' => true, 'groupName' => 'XII IPA 2', 'groupMembers' => "Ani\nBudi\nCici",
        ]))->assertCreated()->assertJsonPath('order.isGroup', true)->assertJsonPath('order.groupName', 'XII IPA 2');
        $code = $res->json('order.id');
        $this->assertSame(0, $c->fresh()->stockFor('M'));

        // KTP sudah diverifikasi → admin boleh memproses sampai selesai, stok kembali penuh.
        User::where('role', 'customer')->update(['id_status' => 'verified']);
        $this->withToken($adminToken)->patchJson("/api/orders/{$code}", ['stage' => 7])->assertOk();
        $this->assertSame(3, $c->fresh()->stockFor('M'));
        $this->assertSame(5, $c->fresh()->stock);
    }

    public function test_rules_must_be_accepted_before_ordering(): void
    {
        $c = $this->costume();
        [$u, $token] = $this->customer();
        $payload = $this->orderPayload($c, [['size' => 'S', 'qty' => 1]]);
        unset($payload['rulesAccepted']);

        $this->withToken($token)->postJson('/api/orders', $payload)->assertStatus(422);
        $this->withToken($token)->postJson('/api/rules/accept')->assertOk()->assertJsonStructure(['user' => ['rulesAcceptedAt']]);
        $this->assertNotNull($u->fresh()->rules_accepted_at);
        $this->withToken($token)->postJson('/api/orders', $payload)->assertCreated();
    }

    public function test_admin_verifies_ktp_and_order_needs_it(): void
    {
        $c = $this->costume();
        [$u, $token] = $this->customer();
        [, $adminToken] = $this->admin();
        $code = $this->withToken($token)->postJson('/api/orders', $this->orderPayload($c, [['size' => 'S', 'qty' => 1]]))
            ->assertCreated()->json('order.id');

        // Belum diverifikasi → pesanan tidak bisa naik tahap.
        $this->withToken($adminToken)->patchJson("/api/orders/{$code}", ['stage' => 2])->assertStatus(422);

        $this->withToken($adminToken)->getJson('/api/identities')->assertOk()->assertJsonPath('0.status', 'pending');
        $this->withToken($adminToken)->getJson("/api/identities/{$u->id}")->assertOk()->assertJsonPath('idSelfieImage', self::IMG);

        // Tolak wajib beserta alasan, dan penyewa melihat status di profilnya.
        $this->withToken($adminToken)->patchJson("/api/identities/{$u->id}", ['status' => 'rejected'])->assertStatus(422);
        $this->withToken($adminToken)->patchJson("/api/identities/{$u->id}", ['status' => 'rejected', 'reason' => 'Foto buram'])->assertOk();
        $this->withToken($token)->getJson('/api/me')->assertJsonPath('user.idStatus', 'rejected')->assertJsonPath('user.idRejectReason', 'Foto buram');
        $this->withToken($token)->postJson('/api/orders', $this->orderPayload($c, [['size' => 'S', 'qty' => 1]]))->assertStatus(422);

        // Unggah ulang → kembali menunggu; admin setujui → pesanan bisa lanjut.
        $this->withToken($token)->putJson('/api/profile', [
            'name' => $u->name, 'email' => $u->email, 'phone' => '081234567890', 'address' => 'Jl. Melati No. 12 Jakarta',
            'socialPlatform' => 'Instagram', 'socialHandle' => '@x', 'guarantor' => '081298765432', 'idSelfie' => self::IMG.'AAAA',
        ])->assertOk()->assertJsonPath('user.idStatus', 'pending');
        $this->withToken($adminToken)->patchJson("/api/identities/{$u->id}", ['status' => 'verified'])->assertOk();
        $this->withToken($token)->getJson('/api/me')->assertJsonPath('user.idStatus', 'verified');
        $this->withToken($adminToken)->patchJson("/api/orders/{$code}", ['stage' => 2])->assertOk();
    }

    public function test_review_flow_customer_writes_admin_replies_rating_updates(): void
    {
        $c = $this->costume();
        [$u, $token] = $this->customer(['id_status' => 'verified']);
        [, $adminToken] = $this->admin();
        $code = $this->withToken($token)->postJson('/api/orders', $this->orderPayload($c, [['size' => 'S', 'qty' => 1]]))->json('order.id');

        // Belum selesai → belum boleh mengulas.
        $this->withToken($token)->postJson("/api/orders/{$code}/review", ['rating' => 5])->assertStatus(422);
        $this->withToken($adminToken)->patchJson("/api/orders/{$code}", ['stage' => 7])->assertOk();

        $this->withToken($token)->postJson("/api/orders/{$code}/review", ['rating' => 0])->assertStatus(422);
        $this->withToken($token)->postJson("/api/orders/{$code}/review", ['rating' => 4, 'comment' => 'Bagus'])->assertOk();
        // Mengulas lagi = mengubah, bukan menggandakan.
        $this->withToken($token)->postJson("/api/orders/{$code}/review", ['rating' => 5, 'comment' => 'Sangat bagus'])->assertOk();
        $c->refresh();
        $this->assertSame(1, $c->reviews);
        $this->assertEquals(5.0, $c->rating);

        // Pembeli lain tidak bisa mengulas pesanan orang.
        [, $other] = $this->customer(['email' => 'o@x.com']);
        $this->withToken($other)->postJson("/api/orders/{$code}/review", ['rating' => 1])->assertNotFound();

        // Publik melihat ulasan; penjual membalas.
        $this->getJson("/api/costumes/{$c->id}/reviews")->assertOk()->assertJsonPath('count', 1)->assertJsonPath('reviews.0.comment', 'Sangat bagus');
        $reviewId = $this->withToken($adminToken)->getJson('/api/reviews')->assertOk()->json('reviews.0.id');
        $this->withToken($adminToken)->patchJson("/api/reviews/{$reviewId}/reply", ['reply' => 'Terima kasih!'])->assertOk();
        $this->getJson("/api/costumes/{$c->id}/reviews")->assertJsonPath('reviews.0.reply', 'Terima kasih!');
        $this->withToken($token)->getJson('/api/orders')->assertJsonPath('0.review.reply', 'Terima kasih!');

        $this->withToken($token)->getJson('/api/reviews')->assertStatus(403);
    }

    public function test_admin_manages_per_size_stock_and_gallery_images(): void
    {
        [, $adminToken] = $this->admin();
        $res = $this->withToken($adminToken)->postJson('/api/costumes', [
            'name' => 'Baru', 'series' => 'S', 'category' => 'Game', 'price' => 90000, 'deposit' => 40000,
            'sizeStock' => ['s' => 2, 'M' => 0, 'XL' => 5],
            'images' => ['https://x.test/1.jpg', 'https://x.test/2.jpg'],
        ])->assertCreated();
        $id = $res->json('data.id');
        $res->assertJsonPath('data.stock', 7)->assertJsonPath('data.image', 'https://x.test/1.jpg')->assertJsonPath('data.size', ['S', 'M', 'XL']);

        $this->withToken($adminToken)->patchJson("/api/costumes/{$id}/stock", ['size' => 'M', 'delta' => 4])->assertOk()->assertJsonPath('data.stock', 11);
        $this->withToken($adminToken)->patchJson("/api/costumes/{$id}/stock", ['size' => 'M', 'delta' => -9])->assertStatus(422);
        $this->withToken($adminToken)->patchJson("/api/costumes/{$id}/stock", ['size' => 'XXL', 'delta' => 1])->assertStatus(422);
        $this->withToken($adminToken)->postJson('/api/costumes', [
            'name' => 'Baru', 'series' => 'S', 'category' => 'Game', 'price' => 90000, 'deposit' => 40000, 'sizeStock' => [],
        ])->assertStatus(422);
        $this->assertCount(2, Costume::find($id)->images);
    }
}
