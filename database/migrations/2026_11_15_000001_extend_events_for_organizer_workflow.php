<?php

use Illuminate\Database\Migrations\Migration;
use Illuminate\Database\Schema\Blueprint;
use Illuminate\Support\Facades\Schema;

return new class extends Migration
{
    public function up(): void
    {
        Schema::table('events', function (Blueprint $table) {
            $table->string('organizer_email')->nullable();
            $table->string('organizer_phone', 40)->nullable();
            $table->string('refund_bank_name')->nullable();
            $table->string('refund_account_number', 80)->nullable();
            $table->string('refund_account_holder')->nullable();
            $table->string('event_pdf_name')->nullable();
            $table->longText('event_pdf')->nullable();
            $table->unsignedSmallInteger('promotion_days')->default(15);
            $table->unsignedInteger('promotion_price')->default(0);
            $table->text('copywriting')->nullable();
            $table->string('ticker_text')->nullable();
            $table->string('highlight_text')->nullable();
            $table->string('accent_color', 7)->default('#F45193');
            $table->string('theme_recommendation')->nullable();
            $table->text('correction_request')->nullable();
            $table->string('payment_status', 40)->default('Tidak ada');
            $table->unsignedInteger('amount_paid')->default(0);
            $table->timestamp('payment_submitted_at')->nullable();
            $table->timestamp('payment_review_deadline_at')->nullable();
            $table->timestamp('approved_at')->nullable();
            $table->timestamp('listing_until')->nullable();
            $table->unsignedInteger('refund_amount')->nullable();
            $table->string('refund_status', 40)->nullable();
            $table->string('refund_reason')->nullable();
            $table->string('refund_proof_name')->nullable();
            $table->longText('refund_proof_image')->nullable();
        });

        Schema::create('event_submission_tokens', function (Blueprint $table) {
            $table->id();
            $table->char('token_hash', 64)->unique();
            $table->enum('tier', ['Gratis', 'Prabayar']);
            $table->foreignId('event_id')->nullable()->unique()->constrained()->nullOnDelete();
            $table->timestamp('consumed_at')->nullable();
            $table->timestamps();
        });
    }

    public function down(): void
    {
        Schema::dropIfExists('event_submission_tokens');

        Schema::table('events', function (Blueprint $table) {
            $table->dropColumn([
                'organizer_email', 'organizer_phone',
                'refund_bank_name', 'refund_account_number', 'refund_account_holder',
                'event_pdf_name', 'event_pdf', 'promotion_days', 'promotion_price',
                'copywriting', 'ticker_text', 'highlight_text', 'accent_color',
                'theme_recommendation', 'correction_request', 'payment_status',
                'amount_paid', 'payment_submitted_at', 'payment_review_deadline_at',
                'approved_at', 'listing_until', 'refund_amount', 'refund_status',
                'refund_reason', 'refund_proof_name', 'refund_proof_image',
            ]);
        });
    }
};
