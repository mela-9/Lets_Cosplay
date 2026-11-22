<?php

namespace App\Http\Controllers\Api;

use App\Http\Controllers\Controller;
use App\Models\User;
use Illuminate\Http\Request;

/** Admin: antrean verifikasi KTP / selfie identitas penyewa. */
class IdentityController extends Controller
{
    public function index()
    {
        $users = User::where('role', 'customer')
            ->whereNotNull('id_selfie')->where('id_selfie', '!=', '')
            ->orderByRaw("CASE id_status WHEN 'pending' THEN 0 WHEN 'rejected' THEN 1 ELSE 2 END")
            ->latest('updated_at')
            ->get(['id', 'name', 'email', 'phone', 'social_platform', 'social_handle', 'guarantor_phone', 'id_selfie_name', 'id_status', 'id_reviewed_at', 'id_reject_reason', 'updated_at']);

        return response()->json($users->map(fn (User $u) => $this->row($u))->values());
    }

    /** Foto dimuat terpisah agar daftar tetap ringan. */
    public function show(User $user)
    {
        abort_unless($user->role === 'customer', 404);

        return response()->json($this->row($user) + ['idSelfieImage' => $user->makeVisible('id_selfie')->id_selfie]);
    }

    public function review(Request $request, User $user)
    {
        abort_unless($user->role === 'customer' && !empty($user->id_selfie), 404);

        $data = $request->validate([
            'status' => 'required|in:verified,rejected,pending',
            'reason' => 'nullable|string|max:200|required_if:status,rejected',
        ], ['reason.required_if' => 'Isi alasan penolakan agar penyewa tahu apa yang harus diperbaiki.']);

        $user->forceFill([
            'id_status' => $data['status'],
            'id_reviewed_at' => $data['status'] === 'pending' ? null : now(),
            'id_reject_reason' => $data['status'] === 'rejected' ? trim($data['reason']) : null,
        ])->save();

        return response()->json(['status' => 'success', 'identity' => $this->row($user)]);
    }

    private function row(User $u): array
    {
        return [
            'userId' => $u->id,
            'name' => $u->name,
            'email' => $u->email,
            'phone' => $u->phone,
            'socialPlatform' => $u->social_platform,
            'socialHandle' => $u->social_handle,
            'guarantor' => $u->guarantor_phone,
            'fileName' => $u->id_selfie_name,
            'status' => $u->id_status ?: 'pending',
            'reviewedAt' => optional($u->id_reviewed_at)->translatedFormat('j F Y, H:i'),
            'rejectReason' => $u->id_reject_reason,
            'uploadedAt' => optional($u->updated_at)->translatedFormat('j F Y, H:i'),
        ];
    }
}
