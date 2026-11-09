<?php

namespace App\Http\Controllers\Api;

use App\Http\Controllers\Controller;
use App\Models\Order;
use App\Models\User;
use Illuminate\Http\Request;

class OrderController extends Controller
{
    public function index(Request $request)
    {
        // Ambil semua order atau filter berdasarkan email user
        $email = $request->query('email');
        $query = Order::query();

        if ($email) {
            $query->where('customer_email', $email);
        }

        return response()->json($query->latest()->get());
    }

    public function store(Request $request)
    {
        $user = User::where('email', $request->customerEmail)->first();

        $order = Order::create([
            'order_code'      => 'LC-' . substr(time(), -8),
            'user_id'         => $user?->id,
            'customer_name'   => $request->customerName,
            'customer_email'  => $request->customerEmail,
            'phone'           => $request->phone,
            'address'         => $request->address,
            'social_platform' => $request->socialPlatform,
            'social_handle'   => $request->socialHandle,
            'guarantor_phone' => $request->guarantor,
            'costume_id'      => $request->productId,
            'size'            => $request->size,
            'days'            => $request->days,
            'rental_date'     => $request->rentalDate ?? now()->toDateString(),
            'deposit'         => $request->deposit,
            'total'           => $request->total,
            'dp'              => $request->dp,
            'stage'           => 0,
            'bucket'          => 'Menunggu verifikasi',
            'payment_method'  => $request->paymentMethod,
        ]);

        return response()->json([
            'status' => 'success',
            'order'  => $order,
        ]);
    }
}