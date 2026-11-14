<?php

use Illuminate\Database\Migrations\Migration;
use Illuminate\Database\Schema\Blueprint;
use Illuminate\Support\Facades\Schema;

return new class extends Migration
{
    public function up(): void
    {
        Schema::table('users', function (Blueprint $table) {
            if (!Schema::hasColumn('users', 'role')) {
                $table->string('role')->default('customer');
            }
            if (!Schema::hasColumn('users', 'phone')) {
                $table->string('phone')->nullable();
                $table->text('address')->nullable();
                $table->string('social_platform')->nullable();
                $table->string('social_handle')->nullable();
                $table->string('guarantor_phone')->nullable();
                $table->string('id_selfie_name')->nullable();
                $table->longText('id_selfie')->nullable();
                $table->string('previous_rental')->nullable(); // yes | no
                $table->string('previous_store')->nullable();
                $table->string('api_token', 64)->nullable()->index(); // sha256 dari token
            }
        });
    }

    public function down(): void
    {
        Schema::table('users', function (Blueprint $table) {
            $table->dropColumn([
                'phone', 'address', 'social_platform', 'social_handle', 'guarantor_phone',
                'id_selfie_name', 'id_selfie', 'previous_rental', 'previous_store', 'api_token',
            ]);
        });
    }
};
