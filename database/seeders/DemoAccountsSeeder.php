<?php

namespace Database\Seeders;

use App\Models\User;
use Illuminate\Database\Seeder;

class DemoAccountsSeeder extends Seeder
{
    public function run(): void
    {
        User::updateOrCreate(
            ['email' => 'barbarapavin3099@gmail.com'],
            [
                'name' => 'Barbara Pavin',
                'password' => '12345678',
                'role' => 'customer',
                'phone' => '081234567890',
                'address' => 'Jl. Melati No. 12, RT 03/RW 05, Kebayoran Baru, Jakarta Selatan 12120',
                'social_platform' => 'Instagram',
                'social_handle' => '@barbara.cosplay',
                'guarantor_phone' => '081298765432',
                'previous_rental' => 'no',
            ],
        );

        User::updateOrCreate(
            ['email' => 'adminrental123@gmail.com'],
            ['name' => 'Admin Rental', 'password' => '12345678910', 'role' => 'admin'],
        );
    }
}
