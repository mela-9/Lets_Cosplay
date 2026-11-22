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

## Chatbot asisten (natural & dinamis)
Widget "Tanya AI" di pojok kanan bawah memakai Gemini lewat `POST /api/chat`.
- **Balasan terstruktur**: satu panggilan Gemini mengembalikan `reply`, `suggestions` (chip pertanyaan lanjutan yang relevan dengan obrolan), dan `costume_ids` (kartu kostum yang bisa diklik). Jika JSON rusak/terpotong, backend tetap mengambil teksnya, dan jika kosong frontend memakai jawaban lokal.
- **Sadar konteks halaman**: frontend mengirim halaman yang sedang dibuka (`context.page`, `productId`, `eventId`), jadi "kostum ini" / "event ini" dipahami. Prompt juga memuat jam WIB dan status jam layanan admin.
- **Persona & memori obrolan**: prompt di `app/Services/ChatContext.php` meminta gaya yang mengikuti pengguna, tidak mengulang pembuka, mengingat ukuran/kostum/hari yang sudah disebut, dan menghitung biaya sewa dengan rumus yang ada di aturan.
- **Riwayat tersimpan** di `sessionStorage` (hilang saat tab ditutup, tombol refresh, atau logout). Balasan muncul bertahap seperti diketik.
- **Jawaban cadangan lokal** (`answerChatQuestion` di `resources/js/lets-cosplay.js`) dipakai saat Gemini tidak dapat dijangkau: paham singkatan/typo ("sewa 3hr brp", "budget 100k"), ukuran, anggaran, aturan per topik, status pesanan, dan mengingat kostum terakhir yang dibahas.
Setelah mengubah `resources/js` atau `resources/css`, jalankan `npm run build` (atau `npm run dev`).

## QR iklan event
QR di dashboard admin mengarah ke formulir organizer untuk paket Gratis atau Prabayar. Untuk pemindaian dari HP, alamat di Generator QR harus dapat dijangkau HP:
- Pakai domain publik dengan HTTPS, atau IP lokal komputer (contoh `http://192.168.1.5:8000`) saat HP dan komputer berada di Wi-Fi yang sama.
- Untuk akses IP lokal, jalankan server dengan `php artisan serve --host=0.0.0.0` dan izinkan koneksi melalui firewall.
- Jangan gunakan `localhost`, `127.0.0.1`, atau `0.0.0.0` pada QR yang akan dipindai dari perangkat lain. Alamat tersebut hanya untuk komputer/server itu sendiri.

Setelah mengganti alamat, pindai QR dengan kamera HP. QR gratis membuka formulir paket Gratis; QR prabayar membuka formulir Prabayar dan meminta bukti pembayaran.

## Iklan event Gratis & Prabayar
- QR umum tetap aktif; setiap kali formulir dibuka, server menerbitkan token pengajuan unik. Token yang sudah dipakai tidak bisa mengirim pengajuan lain, dan token Gratis ditandai selesai saat admin menyetujui event.
- Form Gratis meminta poster dan detail event, menampilkan pratinjau, lalu mengirim pengajuan ke antrean admin.
- Form Prabayar dimulai hanya dengan unggah poster dan PDF rincian event. AI mengambil fakta, merangkum informasi tambahan dari PDF yang tidak ada di poster, dan menyusun copywriting singkat orisinal. Chatbot mengonfirmasi data satu per satu dan mengumpulkan koreksi sebelum menampilkan pratinjau poster penuh dan membuka pembayaran. Iklan yang tayang menampilkan informasi event penting, bukan salinan panjang dari PDF.
- Tidak ada lagi tulisan berjalan. Detail kostum yang cocok dengan event Prabayar yang sedang tayang menampilkan tautan kecil untuk bergabung/melihat event tersebut.
- Durasi dan harga: 15 hari Rp45.000; 1 bulan Rp85.000; 45 hari Rp125.000; 2 bulan Rp175.000; 75 hari Rp225.000; 3 bulan Rp325.000.
- Admin harus memverifikasi sebelum iklan tayang. Penolakan mengatur refund 97% (potongan 3%); jika tidak ada respons dalam 72 jam dari pengiriman bukti, status diatur untuk refund penuh. Karena transfer/refund manual, admin tetap perlu mengirim refund dan menandainya selesai di dashboard.
- Saldo dompet admin hanya simulasi: bukti pembayaran belum dianggap masuk saat menunggu review; persetujuan menandai dana diterima, sedangkan penolakan atau batas 72 jam menandai dana tidak dikreditkan dan refund manual diperlukan.
- Rekening pembayaran admin masih placeholder. Jangan gunakan form ini untuk pembayaran sungguhan sebelum instruksi rekening resmi dikonfigurasi.
- Ekstraksi PDF/poster, copywriting/tema visual, dan konsultan event memakai Gemini. Atur `GEMINI_API_KEY` di `.env` lokal atau environment hosting; jangan masukkan kunci ke source code atau chat. AI wajib aktif untuk membuat dan mengajukan iklan Prabayar; paket Gratis tetap memakai form manual dan pratinjau sesuai isian.
- Dokumen yang dianalisis AI dikirim ke Gemini API. Fitur audio tidak tersedia.

Saat menjalankan server lokal, jalankan scheduler Laravel di terminal kedua agar refund yang melewati 72 jam ditandai tepat waktu:
```bash
php artisan schedule:work
```
Perintah `composer run dev` menjalankan server, Vite, dan scheduler bersama. Pada hosting, pasang cron Laravel `schedule:run` setiap menit.

## Fitur revisi (stok per ukuran, pesanan kelompok, ulasan, verifikasi KTP)
Setelah menarik update ini jalankan: `php artisan migrate` lalu `npm run build`. (Data lama aman: stok total dibagi ke ukuran yang ada, pesanan lama dianggap 1 unit.)
- **Aturan rental**: centang kini tersimpan (di akun penyewa; `POST /api/rules/accept`). Tombol "Lanjut ke pemesanan" mengarahkan ke Aturan dulu bila belum disetujui; server menolak pesanan tanpa persetujuan.
- **Stok per ukuran & banyak ukuran per pesanan**: halaman detail menampilkan sisa stok tiap ukuran dengan pengatur jumlah; harga, deposit, dan stok dihitung per unit di server. Admin: kolom stok per ukuran di Kelola Katalog, tombol **Stok** (tambah/kurang cepat), dan grid stok di form kostum.
- **Pesanan kelompok**: di checkout centang "Pesanan kelompok / tim", isi nama kelompok (+ daftar anggota opsional). Minimal 2 kostum.
- **Ulasan**: penyewa memberi bintang + komentar setelah pesanan selesai (Pesanan Saya / Lacak). Ulasan tampil publik di detail kostum; admin (penjual) membalas lewat menu **Ulasan Pembeli**. Rating kostum dihitung dari ulasan nyata (angka ulasan contoh lama di-reset ke 0).
- **Verifikasi KTP**: menu admin **Verifikasi KTP** (setujui / tolak + alasan). Pesanan baru tidak bisa diproses admin sebelum KTP penyewa terverifikasi; penyewa melihat statusnya di Pengaturan akun. Mengganti foto memulai verifikasi ulang.
- **Foto kostum**: galeri sampai 5 foto per kostum (unggah banyak / URL, pilih sampul); foto yang gagal dimuat diganti placeholder.
- **Histogram kostum terlaris** di Dashboard Admin (unit atau pendapatan, periode 7/30 hari/semua) lengkap dengan stok.
