/**
 * Password-reset completion page (Phase 9).
 *
 * Route: /reset-password?token=… — the single-use token arrives via the
 * recovery email link. The token is passed straight to the server; it is
 * never logged or stored locally. On success all previous sessions for the
 * account have been revoked server-side, so the user signs in fresh.
 */
import { useState, type FormEvent } from 'react';
import { ShieldCheck } from 'lucide-react';
import { resetPassword, authErrorText } from '@shared/api/auth';
import { navigate } from '@shared/router';
import { AuthPage, FieldError, FormLabel, inputClass, primaryButtonClass, linkClass } from './auth/AuthPage';

function tokenFromUrl(): string {
  try {
    return new URLSearchParams(window.location.search).get('token') ?? '';
  } catch {
    return '';
  }
}

export function ResetPassword() {
  const [token] = useState<string>(() => tokenFromUrl());
  const [password, setPassword] = useState('');
  const [confirm, setConfirm] = useState('');
  const [busy, setBusy] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [done, setDone] = useState(false);

  const mismatch = confirm.length > 0 && password !== confirm;
  const valid = token.length >= 32 && password.length >= 8 && password === confirm;

  const submit = async (e: FormEvent) => {
    e.preventDefault();
    if (busy || !valid) return;
    setBusy(true);
    setError(null);
    try {
      await resetPassword(token, password);
      setDone(true);
    } catch (err) {
      setError(authErrorText(err));
    } finally {
      setBusy(false);
    }
  };

  if (!token) {
    return (
      <AuthPage
        title="Reset link needed"
        subtitle="Open the password reset link from your email to choose a new password."
        footer={
          <button type="button" className={linkClass} onClick={() => navigate('/login')}>
            Back to sign in
          </button>
        }
      >
        <p className="text-sm text-slate-500">
          If you haven&apos;t requested a reset yet,{' '}
          <button type="button" className={linkClass} onClick={() => navigate('/forgot-password')}>
            request one here
          </button>
          .
        </p>
      </AuthPage>
    );
  }

  if (done) {
    return (
      <AuthPage
        title="Password updated"
        subtitle="You can now sign in with your new password. Other sessions were signed out for your security."
        footer={
          <button type="button" className={linkClass} onClick={() => navigate('/login')}>
            Continue to sign in
          </button>
        }
      >
        <div className="flex items-center gap-3 rounded-2xl border border-emerald-100 bg-emerald-50 p-4 text-sm text-emerald-900">
          <ShieldCheck className="h-5 w-5 shrink-0" aria-hidden="true" />
          Your StitchFlow password has been reset.
        </div>
      </AuthPage>
    );
  }

  return (
    <AuthPage
      title="Choose a new password"
      subtitle="Reset links expire in 15 minutes and work once."
      footer={
        <button type="button" className={linkClass} onClick={() => navigate('/login')}>
          Back to sign in
        </button>
      }
    >
      <form onSubmit={submit} noValidate>
        {error && <FieldError id="reset-error" message={error} />}

        <div className="mb-4">
          <FormLabel htmlFor="newPassword">New password</FormLabel>
          <input
            id="newPassword"
            name="password"
            type="password"
            autoComplete="new-password"
            autoFocus
            required
            minLength={8}
            aria-invalid={error ? true : undefined}
            aria-describedby={error ? 'reset-error' : undefined}
            placeholder="At least 8 characters"
            className={inputClass}
            value={password}
            onChange={(e) => setPassword(e.target.value)}
          />
        </div>

        <div className="mb-5">
          <FormLabel htmlFor="confirmPassword">Confirm new password</FormLabel>
          <input
            id="confirmPassword"
            name="confirm"
            type="password"
            autoComplete="new-password"
            required
            minLength={8}
            aria-invalid={mismatch || undefined}
            placeholder="Repeat the new password"
            className={inputClass}
            value={confirm}
            onChange={(e) => setConfirm(e.target.value)}
          />
          {mismatch && (
            <p role="alert" className="mt-1 text-xs text-red-600">
              Passwords do not match.
            </p>
          )}
        </div>

        <button type="submit" className={primaryButtonClass} disabled={busy || !valid}>
          {busy ? (
            <>
              <span aria-hidden="true" className="h-4 w-4 animate-spin rounded-full border-2 border-white/40 border-t-white" />
              Updating…
            </>
          ) : (
            <>
              <ShieldCheck className="h-4 w-4" aria-hidden="true" />
              Reset password
            </>
          )}
        </button>
      </form>
    </AuthPage>
  );
}
