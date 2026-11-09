<?php

namespace Database\Seeders;

use App\Models\Event;
use Illuminate\Database\Seeder;

class DatabaseSeeder extends Seeder
{
    public function run(): void
    {
        $this->call(DemoAccountsSeeder::class);

        // Seed data event dummy.
        Event::create([
            'title'       => 'Jakarta Cosplay Parade 2026',
            'date'        => '21 November 2026',
            'location'    => 'M Bloc Space, Jakarta',
            'theme'       => 'anime fantasy parade',
            'category'    => 'Komunitas',
            'tier'        => 'Gratis',
            'status'      => 'Disetujui',
            'image'       => 'https://images.unsplash.com/photo-1531058020387-3be344556be6?auto=format&fit=crop&w=900&q=85',
            'description' => 'Parade kostum dan panggung komunitas untuk semua fandom. Ada mini competition dan photo walk.',
            'featured'    => true,
        ]);

        Event::create([
            'title'       => 'Nusantara Pop Culture Fest',
            'date'        => '5 Desember 2026',
            'location'    => 'JCC Senayan, Jakarta',
            'theme'       => 'game fantasy pop culture',
            'category'    => 'Unggulan',
            'tier'        => 'Prabayar',
            'status'      => 'Disetujui',
            'image'       => 'https://images.unsplash.com/photo-1506157786151-b8491531f063?auto=format&fit=crop&w=900&q=85',
            'description' => 'Festival pop culture, cosplay showcase, artist alley, dan meet-and-greet bersama kreator.',
            'featured'    => true,
        ]);

        Event::create([
            'title'       => 'Malam Yokai: Cosplay Photo Walk',
            'date'        => '12 Desember 2026',
            'location'    => 'Kota Tua, Jakarta',
            'theme'       => 'japan kimono yokai',
            'category'    => 'Komunitas',
            'tier'        => 'Gratis',
            'status'      => 'Disetujui',
            'image'       => 'https://images.unsplash.com/photo-1493976040374-85c8e12f0c0e?auto=format&fit=crop&w=900&q=85',
            'description' => 'Jelajah malam bertema folklore Jepang dengan sesi foto bersama komunitas.',
            'featured'    => false,
        ]);
    }
}