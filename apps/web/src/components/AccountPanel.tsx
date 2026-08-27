import { useEffect, useState } from 'react';
import { LogIn, LogOut, UserPlus, CloudOff, RefreshCw } from 'lucide-react';
import { login, register, logout } from '@shared/api/auth';
import { getAccessToken, getAuthWorkspaceId } from '@shared/utils/api';
import { syncNow, getSyncDiagnostics } from '@modules/services/syncEngine';
import { resolveActiveWorkspaceId } from '../offline/bootstrap';

const AUTH_EMAIL_KEY = 'stitchflow.auth.email';

/**
 * Account & sync panel (Phase 4): wires the existing Phase 3 auth client
 * into the UI. Logout is SAFE: tokens are cleared but local data and any
 * pending offline mutations are preserved (documented policy) and the user
 * is warned when unsynced work exists.
 */
export function AccountPanel() {
  const [mode, setMode] = useState<'login' | 'register'>('login');
  const [email, setEmail] = useState('');
  const [password, setPassword] = useState('');
  const [fullName, setFullName] = useState('');
  const [busy, setBusy] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [status, setStatus] = useState<string | null>(null);
  const [signedInAs, setSignedInAs] = useState<string | null>(null);
  const [pendingCount, setPendingCount] = useState(0);

  const refreshState = async () => {
    const token = getAccessToken();
    setSignedInAs(token ? window.localStorage.getItem(AUTH_EMAIL_KEY) || 'Signed in' : null);
    try {
      const ws = getAuthWorkspaceId() || resolveActiveWorkspaceId();
      const diag = await getSyncDiagnostics(ws);
      setPendingCount(diag.pendingMutations);
    } catch {
      setPendingCount(0);
    }
  };

  useEffect(() => {
    void refreshState();
  }, []);

  const handleSubmit = async () => {
    setBusy(true);
    setError(null);
    setStatus(null);
    try {
      if (mode === 'login') {
        await login(email.trim(), password);
      } else {
        await register({ email: email.trim(), password, fullName: fullName.trim() });
      }
      window.localStorage.setItem(AUTH_EMAIL_KEY, email.trim());
      setStatus('Signed in. Synchronizing...');
      const ws = getAuthWorkspaceId() || resolveActiveWorkspaceId();
      const result = await syncNow(ws);
      setStatus(
        result.ok
          ? `Signed in and synced (pushed ${result.pushed}, pulled ${result.pulled}).`
          : 'Signed in. Sync will retry automatically.'
      );
      setPassword('');
      await refreshState();
    } catch (err) {
      setError(err instanceof Error ? err.message : 'Authentication failed');
    } finally {
      setBusy(false);
    }
  };

  const handleLogout = async () => {
    setBusy(true);
    setError(null);
    try {
      await logout(); // clears tokens ONLY; local data + queue are preserved
      window.localStorage.removeItem(AUTH_EMAIL_KEY);
      setStatus(
        pendingCount > 0
          ? `Signed out. ${pendingCount} unsynced change(s) are kept locally and will sync after your next sign-in.`
          : 'Signed out. Your local data remains available offline.'
      );
      await refreshState();
    } finally {
      setBusy(false);
    }
  };

  const handleManualSync = async () => {
    setBusy(true);
    setError(null);
    try {
      const ws = getAuthWorkspaceId() || resolveActiveWorkspaceId();
      const result = await syncNow(ws);
      setStatus(
        result.ok
          ? `Synced: pushed ${result.pushed}, pulled ${result.pulled}.`
          : result.error || 'Sync did not complete.'
      );
      await refreshState();
    } finally {
      setBusy(false);
    }
  };

  return (
    <div className="mb-6 rounded-[24px] border border-slate-200 bg-white p-5">
      <div className="mb-3 flex items-center justify-between">
        <h2 className="text-lg font-semibold text-slate-900">Account & Sync</h2>
        {pendingCount > 0 && (
          <span className="inline-flex items-center gap-1 rounded-full bg-amber-100 px-3 py-1 text-xs font-medium text-amber-800">
            <CloudOff className="h-3.5 w-3.5" />
            {pendingCount} pending sync
          </span>
        )}
      </div>

      {error && (
        <div className="mb-3 rounded-xl border border-red-200 bg-red-50 p-2.5 text-sm text-red-700">{error}</div>
      )}
      {status && (
        <div className="mb-3 rounded-xl border border-sky-200 bg-sky-50 p-2.5 text-sm text-sky-800">{status}</div>
      )}

      {signedInAs ? (
        <div className="flex flex-wrap items-center gap-3">
          <span className="text-sm text-slate-600">
            Signed in as <span className="font-medium text-slate-900">{signedInAs}</span>
          </span>
          <button
            onClick={() => void handleManualSync()}
            disabled={busy}
            className="inline-flex items-center gap-2 rounded-xl border border-slate-200 px-3 py-2 text-sm font-medium text-slate-700 hover:bg-slate-50 disabled:opacity-50"
          >
            <RefreshCw className="h-4 w-4" /> Sync now
          </button>
          <button
            onClick={() => void handleLogout()}
            disabled={busy}
            className="inline-flex items-center gap-2 rounded-xl border border-red-200 px-3 py-2 text-sm font-medium text-red-600 hover:bg-red-50 disabled:opacity-50"
          >
            <LogOut className="h-4 w-4" /> Sign out
          </button>
        </div>
      ) : (
        <div className="space-y-3">
          <div className="flex flex-col gap-3 sm:flex-row">
            {mode === 'register' && (
              <input
                value={fullName}
                onChange={(e) => setFullName(e.target.value)}
                placeholder="Full name"
                className="w-full rounded-xl border border-slate-200 px-3 py-2 text-sm"
              />
            )}
            <input
              value={email}
              onChange={(e) => setEmail(e.target.value)}
              placeholder="Email"
              type="email"
              className="w-full rounded-xl border border-slate-200 px-3 py-2 text-sm"
            />
            <input
              value={password}
              onChange={(e) => setPassword(e.target.value)}
              placeholder="Password (min 8 characters)"
              type="password"
              className="w-full rounded-xl border border-slate-200 px-3 py-2 text-sm"
            />
          </div>
          <div className="flex flex-wrap items-center gap-3">
            <button
              onClick={() => void handleSubmit()}
              disabled={busy || !email || password.length < 8 || (mode === 'register' && !fullName)}
              className="inline-flex items-center gap-2 rounded-xl bg-[#0F6E8C] px-4 py-2 text-sm font-medium text-white hover:bg-[#0C5C74] disabled:opacity-50"
            >
              {mode === 'login' ? <LogIn className="h-4 w-4" /> : <UserPlus className="h-4 w-4" />}
              {mode === 'login' ? 'Sign in' : 'Create account'}
            </button>
            <button
              onClick={() => setMode(mode === 'login' ? 'register' : 'login')}
              className="text-sm text-[#0F6E8C] hover:underline"
            >
              {mode === 'login' ? 'Need an account? Register' : 'Have an account? Sign in'}
            </button>
            <span className="text-xs text-slate-400">
              Offline work is always kept locally and synced when you sign in.
            </span>
          </div>
        </div>
      )}
    </div>
  );
}
