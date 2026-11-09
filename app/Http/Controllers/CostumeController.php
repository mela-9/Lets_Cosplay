<?php

namespace App\Http\Controllers;

use App\Models\Costume;
use Illuminate\Http\Request;

class CostumeController extends Controller
{
    // Mengambil semua katalog kostum
    public function index()
    {
        return response()->json(Costume::latest()->get());
    }

    // Menyimpan kostum baru dari admin
    public function store(Request $request)
    {
        $validated = $request->validate([
            'name' => 'required|string',
            'series' => 'required|string',
            'category' => 'required|string',
            'price' => 'required|numeric',
            'deposit' => 'required|numeric',
            'stock' => 'required|integer',
            'size' => 'required',
            'image' => 'nullable|string',
            'description' => 'nullable|string',
        ]);

        if (is_string($request->size)) {
            $validated['size'] = array_map('trim', explode(',', $request->size));
        }

        $validated['themes'] = array_filter(explode(' ', strtolower($request->name . ' ' . $request->series)));

        $costume = Costume::create($validated);

        return response()->json([
            'message' => 'Kostum berhasil ditambahkan!',
            'data' => $costume
        ], 201);
    }
}