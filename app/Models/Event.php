<?php

namespace App\Models;

use Illuminate\Database\Eloquent\Factories\HasFactory;
use Illuminate\Database\Eloquent\Model;

class Event extends Model
{
    use HasFactory;

    protected $fillable = [
        'title', 'date', 'location', 'theme', 'category', 'tier', 'status',
        'image', 'description', 'featured',
        'payment_proof_name', 'payment_proof_image', 'terms_accepted',
        'organizer_email', 'organizer_phone', 'refund_bank_name', 'refund_account_number',
        'refund_account_holder', 'event_pdf_name', 'event_pdf', 'promotion_days', 'promotion_price',
        'copywriting', 'highlight_text', 'accent_color', 'theme_recommendation', 'event_information',
        'correction_request', 'payment_status', 'amount_paid', 'payment_submitted_at',
        'payment_review_deadline_at', 'approved_at', 'listing_until', 'refund_amount',
        'refund_status', 'refund_reason', 'refund_proof_name', 'refund_proof_image', 'wallet_status',
    ];

    protected $casts = [
        'featured' => 'boolean',
        'terms_accepted' => 'boolean',
        'payment_submitted_at' => 'datetime',
        'payment_review_deadline_at' => 'datetime',
        'approved_at' => 'datetime',
        'listing_until' => 'datetime',
    ];

    /** Bentuk data yang dipakai frontend. Bukti bayar hanya untuk admin. */
    public function toFront(bool $withPrivateData = false): array
    {
        $data = [
            'id' => (string) $this->id,
            'title' => $this->title,
            'date' => $this->date,
            'location' => $this->location,
            'theme' => $this->theme,
            'category' => $this->category,
            'tier' => $this->tier,
            'status' => $this->status,
            'image' => $this->image,
            'description' => $this->description,
            'eventInformation' => $this->event_information,
            'featured' => $this->featured,
            'promotionDays' => $this->promotion_days,
            'promotionPrice' => $this->promotion_price,
            'copywriting' => $this->copywriting,
            'highlightText' => $this->highlight_text,
            'accentColor' => $this->accent_color,
            'themeRecommendation' => $this->theme_recommendation,
            'correctionRequest' => $this->correction_request,
            'paymentStatus' => $this->payment_status,
            'walletStatus' => $this->wallet_status,
            'amountPaid' => $this->amount_paid,
            'paymentReviewDeadlineAt' => $this->payment_review_deadline_at?->toIso8601String(),
            'refundAmount' => $this->refund_amount,
            'refundStatus' => $this->refund_status,
            'refundReason' => $this->refund_reason,
            'listingUntil' => $this->listing_until?->toIso8601String(),
        ];

        if ($withPrivateData) {
            $data['paymentProofName'] = $this->payment_proof_name;
            $data['paymentProofImage'] = $this->payment_proof_image;
            $data['eventPdfName'] = $this->event_pdf_name;
            $data['eventPdf'] = $this->event_pdf;
            $data['organizerEmail'] = $this->organizer_email;
            $data['organizerPhone'] = $this->organizer_phone;
            $data['refundBankName'] = $this->refund_bank_name;
            $data['refundAccountNumber'] = $this->refund_account_number;
            $data['refundAccountHolder'] = $this->refund_account_holder;
            $data['refundProofName'] = $this->refund_proof_name;
            $data['refundProofImage'] = $this->refund_proof_image;
        }

        return $data;
    }
}
