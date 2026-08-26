import { query } from '../config/db';

export const licenseRepository = {
  async create(data: {
    userId: string;
    licenseKey: string;
    tier: 'free' | 'pro' | 'enterprise';
    maxDevices: number;
  }) {
    const result = await query(
      `INSERT INTO licenses (user_id, license_key, tier, max_devices, status)
       VALUES ($1, $2, $3, $4, 'active')
       RETURNING *`,
      [data.userId, data.licenseKey, data.tier, data.maxDevices]
    );
    return result.rows[0];
  },

  async findByKey(licenseKey: string) {
    const result = await query(
      `SELECT l.*, u.email, u.status as user_status
       FROM licenses l
       JOIN users u ON u.id = l.user_id
       WHERE l.license_key = $1 AND l.deleted_at IS NULL`,
      [licenseKey]
    );
    return result.rows[0] || null;
  },

  async getActiveDevices(licenseId: string) {
    const result = await query(
      `SELECT * FROM license_devices
       WHERE license_id = $1 AND is_active = true AND deleted_at IS NULL`,
      [licenseId]
    );
    return result.rows;
  },

  async bindDevice(licenseId: string, deviceFingerprint: string) {
    const result = await query(
      `INSERT INTO license_devices (license_id, device_fingerprint, is_active, last_validated_at)
       VALUES ($1, $2, true, NOW())
       RETURNING *`,
      [licenseId, deviceFingerprint]
    );
    return result.rows[0];
  },

  async touchDevice(licenseId: string, deviceFingerprint: string) {
    const result = await query(
      `UPDATE license_devices
       SET last_validated_at = NOW(), updated_at = NOW(), is_active = true
       WHERE license_id = $1 AND device_fingerprint = $2
       RETURNING *`,
      [licenseId, deviceFingerprint]
    );
    return result.rows[0] || null;
  },

  async deactivateDevice(licenseId: string, deviceFingerprint: string) {
    await query(
      `UPDATE license_devices
       SET is_active = false, updated_at = NOW()
       WHERE license_id = $1 AND device_fingerprint = $2`,
      [licenseId, deviceFingerprint]
    );
  },

  async list(limit: number, offset: number) {
    const result = await query(
      `SELECT * FROM licenses WHERE deleted_at IS NULL
       ORDER BY created_at DESC LIMIT $1 OFFSET $2`,
      [limit, offset]
    );
    return result.rows;
  },

  async updateTier(licenseId: string, tier: string, maxDevices: number) {
    const result = await query(
      `UPDATE licenses SET tier = $2, max_devices = $3, updated_at = NOW()
       WHERE id = $1 RETURNING *`,
      [licenseId, tier, maxDevices]
    );
    return result.rows[0];
  },

  async revoke(licenseId: string) {
    const result = await query(
      `UPDATE licenses SET status = 'revoked', updated_at = NOW()
       WHERE id = $1 RETURNING *`,
      [licenseId]
    );
    return result.rows[0];
  }
};

