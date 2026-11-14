<?php

namespace App\Http\Middleware;

use App\Models\User;
use Closure;
use Illuminate\Http\Request;
use Symfony\Component\HttpFoundation\Response;

/**
 * Autentikasi token Bearer sederhana.
 *   token           → wajib login (401 jika tidak valid)
 *   token:optional  → boleh anonim, tapi jika token valid user tetap dikenali
 */
class ApiToken
{
    public function handle(Request $request, Closure $next, string $mode = 'required'): Response
    {
        $plain = $request->bearerToken();
        $user = $plain ? User::where('api_token', hash('sha256', $plain))->first() : null;

        if (!$user && $mode !== 'optional') {
            return response()->json(['message' => 'Sesi berakhir. Silakan masuk kembali.'], 401);
        }

        if ($user) {
            $request->setUserResolver(fn () => $user);
        }

        return $next($request);
    }
}
