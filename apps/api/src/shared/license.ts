import crypto from 'crypto';

export function generateLicenseKey() {
  const a = crypto.randomBytes(4).toString('hex').toUpperCase();
  const b = crypto.randomBytes(4).toString('hex').toUpperCase();
  const c = crypto.randomBytes(4).toString('hex').toUpperCase();
  return `STITCH-${a}-${b}-${c}`;
}
