/**
 * Public sign-in page for the authentication gate (Phase 8 fix).
 *
 * Reuses the existing Phase 3 auth client (`login()` → POST /auth/login →
 * storeAuthTokens), so token storage and refresh-token behavior are
 * unchanged. On success the user returns to the intended protected route
 * (sessionStorage "next"), otherwise '/'.
 */
import { useState, type FormEvent } from 'react';
import { LogIn } from 'lucide-react';
import { login } from '@shared/api/auth';
import { navigate, takeNextPath, isLoginPath } from '@shared/router';
import { BRAND } from '../config/brand';
import stitchflowLogo from '@shared/assets/stitchflow-logo.png';

export function Login() {
  const [email, setEmail] = useState('');
  const [password, setPassword] = useState('');
  const [busy, setBusy] = useState(false);
  const [error, setError] = useState<string | null>(null);

  const submit = async (e: FormEvent) => {
    e.preventDefault();
    setBusy(true);
    setError(null);
    try {
      await login(email.trim(), password);
      const next = takeNextPath();
      navigate(next && !isLoginPath(next) ? next : '/', { replace: true });
    } catch (err) {
      const msg = err instanceof Error ? err.message : 'Sign-in failed';
      setError(/HTTP 401/.test(msg) ? 'Invalid email or password.' : msg);
    } finally {
      setBusy(false);
    }
  };

  return (
    <div className="flex min-h-screen items-center justify-center bg-gradient-to-br from-slate-50 via-white to-sky-50 p-4">
      <div className="w-full max-w-sm rounded-3xl border border-slate-200 bg-white p-6 shadow-xl">
        <div className="mb-6 flex flex-col items-center gap-2 text-center">
          <img src={stitchflowLogo} alt={`${BRAND.productName} logo`} className="h-12 w-auto" />
          <h1 className="text-xl font-bold text-slate-900">Sign in to {BRAND.productName}</h1>
          <p className="text-xs uppercase tracking-[0.18em] text-slate-500">by {BRAND.parentName}</p>
        </div>

        {error && (
          <div role="alert" className="mb-4 rounded-xl border border-red-200 bg-red-50 p-3 text-sm text-red-700">
            {error}
          </div>
        )}

        <form onSubmit={(e) => void submit(e)} className="space-y-4">
          <label className="block text-sm font-medium text-slate-700">
            Email
            <input
              type="email"
              required
              autoComplete="email"
              value={email}
              onChange={(e) => setEmail(e.target.value)}
              placeholder="you@business.com"
              className="mt-1 w-full rounded-xl border border-slate-200 px-3 py-2 text-sm focus:border-[#0F6E8C] focus:outline-none"
            />
          </label>
          <label className="block text-sm font-medium text-slate-700">
            Password
            <input
              type="password"
              required
              autoComplete="current-password"
              value={password}
              onChange={(e) => setPassword(e.target.value)}
              placeholder="••••••••"
              className="mt-1 w-full rounded-xl border border-slate-200 px-3 py-2 text-sm focus:border-[#0F6E8C] focus:outline-none"
            />
          </label>
          <button
            type="submit"
            disabled={busy}
            className="inline-flex w-full items-center justify-center gap-2 rounded-xl bg-[#0F6E8C] py-2.5 text-sm font-semibold text-white transition hover:bg-[#0C5C74] disabled:opacity-50"
          >
            <LogIn className="h-4 w-4" /> {busy ? 'Signing in…' : 'Sign in'}
          </button>
        </form>

        <p className="mt-4 text-center text-xs text-slate-400">
          Your session is required to access the workspace, developer console and sync.
        </p>
      </div>
    </div>
  );
}
