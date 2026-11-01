<?php

namespace App\Http\Controllers;

use App\Models\Event;
use Illuminate\Http\Request;

class EventController extends Controller {
    
    // Menampilkan halaman utama platform Let'sCosplay
    public function index() {
        // Ambil semua data event dari database, diurutkan dari yang terbaru
        $events = Event::latest()->get(); 

        // Kirim variabel $events ke view 'lets_cosplay'
        return view('marketplace', compact('events'));
    }

    // Menyimpan data event baru dari portal upload organizer (via QR Code)
    public function store(Request $request) {
        $validated = $request->validate([
            'title' => 'required|string|max:255',
            'date' => 'required|string',
            'location' => 'required|string',
            'category' => 'required|string',
            'description' => 'nullable|string',
        ]);

        // Simulasi AI otomatis membuat media placeholder & signature
        $validated['media_url'] = 'https://placehold.co/600x400/281824/ff4799?text=' . urlencode($validated['title']);
        $validated['signature'] = "Verified Official Event • Let'sCosplay Hub";
        $validated['recommended_costumes'] = ['c1', 'c3', 'c4'];

        Event::create($validated);

        return response()->json([
            'success' => true,
            'message' => 'Event berhasil diproses AI & dipublikasikan!'
        ]);
    }

    // Menghapus event oleh Admin Rental
    public function destroy($id) {
        $event = Event::findOrFail($id);
        $event->delete();

        return response()->json([
            'success' => true,
            'message' => 'Event berhasil dihapus.'
        ]);
    }
}