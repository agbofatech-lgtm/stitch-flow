/**
 * Public registration page (Phase 9 — commercial identity).
 *
 * Route: /register — reachable WITHOUT a session (the gate treats the auth
 * family as public). Reuses the existing backend provisioning pipeline:
 * register() → POST /auth/register → user + license + workspace + owner
 * membership + trial subscription, and stores the returned tokens — the new
 * customer lands directly in their own workspace.
 *
 * Fields are exactly what the architecture requires: full name, email,
 * password; phone is optional (enables phone sign-in later). Phone is
 * normalized and validated server-side (E.164) — never trusted from here.
 */
import { useState, type FormEvent } from 'react';
import { UserPlus } from 'lucide-react';
import { register, authErrorText } from '@shared/api/auth';
import { navigate } from '@shared/router';
import { AuthPage, FieldError, FormLabel, inputClass, primaryButtonClass, linkClass } from './auth/AuthPage';

export function Register() {
  const [fullName, setFullName] = useState('');
  const [email, setEmail] = useState('');
  const [phone, setPhone] = useState('');
  const [password, setPassword] = useState('');
  const [busy, setBusy] = useState(false);
  const [error, setError] = useState<string | null>(null);

  const valid = fullName.trim().length >= 2 && /\S+@\S+\.\S+/.test(email.trim()) && password.length >= 8;

  const submit = async (e: FormEvent) => {
    e.preventDefault();
    if (busy || !valid) return; // guard against duplicate submissions
    setBusy(true);
    setError(null);
    try {
      await register({
        fullName: fullName.trim(),
        email: email.trim(),
        password,
        ...(phone.trim() ? { phone: phone.trim() } : {}),
      });
      navigate('/', { replace: true });
    } catch (err) {
      setError(authErrorText(err));
    } finally {
      setBusy(false);
    }
  };

  return (
    <AuthPage
      title="Welcome to StitchFlow"
      subtitle="Create your account and workspace in a minute."
      footer={
        <>
          Already have an account?{' '}
          <button type="button" className={linkClass} onClick={() => navigate('/login')}>
            Sign in
          </button>
        </>
      }
    >
      <form onSubmit={submit} noValidate>
        {error && <FieldError id="register-error" message={error} />}

        <div className="mb-4">
          <FormLabel htmlFor="fullName">Full name</FormLabel>
          <input
            id="fullName"
            name="fullName"
            type="text"
            autoComplete="name"
            autoFocus
            required
            minLength={2}
            aria-invalid={error ? true : undefined}
            aria-describedby={error ? 'register-error' : undefined}
            placeholder="Ama Mensah"
            className={inputClass}
            value={fullName}
            onChange={(e) => setFullName(e.target.value)}
          />
        </div>

        <div className="mb-4">
          <FormLabel htmlFor="regEmail">Email</FormLabel>
          <input
            id="regEmail"
            name="email"
            type="email"
            autoComplete="email"
            required
            placeholder="you@example.com"
            className={inputClass}
            value={email}
            onChange={(e) => setEmail(e.target.value)}
          />
        </div>

        <div className="mb-4">
          <FormLabel htmlFor="regPhone">
            Phone number <span className="font-normal text-slate-400">(optional)</span>
          </FormLabel>
          <input
            id="regPhone"
            name="phone"
            type="tel"
            autoComplete="tel"
            placeholder="0241234567 or +233241234567"
            className={inputClass}
            value={phone}
            onChange={(e) => setPhone(e.target.value)}
          />
          <p className="mt-1 text-xs text-slate-400">Lets you sign in with your phone later.</p>
        </div>

        <div className="mb-5">
          <FormLabel htmlFor="regPassword">Password</FormLabel>
          <input
            id="regPassword"
            name="password"
            type="password"
            autoComplete="new-password"
            required
            minLength={8}
            placeholder="At least 8 characters"
            className={inputClass}
            value={password}
            onChange={(e) => setPassword(e.target.value)}
          />
        </div>

        <button type="submit" className={primaryButtonClass} disabled={busy || !valid}>
          {busy ? (
            <>
              <span aria-hidden="true" className="h-4 w-4 animate-spin rounded-full border-2 border-white/40 border-t-white" />
              Creating account…
            </>
          ) : (
            <>
              <UserPlus className="h-4 w-4" aria-hidden="true" />
              Create account
            </>
          )}
        </button>
      </form>
    </AuthPage>
  );
}
