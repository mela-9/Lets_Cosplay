<?php

namespace App\Http\Controllers\Api;

use App\Http\Controllers\Controller;
use App\Models\Costume;
use Illuminate\Http\Request;

class CostumeController extends Controller
{
    private const PLACEHOLDER = 'https://placehold.co/600x800/281824/ff4799?text=Kostum';

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

    public function destroy(Costume $costume)
    {
        // Pesanan lama tetap aman: nama & foto kostum disimpan sebagai snapshot di tabel orders.
        $costume->delete();

        return response()->json(['message' => 'Kostum berhasil dihapus.']);
    }

    private function payload(Request $request, ?Costume $existing = null): array
    {
        $data = $request->validate([
            'name' => 'required|string|max:150',
            'series' => 'required|string|max:150',
            'category' => 'required|in:Anime,Game,Film & Serial,Komik,Fantasy,Aksesori',
            'price' => 'required|numeric|min:1000',
            'deposit' => 'required|numeric|min:0',
            'stock' => 'required|integer|min:0',
            'size' => 'required',
            'image' => ['nullable', 'string', 'max:3500000', 'regex:/^(https?:\/\/|data:image\/(jpeg|png|webp);base64,)/'],
            'description' => 'nullable|string|max:2000',
            'origin' => 'nullable|string|max:120',
            'tag' => 'nullable|string|max:40',
            'accessories' => 'nullable',
        ], [
            'image.regex' => 'Foto harus berupa unggahan gambar atau URL https://.',
            'image.max' => 'Ukuran foto terlalu besar.',
        ]);

        $data['size'] = $this->toList($data['size'], true);
        if (!$data['size']) {
            abort(response()->json(['message' => 'Isi minimal satu ukuran (contoh: S, M, L).'], 422));
        }

        if (array_key_exists('accessories', $data)) {
            $data['accessories'] = $this->toList($data['accessories']);
        }

        $data['image'] = trim((string) ($data['image'] ?? '')) ?: ($existing?->image ?: self::PLACEHOLDER);
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
