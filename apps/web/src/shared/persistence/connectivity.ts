import type { ConnectivityState } from './types';

export type ReachabilityProbe = () => Promise<boolean>;

export class ConnectivityMonitor {
  private state: ConnectivityState = 'offline';
  private listeners = new Set<(state: ConnectivityState) => void>();

  constructor(private readonly probe?: ReachabilityProbe) {}

  getState() {
    return this.state;
  }

  subscribe(listener: (state: ConnectivityState) => void) {
    this.listeners.add(listener);
    return () => this.listeners.delete(listener);
  }

  setState(state: ConnectivityState) {
    this.state = state;
    this.listeners.forEach((listener) => listener(state));
  }

  async refresh() {
    const browserOnline = typeof navigator === 'undefined' ? true : navigator.onLine !== false;
    if (!browserOnline) {
      this.setState('offline');
      return this.state;
    }
    if (!this.probe) {
      this.setState('online');
      return this.state;
    }
    try {
      const reachable = await this.probe();
      this.setState(reachable ? 'online' : 'degraded');
    } catch {
      this.setState('failed');
    }
    return this.state;
  }
}

export async function probeT1Health(apiBase = 'http://localhost:5000') {
  const response = await fetch(`${apiBase}/health`);
  if (!response.ok) return false;
  const body = (await response.json()) as { runtime?: string };
  return body.runtime === 'apps/backend/src/app.ts';
}
