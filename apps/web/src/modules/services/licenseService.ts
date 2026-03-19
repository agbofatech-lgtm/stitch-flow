import { licenseRepository } from '@modules/repositories/licenseRepository';
import { ApiError } from '@shared/utils/apiError';
import { getTierFeatures } from '@shared/utils/features';
import { auditLogService } from './auditLogService';

export const licenseService = {
  async validate(licenseKey: string, deviceFingerprint: string) {
    const license = await licenseRepository.findByKey(licenseKey);
    if (!license || license.status !== 'active') {
      return {
        valid: false,
        tier: null,
        features: [],
        syncPermissions: null,
        limitExceeded: false
      };
    }

    if (license.user_status !== 'active') {
      throw new ApiError(403, 'ACCOUNT_INACTIVE', 'Account is suspended');
    }

    const activeDevices = await licenseRepository.getActiveDevices(license.id);
    const existingDevice = activeDevices.find(
      (d: any) => d.device_fingerprint === deviceFingerprint
    );

    if (existingDevice) {
      await licenseRepository.touchDevice(license.id, deviceFingerprint);
      const tierBundle = getTierFeatures(license.tier);
      return {
        valid: true,
        tier: license.tier,
        ...tierBundle,
        limitExceeded: false
      };
    }

    if (activeDevices.length >= license.max_devices) {
      return {
        valid: false,
        tier: license.tier,
        features: [],
        syncPermissions: null,
        limitExceeded: true
      };
    }

    await licenseRepository.bindDevice(license.id, deviceFingerprint);
    await auditLogService.log({
      userId: license.user_id,
      action: 'device_bound',
      entityType: 'license',
      entityId: license.id,
      metadata: { deviceFingerprint }
    });

    const tierBundle = getTierFeatures(license.tier);
    return {
      valid: true,
      tier: license.tier,
      ...tierBundle,
      limitExceeded: false
    };
  },

  async deactivateDevice(licenseId: string, deviceFingerprint: string, actorUserId?: string) {
    await licenseRepository.deactivateDevice(licenseId, deviceFingerprint);
    await auditLogService.log({
      userId: actorUserId || null,
      action: 'device_deactivated',
      entityType: 'license',
      entityId: licenseId,
      metadata: { deviceFingerprint }
    });
  }
};
