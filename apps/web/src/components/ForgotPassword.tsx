/**
 * Password-recovery request page (Phase 9).
 *
 * Enumeration-proof by design: the same confirmation is shown whether or not
 * the identifier matches an account. Actual delivery depends on the server's
 * email transport (documented external dependency — console transport in
 * development, SMTP integration in a later phase).
 */
import { useState, type FormEvent } from 'react';
import { KeyRound } from 'lucide-react';
import { forgotPassword, authErrorText } from '@shared/api/auth';
import { navigate } from '@shared/router';
import { AuthPage, FieldError, FormLabel, inputClass, primaryButtonClass, linkClass } from './auth/AuthPage';

export function ForgotPassword() {
  const [identifier, setIdentifier] = useState('');
  const [busy, setBusy] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [sent, setSent] = useState(false);

  const submit = async (e: FormEvent) => {
    e.preventDefault();
    if (busy) return;
    setBusy(true);
    setError(null);
    try {
      await forgotPassword(identifier.trim());
      setSent(true);
    } catch (err) {
      setError(authErrorText(err));
    } finally {
      setBusy(false);
    }
  };

  if (sent) {
    return (
      <AuthPage
        title="Check your inbox"
        subtitle="We've sent password reset instructions — if an account matches that email or phone number."
        footer={
          <button type="button" className={linkClass} onClick={() => navigate('/login')}>
            Back to sign in
          </button>
        }
      >
        <div className="rounded-2xl border border-sky-100 bg-sky-50 p-4 text-sm text-sky-900">
          The link expires in 15 minutes and can be used once. If it doesn&apos;t arrive, check your spam
          folder or try again.
        </div>
      </AuthPage>
    );
  }

  return (
    <AuthPage
      title="Reset your password"
      subtitle="Enter the email or phone number you use for StitchFlow."
      footer={
        <>
          Remembered it?{' '}
          <button type="button" className={linkClass} onClick={() => navigate('/login')}>
            Back to sign in
          </button>
        </>
      }
    >
      <form onSubmit={submit} noValidate>
        {error && <FieldError id="forgot-error" message={error} />}

        <div className="mb-5">
          <FormLabel htmlFor="forgotIdentifier">Email or phone number</FormLabel>
          <input
            id="forgotIdentifier"
            name="identifier"
            type="text"
            inputMode="email"
            autoComplete="username"
            autoFocus
            required
            aria-invalid={error ? true : undefined}
            aria-describedby={error ? 'forgot-error' : undefined}
            placeholder="customer@example.com or 0241234567"
            className={inputClass}
            value={identifier}
            onChange={(e) => setIdentifier(e.target.value)}
          />
        </div>

        <button type="submit" className={primaryButtonClass} disabled={busy || !identifier.trim()}>
          {busy ? (
            <>
              <span aria-hidden="true" className="h-4 w-4 animate-spin rounded-full border-2 border-white/40 border-t-white" />
              Sending…
            </>
          ) : (
            <>
              <KeyRound className="h-4 w-4" aria-hidden="true" />
              Send reset link
            </>
          )}
        </button>
      </form>
    </AuthPage>
  );
}
