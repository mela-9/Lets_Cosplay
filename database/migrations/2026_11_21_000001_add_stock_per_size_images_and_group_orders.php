<?php

use Illuminate\Database\Migrations\Migration;
use Illuminate\Database\Schema\Blueprint;
use Illuminate\Support\Facades\DB;
use Illuminate\Support\Facades\Schema;

return new class extends Migration
{
    public function up(): void
    {
        Schema::table('costumes', function (Blueprint $table) {
            $table->json('size_stock')->nullable();   // {"S":2,"M":1} → stok per ukuran
            $table->json('images')->nullable();       // galeri foto, images[0] = sampul
        });

        Schema::table('orders', function (Blueprint $table) {
            $table->json('items')->nullable();        // [{"size":"M","qty":2}, ...]
            $table->unsignedInteger('quantity')->default(1);
            $table->boolean('is_group')->default(false);
            $table->string('group_name')->nullable();
            $table->text('group_members')->nullable();
        });

        Schema::table('users', function (Blueprint $table) {
            $table->timestamp('rules_accepted_at')->nullable();
            $table->string('id_status', 20)->default('none');   // none | pending | verified | rejected
            $table->timestamp('id_reviewed_at')->nullable();
            $table->string('id_reject_reason')->nullable();
        });

        Schema::create('reviews', function (Blueprint $table) {
            $table->id();
            $table->foreignId('order_id')->unique()->constrained()->cascadeOnDelete();
            $table->foreignId('user_id')->constrained()->cascadeOnDelete();
            $table->unsignedBigInteger('costume_id')->nullable()->index();
            $table->unsignedTinyInteger('rating');
            $table->text('comment')->nullable();
            $table->text('reply')->nullable();
            $table->timestamp('replied_at')->nullable();
            $table->timestamps();
        });

        // ---- Data lama ----
        // Stok total lama dibagi rata ke ukuran yang ada (total tetap sama).
        foreach (DB::table('costumes')->get() as $row) {
            $sizes = json_decode($row->size ?? '[]', true) ?: [];
            if (!$sizes) {
                continue;
            }
            $base = intdiv((int) $row->stock, count($sizes));
            $extra = (int) $row->stock % count($sizes);
            $map = [];
            foreach (array_values($sizes) as $i => $size) {
                $map[$size] = $base + ($i < $extra ? 1 : 0);
            }
            DB::table('costumes')->where('id', $row->id)->update([
                'size_stock' => json_encode($map),
                'images' => json_encode([$row->image]),
                // Angka ulasan lama hanyalah data contoh tanpa isi; mulai dari nol agar sesuai ulasan nyata.
                'reviews' => 0,
            ]);
        }

        // Pesanan lama = 1 unit dengan ukuran tunggal.
        foreach (DB::table('orders')->get() as $row) {
            DB::table('orders')->where('id', $row->id)->update([
                'items' => json_encode([['size' => $row->size, 'qty' => 1]]),
                'quantity' => 1,
            ]);
        }

        // KTP/selfie yang sudah pernah diunggah masuk antrean verifikasi admin.
        DB::table('users')->whereNotNull('id_selfie')->where('id_selfie', '!=', '')->update(['id_status' => 'pending']);
    }

    public function down(): void
    {
        Schema::dropIfExists('reviews');
        Schema::table('users', fn (Blueprint $t) => $t->dropColumn(['rules_accepted_at', 'id_status', 'id_reviewed_at', 'id_reject_reason']));
        Schema::table('orders', fn (Blueprint $t) => $t->dropColumn(['items', 'quantity', 'is_group', 'group_name', 'group_members']));
        Schema::table('costumes', fn (Blueprint $t) => $t->dropColumn(['size_stock', 'images']));
    }
};
