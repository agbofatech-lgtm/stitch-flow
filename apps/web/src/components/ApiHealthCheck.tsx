import { useEffect, useState } from 'react';
import { apiGet } from '@shared/utils/api';

type HealthResponse = {
  status: string;
};

export function ApiHealthCheck() {
  const [status, setStatus] = useState<'loading' | 'connected' | 'error'>('loading');
  const [message, setMessage] = useState('Checking backend...');

  useEffect(() => {
    async function checkHealth() {
      try {
        const data = await apiGet<HealthResponse>('/health');

        if (data.status === 'ok') {
          setStatus('connected');
          setMessage('Backend connected successfully');
          return;
        }

        setStatus('error');
        setMessage('Backend responded, but health check was unexpected');
      } catch (error) {
        setStatus('error');
        setMessage(error instanceof Error ? error.message : 'Failed to connect to backend');
      }
    }

    checkHealth();
  }, []);

  return (
    <div className="rounded-2xl border border-slate-200 bg-white p-4 shadow-sm">
      <h2 className="text-lg font-semibold text-slate-900">Backend Status</h2>
      <p className="mt-2 text-sm text-slate-500">{message}</p>

      <div className="mt-3">
        {status === 'loading' && (
          <span className="inline-flex rounded-full bg-slate-100 px-3 py-1 text-xs font-medium text-slate-600">
            Checking...
          </span>
        )}

        {status === 'connected' && (
          <span className="inline-flex rounded-full bg-green-100 px-3 py-1 text-xs font-medium text-green-700">
            Connected
          </span>
        )}

        {status === 'error' && (
          <span className="inline-flex rounded-full bg-red-100 px-3 py-1 text-xs font-medium text-red-700">
            Error
          </span>
        )}
      </div>
    </div>
  );
}
