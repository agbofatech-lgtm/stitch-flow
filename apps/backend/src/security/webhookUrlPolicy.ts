/**
 * Phase 8 — SSRF policy for user-controlled webhook destinations (§13).
 *
 * Enforcement points: endpoint registration AND every delivery attempt.
 * Private destinations are permitted ONLY when explicitly allowed
 * (WEBHOOK_ALLOW_PRIVATE_DESTINATIONS=true) or under NODE_ENV=test (local
 * test receivers). Documented limitation: a public hostname that LATER
 * resolves to a private address (DNS rebinding) is not fully mitigable
 * without resolved-IP pinning in the HTTP client; re-validation happens at
 * delivery time on the URL literal, and rotation to a dedicated delivery
 * proxy with IP pinning is the hardening path (see PHASE8_SECURITY.md).
 */

export type UrlCheck = { ok: true } | { ok: false; reason: string };

const BLOCKED_HOSTNAMES = new Set([
  'localhost',
  'metadata.google.internal',
  'instance-data',
]);

function isPrivateIPv4(host: string): boolean {
  const m = /^(\d{1,3})\.(\d{1,3})\.(\d{1,3})\.(\d{1,3})$/.exec(host);
  if (!m) return false;
  const [a, b] = [Number(m[1]), Number(m[2])];
  if ([a, b, Number(m[3]), Number(m[4])].some((o) => o > 255)) return true; // malformed → block
  return (
    a === 0 || // "this" network
    a === 10 || // RFC1918
    (a === 172 && b >= 16 && b <= 31) || // RFC1918
    (a === 192 && b === 168) || // RFC1918
    a === 127 || // loopback
    (a === 169 && b === 254) || // link-local + cloud metadata (169.254.169.254)
    (a === 100 && b >= 64 && b <= 127) // CGNAT
  );
}

function isPrivateIPv6(host: string): boolean {
  const h = host.replace(/^\[|\]$/g, '').toLowerCase();
  if (h === '::' || h === '::1') return true;
  if (h.startsWith('fc') || h.startsWith('fd')) return true; // unique local
  if (h.startsWith('fe8') || h.startsWith('fe9') || h.startsWith('fea') || h.startsWith('feb')) return true; // link-local
  const mapped = /^::ffff:(\d+\.\d+\.\d+\.\d+)$/.exec(h);
  if (mapped) return isPrivateIPv4(mapped[1]);
  return false;
}

export function isPrivateDestination(hostname: string): boolean {
  const h = hostname.toLowerCase();
  if (BLOCKED_HOSTNAMES.has(h) || h.endsWith('.localhost') || h.endsWith('.internal')) return true;
  if (h.includes(':')) return isPrivateIPv6(h);
  if (isPrivateIPv4(h)) return true;
  return false;
}

export function privateDestinationsAllowed(): boolean {
  return process.env.NODE_ENV === 'test' || process.env.WEBHOOK_ALLOW_PRIVATE_DESTINATIONS === 'true';
}

export function checkWebhookUrl(
  rawUrl: string,
  options: { allowPrivate: boolean } = { allowPrivate: privateDestinationsAllowed() }
): UrlCheck {
  let url: URL;
  try {
    url = new URL(rawUrl);
  } catch {
    return { ok: false, reason: 'INVALID_URL' };
  }
  if (url.protocol !== 'http:' && url.protocol !== 'https:') {
    return { ok: false, reason: 'SCHEME_NOT_ALLOWED' };
  }
  if (url.username || url.password) {
    return { ok: false, reason: 'CREDENTIALS_IN_URL' };
  }
  if (!options.allowPrivate && isPrivateDestination(url.hostname)) {
    return { ok: false, reason: 'PRIVATE_DESTINATION' };
  }
  return { ok: true };
}
