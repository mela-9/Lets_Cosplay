<?php

namespace Database\Seeders;

use Illuminate\Database\Seeder;
use App\Models\Costume;

class CostumeSeeder extends Seeder
{
    public function run(): void
    {
        // Hapus data lama agar tidak duplikat saat db:seed dijalankan ulang
        Costume::truncate();

        $costumes = [
            [
                'name' => 'Raiden Shogun',
                'series' => 'Genshin Impact',
                'origin' => 'Inazuma',
                'category' => 'Game',
                'size' => ['S', 'M', 'L'],
                'price' => 175000,
                'deposit' => 87500,
                'stock' => 3,
                'rating' => 4.9,
                'reviews' => 28,
                'tag' => 'Terlaris',
                'image' => 'https://upload.wikimedia.org/wikipedia/commons/thumb/3/38/Cosplay_of_Raiden_Shogun_DSCF1208.jpg/900px-Cosplay_of_Raiden_Shogun_DSCF1208.jpg',
                'description' => 'Cosplay Raiden Shogun dengan palet ungu Inazuma, obi merah, dan detail motif Electro.',
                'accessories' => ['Wig ungu', 'Obi dan aksesori rambut', 'Prop pedang foam'],
                'themes' => ['game', 'genshin', 'inazuma', 'electro', 'purple']
            ],
            [
                'name' => 'Kamado Nezuko',
                'series' => 'Demon Slayer: Kimetsu no Yaiba',
                'origin' => 'Kimetsu no Yaiba',
                'category' => 'Anime',
                'size' => ['S', 'M'],
                'price' => 120000,
                'deposit' => 60000,
                'stock' => 4,
                'rating' => 4.9,
                'reviews' => 34,
                'tag' => 'Favorit komunitas',
                'image' => 'https://upload.wikimedia.org/wikipedia/commons/thumb/2/23/Cosplay_of_Nezuko_Kamado_at_Made_in_Asia_2022_%2852111635324%29.jpg/900px-Cosplay_of_Nezuko_Kamado_at_Made_in_Asia_2022_%2852111635324%29.jpg',
                'description' => 'Cosplay kimono Nezuko dengan haori gelap, obi merah muda, dan bambu prop.',
                'accessories' => ['Haori hitam', 'Obi merah muda', 'Bambu prop'],
                'themes' => ['anime', 'kimono', 'japan', 'demon', 'pink']
            ],
            [
                'name' => 'Gojo Satoru',
                'series' => 'Jujutsu Kaisen',
                'origin' => 'Jujutsu High',
                'category' => 'Anime',
                'size' => ['M', 'L', 'XL'],
                'price' => 150000,
                'deposit' => 75000,
                'stock' => 2,
                'rating' => 4.8,
                'reviews' => 19,
                'tag' => 'Pilihan editor',
                'image' => 'https://upload.wikimedia.org/wikipedia/commons/thumb/4/4c/Satoru_Goj%C5%8D_cosplay.jpg/720px-Satoru_Goj%C5%8D_cosplay.jpg',
                'description' => 'Seragam hitam Gojo dengan blindfold dan rambut putih khas penyihir Jujutsu High.',
                'accessories' => ['Blindfold hitam', 'Wig putih', 'Jubah seragam'],
                'themes' => ['anime', 'jujutsu', 'sorcerer', 'white hair', 'blindfold']
            ],
            [
                'name' => 'Hatsune Miku',
                'series' => 'Vocaloid',
                'origin' => 'Piapro',
                'category' => 'Anime',
                'size' => ['S', 'M'],
                'price' => 135000,
                'deposit' => 67500,
                'stock' => 3,
                'rating' => 4.9,
                'reviews' => 22,
                'tag' => 'Idol virtual',
                'image' => 'https://images.unsplash.com/photo-1722608577993-b8db8a9ce5cf?auto=format&fit=crop&w=900&q=85',
                'description' => 'Cosplay idol virtual dengan wig twin-tail biru toska, dasi dan aksen futuristik.',
                'accessories' => ['Wig twin-tail toska', 'Headset Miku', 'Dasi dan arm warmer'],
                'themes' => ['vocaloid', 'idol', 'blue hair', 'music', 'virtual']
            ],
            [
                'name' => 'Anya Forger',
                'series' => 'Spy x Family',
                'origin' => 'Eden Academy',
                'category' => 'Anime',
                'size' => ['XS', 'S'],
                'price' => 100000,
                'deposit' => 50000,
                'stock' => 2,
                'rating' => 4.8,
                'reviews' => 17,
                'tag' => 'Baru',
                'image' => 'https://upload.wikimedia.org/wikipedia/commons/thumb/0/08/Anya_forger_cosplay_at_Nippon_Haku_002.jpg/720px-Anya_forger_cosplay_at_Nippon_Haku_002.jpg',
                'description' => 'Seragam Eden Academy dengan wig merah muda, aksesori tanduk hitam, dan tas sekolah.',
                'accessories' => ['Wig merah muda', 'Aksesori tanduk', 'Tas sekolah Eden'],
                'themes' => ['spy x family', 'anya', 'school', 'pink hair', 'eden']
            ],
            [
                'name' => 'Alhaitham',
                'series' => 'Genshin Impact',
                'origin' => 'Sumeru',
                'category' => 'Game',
                'size' => ['M', 'L', 'XL'],
                'price' => 160000,
                'deposit' => 80000,
                'stock' => 1,
                'rating' => 4.8,
                'reviews' => 14,
                'tag' => 'Premium',
                'image' => 'https://upload.wikimedia.org/wikipedia/commons/thumb/3/30/Cosplay_Alhaitham_in_Hoyoland_2025_1.jpg/900px-Cosplay_Alhaitham_in_Hoyoland_2025_1.jpg',
                'description' => 'Cosplay cendekiawan Sumeru dengan wig hijau, mantel putih-hijau, dan aksesori Akademiya.',
                'accessories' => ['Wig hijau', 'Mantel Akademiya', 'Aksesori bahu'],
                'themes' => ['game', 'genshin', 'sumeru', 'green hair', 'scholar']
            ],
            [
                'name' => 'Sailor Moon',
                'series' => 'Sailor Moon',
                'origin' => 'Tokyo',
                'category' => 'Anime',
                'size' => ['S', 'M', 'L'],
                'price' => 280000,
                'deposit' => 200000,
                'stock' => 10,
                'rating' => 5.0,
                'reviews' => 12,
                'tag' => 'Baru',
                'image' => 'https://upload.wikimedia.org/wikipedia/commons/thumb/1/1d/Cosplay_of_Sailor_Moon_20121006.jpg/800px-Cosplay_of_Sailor_Moon_20121006.jpg',
                'description' => 'Cosplay Sailor Moon klasik lengkap dengan seragam pelaut, pita merah, dan sarung tangan.',
                'accessories' => ['Wig pirang twin-tail', 'Tiara emas', 'Bros transformasi'],
                'themes' => ['anime', 'sailor moon', 'magical girl', 'blonde']
            ]
        ];

        foreach ($costumes as $costume) {
            Costume::create($costume);
        }
    }
}