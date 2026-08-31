import type { ConflictPolicy } from './types';

export type VersionCheck =
  | { result: 'same'; localVersion: number; remoteVersion: number }
  | { result: 'local-newer'; localVersion: number; remoteVersion: number }
  | { result: 'remote-newer'; localVersion: number; remoteVersion: number }
  | { result: 'conflict'; localVersion: number; remoteVersion: number };

export function compareVersions(localVersion: number, remoteVersion: number): VersionCheck {
  if (localVersion === remoteVersion) {
    return { result: 'same', localVersion, remoteVersion };
  }
  if (localVersion === remoteVersion + 1) {
    return { result: 'local-newer', localVersion, remoteVersion };
  }
  if (remoteVersion === localVersion + 1) {
    return { result: 'remote-newer', localVersion, remoteVersion };
  }
  return { result: 'conflict', localVersion, remoteVersion };
}

export const ENTITY_CONFLICT_POLICY: Record<string, ConflictPolicy> = {
  customer: 'detect-only',
  measurement: 'domain-merge',
  garment: 'detect-only',
  design: 'detect-only',
  order: 'domain-merge',
  production: 'domain-merge',
  material: 'detect-only',
  inventory: 'detect-only',
  invoice: 'detect-only',
  payment: 'detect-only',
  user: 'server-authoritative',
  workspace: 'server-authoritative',
};

export function mustNotSilentOverwrite(policy: ConflictPolicy) {
  return policy !== 'server-authoritative';
}
