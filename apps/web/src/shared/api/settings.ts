import { apiGet, apiPut } from '../utils/api';
import type { AppSettings } from '../../types';

export async function fetchSettings(): Promise<AppSettings> {
  try { return await apiGet<AppSettings>('/settings'); } catch { return {} as AppSettings; }
}
export async function updateSetting<T = unknown>(key: string, value: T): Promise<AppSettings> {
  return apiPut<AppSettings>(`/settings/${key}`, { value });
}