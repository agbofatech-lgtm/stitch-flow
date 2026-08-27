import request from 'supertest';
import { app } from '../src/app';
import { registerUser } from './helpers';

describe('Licensing', () => {
  it('validates a real license key with a device fingerprint', async () => {
    const user = await registerUser('lic@example.com');

    const res = await request(app).post('/licenses/validate').send({
      licenseKey: user.license.license_key,
      deviceFingerprint: 'device-001',
    });

    expect(res.status).toBe(200);
    expect(res.body.valid).toBe(true);
    expect(res.body.tier).toBe('free');
  });

  it('rejects an unknown license key', async () => {
    const res = await request(app).post('/licenses/validate').send({
      licenseKey: 'STITCH-DEAD-BEEF-0000',
      deviceFingerprint: 'device-001',
    });

    expect([200, 404]).toContain(res.status);
    if (res.status === 200) {
      expect(res.body.valid).toBe(false);
    }
  });

  it('enforces the device limit for the free tier (1 device)', async () => {
    const user = await registerUser('devices@example.com');

    const first = await request(app).post('/licenses/validate').send({
      licenseKey: user.license.license_key,
      deviceFingerprint: 'device-1',
    });
    expect(first.body.valid).toBe(true);

    const second = await request(app).post('/licenses/validate').send({
      licenseKey: user.license.license_key,
      deviceFingerprint: 'device-2',
    });

    expect(second.body.valid).toBe(false);
  });
});
