/**
 * Public sign-in page (Phase 9 — commercial identity).
 *
 * Single identifier field: an email address OR a phone number — customers
 * never choose between separate login screens. Reuses the existing Phase 3
 * auth client (`login()` → POST /auth/login → storeAuthTokens), so token
 * storage and refresh behavior are unchanged. On success the user returns to
 * the intended protected route (sessionStorage "next"), otherwise '/'.
 *
 * Intentionally simple and welcoming — this is not the cinematic landing
 * page (later phase); it is the trust-building front door to the workspace.
 */
import { useState, type FormEvent } from 'react';
import { LogIn } from 'lucide-react';
import { login, authErrorText } from '@shared/api/auth';
import { navigate, takeNextPath, isLoginPath } from '@shared/router';
import { AuthPage, FieldError, FormLabel, inputClass, primaryButtonClass, linkClass } from './auth/AuthPage';

export function Login() {
  const [identifier, setIdentifier] = useState('');
  const [password, setPassword] = useState('');
  const [showPassword, setShowPassword] = useState(false);
  const [busy, setBusy] = useState(false);
  const [error, setError] = useState<string | null>(null);

  const submit = async (e: FormEvent) => {
    e.preventDefault();
    if (busy) return; // guard against duplicate submissions
    setBusy(true);
    setError(null);
    try {
      await login(identifier.trim(), password);
      const next = takeNextPath();
      navigate(next && !isLoginPath(next) ? next : '/', { replace: true });
    } catch (err) {
      setError(authErrorText(err));
    } finally {
      setBusy(false);
    }
  };

  return (
    <AuthPage
      title="Welcome to StitchFlow"
      subtitle="Sign in to continue to your workspace."
      footer={
        <>
          Don&apos;t have an account?{' '}
          <button type="button" className={linkClass} onClick={() => navigate('/register')}>
            Create account
          </button>
        </>
      }
    >
      <form onSubmit={submit} noValidate>
        {error && <FieldError id="login-error" message={error} />}

        <div className="mb-4">
          <FormLabel htmlFor="identifier">Email or phone number</FormLabel>
          <input
            id="identifier"
            name="identifier"
            type="text"
            inputMode="email"
            autoComplete="username"
            autoFocus
            required
            aria-invalid={error ? true : undefined}
            aria-describedby={error ? 'login-error' : undefined}
            placeholder="customer@example.com or 0241234567"
            className={inputClass}
            value={identifier}
            onChange={(e) => setIdentifier(e.target.value)}
          />
        </div>

        <div className="mb-5">
          <div className="flex items-baseline justify-between">
            <FormLabel htmlFor="password">Password</FormLabel>
            <button
              type="button"
              className="mb-1.5 text-xs text-slate-500 underline-offset-2 hover:underline focus:outline-none focus:ring-2 focus:ring-sky-300 rounded"
              onClick={() => navigate('/forgot-password')}
            >
              Forgot password?
            </button>
          </div>
          <div className="relative">
            <input
              id="password"
              name="password"
              type={showPassword ? 'text' : 'password'}
              autoComplete="current-password"
              required
              minLength={8}
              aria-invalid={error ? true : undefined}
              className={`${inputClass} pr-16`}
              value={password}
              onChange={(e) => setPassword(e.target.value)}
            />
            <button
              type="button"
              onClick={() => setShowPassword((v) => !v)}
              aria-pressed={showPassword}
              aria-label={showPassword ? 'Hide password' : 'Show password'}
              className="absolute inset-y-0 right-0 rounded-r-xl px-3 text-xs font-medium text-slate-500 hover:text-slate-700 focus:outline-none focus:ring-2 focus:ring-inset focus:ring-sky-300"
            >
              {showPassword ? 'Hide' : 'Show'}
            </button>
          </div>
        </div>

        <button type="submit" className={primaryButtonClass} disabled={busy || !identifier.trim() || !password}>
          {busy ? (
            <>
              <span aria-hidden="true" className="h-4 w-4 animate-spin rounded-full border-2 border-white/40 border-t-white" />
              Signing in…
            </>
          ) : (
            <>
              <LogIn className="h-4 w-4" aria-hidden="true" />
              Sign in
            </>
          )}
        </button>
      </form>
    </AuthPage>
  );
}
