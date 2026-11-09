<?php

namespace Database\Seeders;

use App\Models\User;
use Illuminate\Database\Seeder;
use Illuminate\Support\Facades\Hash;

class DemoAccountsSeeder extends Seeder
{
    public function run(): void
    {
        User::updateOrCreate(
            ['email' => 'barbarapavin3099@gmail.com'],
            [
                'name' => 'Barbara Pavin',
                'password' => Hash::make('12345678'),
                'role' => 'customer',
            ],
        );

        User::updateOrCreate(
            ['email' => 'adminrental123@gmail.com'],
            [
                'name' => 'Admin Rental',
                'password' => Hash::make('12345678910'),
                'role' => 'admin',
            ],
        );
    }
}
