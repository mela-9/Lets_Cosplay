<?php

namespace App\Http\Controllers\Api;

use App\Http\Controllers\Controller;
use App\Models\User;
use Illuminate\Http\Request;
use Illuminate\Support\Facades\Hash;

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
        $isCustomer = $request->input('role', 'customer') === 'customer';

        $rules = [
            'name' => 'required|string|min:3|max:120',
            'email' => 'required|email|unique:users,email',
            'password' => 'required|min:8',
            'role' => 'required|in:customer,admin',
        ];

        // Penyewa wajib mengisi seluruh data diri saat mendaftar.
        if ($isCustomer) {
            $rules += [
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
        }

        $data = $request->validate($rules, [
            'phone.regex' => 'Nomor telepon tidak valid (9–15 digit).',
            'guarantor.regex' => 'Nomor penjamin tidak valid (9–15 digit).',
            'idSelfie.regex' => 'Foto identitas harus berupa gambar JPG/PNG/WebP.',
            'idSelfie.max' => 'Ukuran foto identitas terlalu besar.',
            'email.unique' => 'Email sudah terdaftar.',
        ]);

        if ($data['role'] === 'admin' && User::where('role', 'admin')->exists()) {
            return response()->json(['message' => 'Akun Admin Rental sudah terdaftar.'], 422);
        }

        $user = User::create([
            'name' => $data['name'],
            'email' => strtolower($data['email']),
            'password' => $data['password'],
            'role' => $data['role'],
            'phone' => $data['phone'] ?? null,
            'address' => $data['address'] ?? null,
            'social_platform' => $data['socialPlatform'] ?? null,
            'social_handle' => $data['socialHandle'] ?? null,
            'guarantor_phone' => $data['guarantor'] ?? null,
            'id_selfie' => $data['idSelfie'] ?? null,
            'id_selfie_name' => $data['idSelfieName'] ?? null,
            'previous_rental' => $data['previousRental'] ?? null,
            'previous_store' => ($data['previousRental'] ?? null) === 'yes' ? ($data['previousStore'] ?? null) : null,
        ]);

        return $this->authenticated($user);
    }

    public function me(Request $request)
    {
        return response()->json(['status' => 'success', 'user' => $request->user()->toProfile()]);
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
