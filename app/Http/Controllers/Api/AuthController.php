<?php

namespace App\Http\Controllers\Api;

use App\Http\Controllers\Controller;
use App\Models\User;
use Illuminate\Http\Request;
use Illuminate\Support\Facades\Hash;
use Illuminate\Validation\Rule;

class AuthController extends Controller
{
    public function login(Request $request)
    {
        $request->validate([
            'email' => 'required|email',
            'password' => 'required',
        ]);

        $user = User::where('email', strtolower($request->email))->first();

        if (!$user || !Hash::check($request->password, $user->password)) {
            return response()->json(['message' => 'Email atau kata sandi tidak sesuai.'], 401);
        }

        return $this->authenticated($user);
    }

    public function register(Request $request)
    {
        $rules = [
            'name' => 'required|string|min:3|max:120',
            'email' => 'required|email|unique:users,email',
            'password' => 'required|min:8',
            'phone' => ['required', 'regex:/^\+?[0-9]{9,15}$/'],
            'address' => 'required|string|min:10|max:500',
            'socialPlatform' => 'required|in:Instagram,TikTok,X,Lainnya',
            'socialHandle' => 'required|string|max:60',
            'guarantor' => ['required', 'regex:/^\+?[0-9]{9,15}$/'],
            'idSelfie' => ['required', 'string', 'max:3500000', 'regex:/^data:image\/(jpeg|png|webp);base64,/'],
            'idSelfieName' => 'nullable|string|max:150',
            'previousRental' => 'required|in:yes,no',
            'previousStore' => 'required_if:previousRental,yes|nullable|string|max:120',
        ];

        $data = $request->validate($rules, [
            'phone.regex' => 'Nomor telepon tidak valid (9–15 digit).',
            'guarantor.regex' => 'Nomor penjamin tidak valid (9–15 digit).',
            'idSelfie.regex' => 'Foto identitas harus berupa gambar JPG/PNG/WebP.',
            'idSelfie.max' => 'Ukuran foto identitas terlalu besar.',
            'email.unique' => 'Email sudah terdaftar.',
        ]);

        $user = User::create([
            'name' => $data['name'],
            'email' => strtolower($data['email']),
            'password' => $data['password'],
            'role' => 'customer',
            'phone' => $data['phone'],
            'address' => $data['address'],
            'social_platform' => $data['socialPlatform'],
            'social_handle' => $data['socialHandle'],
            'guarantor_phone' => $data['guarantor'],
            'id_selfie' => $data['idSelfie'],
            'id_selfie_name' => $data['idSelfieName'] ?? null,
            'previous_rental' => $data['previousRental'],
            'previous_store' => $data['previousRental'] === 'yes' ? ($data['previousStore'] ?? null) : null,
            'id_status' => empty($data['idSelfie']) ? 'none' : 'pending',
        ]);

        return $this->authenticated($user);
    }

    public function me(Request $request)
    {
        return response()->json(['status' => 'success', 'user' => $request->user()->toProfile()]);
    }

    /** Penyewa mengubah data dirinya; admin hanya nama & email. Riwayat sewa tidak bisa diubah sendiri. */
    public function updateProfile(Request $request)
    {
        $user = $request->user();
        $rules = [
            'name' => 'required|string|min:3|max:120',
            'email' => ['required', 'email', Rule::unique('users', 'email')->ignore($user->id)],
        ];

        if ($user->role === 'customer') {
            $rules += [
                'phone' => ['required', 'regex:/^\+?[0-9]{9,15}$/'],
                'address' => 'required|string|min:10|max:500',
                'socialPlatform' => 'required|in:Instagram,TikTok,X,Lainnya',
                'socialHandle' => 'required|string|max:60',
                'guarantor' => ['required', 'regex:/^\+?[0-9]{9,15}$/'],
                'idSelfie' => ['nullable', 'string', 'max:3500000', 'regex:/^data:image\/(jpeg|png|webp);base64,/'],
                'idSelfieName' => 'nullable|string|max:150',
            ];
        }

        $data = $request->validate($rules, [
            'phone.regex' => 'Nomor telepon tidak valid (9–15 digit).',
            'guarantor.regex' => 'Nomor penjamin tidak valid (9–15 digit).',
            'idSelfie.regex' => 'Foto identitas harus berupa gambar JPG/PNG/WebP.',
            'email.unique' => 'Email sudah dipakai akun lain.',
        ]);

        $user->name = $data['name'];
        $user->email = strtolower($data['email']);

        if ($user->role === 'customer') {
            $user->phone = $data['phone'];
            $user->address = $data['address'];
            $user->social_platform = $data['socialPlatform'];
            $user->social_handle = $data['socialHandle'];
            $user->guarantor_phone = $data['guarantor'];
            if (!empty($data['idSelfie'])) {
                $user->id_selfie = $data['idSelfie'];
                $user->id_selfie_name = $data['idSelfieName'] ?? null;
                $user->resetIdVerification(); // foto baru → verifikasi admin diulang
            }
        }

        $user->save();

        // Pesanan lama menyimpan salinan datanya sendiri, jadi perubahan profil tidak mengubah riwayat pesanan.
        return response()->json(['status' => 'success', 'user' => $user->fresh()->toProfile()]);
    }

    /** Penyewa menyetujui Aturan Rental (dicek lagi saat checkout). */
    public function acceptRules(Request $request)
    {
        $user = $request->user();
        if (!$user->rules_accepted_at) {
            $user->forceFill(['rules_accepted_at' => now()])->save();
        }

        return response()->json(['status' => 'success', 'user' => $user->fresh()->toProfile()]);
    }

    public function updatePassword(Request $request)
    {
        $data = $request->validate([
            'currentPassword' => 'required|string',
            'newPassword' => 'required|string|min:8|max:100|different:currentPassword',
            'newPasswordConfirmation' => 'required|same:newPassword',
        ], [
            'newPassword.min' => 'Kata sandi baru minimal 8 karakter.',
            'newPassword.different' => 'Kata sandi baru harus berbeda dari yang lama.',
            'newPasswordConfirmation.same' => 'Konfirmasi kata sandi baru tidak sama.',
        ]);

        $user = $request->user();
        if (!Hash::check($data['currentPassword'], $user->password)) {
            return response()->json(['message' => 'Kata sandi saat ini tidak sesuai.'], 422);
        }

        $user->password = $data['newPassword'];
        $user->save();

        // Token baru diterbitkan: perangkat lain otomatis keluar, perangkat ini tetap masuk.
        return response()->json(['status' => 'success', 'token' => $user->issueToken()]);
    }

    public function logout(Request $request)
    {
        $request->user()->revokeToken();

        return response()->json(['status' => 'success']);
    }

    private function authenticated(User $user)
    {
        return response()->json([
            'status' => 'success',
            'token' => $user->issueToken(),
            'user' => $user->toProfile(),
        ]);
    }
}
