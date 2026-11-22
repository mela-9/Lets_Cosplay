<?php

namespace App\Http\Controllers\Api;

use App\Http\Controllers\Controller;
use App\Models\Costume;
use Illuminate\Http\Request;

class CostumeController extends Controller
{
    private const PLACEHOLDER = 'https://placehold.co/600x800/281824/ff4799?text=Kostum';
    private const MAX_IMAGES = 5;

    public function index()
    {
        return response()->json(Costume::latest('id')->get());
    }

    public function store(Request $request)
    {
        $costume = Costume::create($this->payload($request));

        return response()->json(['message' => 'Kostum berhasil ditambahkan!', 'data' => $costume], 201);
    }

    public function update(Request $request, Costume $costume)
    {
        $costume->update($this->payload($request, $costume));

        return response()->json(['message' => 'Kostum berhasil diperbarui!', 'data' => $costume->fresh()]);
    }

    /** Tambah/kurangi stok satu ukuran dengan cepat (tanpa membuka form edit). */
    public function adjustStock(Request $request, Costume $costume)
    {
        $data = $request->validate([
            'size' => 'required|string|max:10',
            'delta' => 'required|integer|min:-100|max:100|not_in:0',
        ]);
        $size = mb_strtoupper(trim($data['size']));

        if (!array_key_exists($size, $costume->size_stock ?? [])) {
            return response()->json(['message' => "Ukuran {$size} belum ada di kostum ini. Tambahkan lewat Edit."], 422);
        }
        if ($costume->stockFor($size) + $data['delta'] < 0) {
            return response()->json(['message' => "Stok ukuran {$size} tidak bisa kurang dari 0."], 422);
        }

        $costume->adjustStock($size, $data['delta']);
        $costume->save();

        return response()->json(['message' => "Stok {$size} diperbarui.", 'data' => $costume->fresh()]);
    }

    public function destroy(Costume $costume)
    {
        // Pesanan lama tetap aman: nama & foto kostum disimpan sebagai snapshot di tabel orders.
        $costume->delete();

        return response()->json(['message' => 'Kostum berhasil dihapus.']);
    }

    private function payload(Request $request, ?Costume $existing = null): array
    {
        $imageRule = ['string', 'max:3500000', 'regex:/^(https?:\/\/|data:image\/(jpeg|png|webp);base64,)/'];
        $data = $request->validate([
            'name' => 'required|string|max:150',
            'series' => 'required|string|max:150',
            'category' => 'required|in:Anime,Game,Film & Serial,Komik,Fantasy,Aksesori',
            'price' => 'required|numeric|min:1000',
            'deposit' => 'required|numeric|min:0',
            // Stok per ukuran: {"S":2,"M":3}. Ukuran yang tidak dicantumkan = tidak tersedia.
            'sizeStock' => 'nullable|array',
            'sizeStock.*' => 'integer|min:0|max:9999',
            // Cara lama (daftar ukuran + 1 angka stok) tetap diterima.
            'stock' => 'nullable|integer|min:0',
            'size' => 'nullable',
            'image' => ['nullable', ...$imageRule],
            'images' => 'nullable|array|max:'.self::MAX_IMAGES,
            'images.*' => $imageRule,
            'description' => 'nullable|string|max:2000',
            'origin' => 'nullable|string|max:120',
            'tag' => 'nullable|string|max:40',
            'accessories' => 'nullable',
        ], [
            'image.regex' => 'Foto harus berupa unggahan gambar atau URL https://.',
            'images.*.regex' => 'Foto harus berupa unggahan gambar atau URL https://.',
            'images.max' => 'Maksimal '.self::MAX_IMAGES.' foto per kostum.',
            'images.*.max' => 'Ukuran salah satu foto terlalu besar.',
            'image.max' => 'Ukuran foto terlalu besar.',
        ]);

        $sizeStock = [];
        if (!empty($data['sizeStock'])) {
            foreach ($data['sizeStock'] as $size => $qty) {
                $size = mb_strtoupper(trim((string) $size));
                if ($size !== '') {
                    $sizeStock[$size] = (int) $qty;
                }
            }
        } elseif (!empty($data['size'])) {
            $sizes = $this->toList($data['size'], true);
            $sizeStock = $sizes ? Costume::distribute($sizes, (int) ($data['stock'] ?? 0)) : [];
        }
        if (!$sizeStock) {
            abort(response()->json(['message' => 'Isi stok minimal untuk satu ukuran (contoh: S, M, L).'], 422));
        }
        $data['size_stock'] = $sizeStock;
        $data['size'] = array_keys($sizeStock);
        $data['stock'] = array_sum($sizeStock);
        unset($data['sizeStock']);

        if (array_key_exists('accessories', $data)) {
            $data['accessories'] = $this->toList($data['accessories']);
        }

        // Galeri: foto pertama = sampul. Tanpa foto baru, foto lama dipertahankan.
        $images = array_values(array_unique(array_filter(array_map('trim', $data['images'] ?? []))));
        if (!$images && !empty($data['image'])) {
            $images = [trim($data['image'])];
        }
        if (!$images) {
            $images = $existing?->images ?: array_filter([$existing?->image]) ?: [self::PLACEHOLDER];
        }
        $data['images'] = array_values($images);
        $data['image'] = $data['images'][0];
        $data['themes'] = Costume::buildThemes($data['name'], $data['series'], $data['category'], (string) ($data['description'] ?? ''));

        return $data;
    }

    private function toList(mixed $value, bool $upper = false): array
    {
        $items = is_array($value) ? $value : explode(',', (string) $value);
        $items = array_map(fn ($v) => trim((string) $v), $items);
        if ($upper) {
            $items = array_map('mb_strtoupper', $items);
        }

        return array_values(array_unique(array_filter($items, fn ($v) => $v !== '')));
    }
}
