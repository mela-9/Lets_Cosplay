# Let'sCosplay

Rental kostum cosplay (Laravel + Vite SPA).

## Setup
```bash
composer install && npm install
cp .env.example .env && php artisan key:generate
# isi GEMINI_API_KEY di .env
php artisan migrate --seed      # --seed membuat akun demo, katalog, dan event contoh
npm run build                   # atau: npm run dev
php artisan serve
```
Akun demo: penyewa `barbarapavin3099@gmail.com` / `12345678`, admin `adminrental123@gmail.com` / `12345678910`.

Catatan: migrasi `create_events_table` mengganti tabel `events` lama (data event lama dihapus).
Setelah update, pengguna perlu login ulang sekali (sesi kini memakai token API).
