import { userRepository } from '@modules/repositories/userRepository';
import { eventRepository } from '@modules/repositories/eventRepository';
import { licenseRepository } from '@modules/repositories/licenseRepository';
import { featureRequestRepository } from '@modules/repositories/featureRequestRepository';
import { auditLogRepository } from '@modules/repositories/auditLogRepository';

export const adminService = {
  async listUsers(limit: number, offset: number, status?: string, role?: string) {
    return userRepository.list(limit, offset, status, role);
  },

  async analytics(limit: number, offset: number) {
    const [raw, aggregate] = await Promise.all([
      eventRepository.list(limit, offset),
      eventRepository.aggregateByType()
    ]);

    return { raw, aggregate };
  },

  async listLicenses(limit: number, offset: number) {
    return licenseRepository.list(limit, offset);
  },

  async updateLicenseTier(licenseId: string, tier: 'free' | 'pro' | 'enterprise', maxDevices: number) {
    return licenseRepository.updateTier(licenseId, tier, maxDevices);
  },

  async revokeLicense(licenseId: string) {
    return licenseRepository.revoke(licenseId);
  },

  async listFeatureRequests(limit: number, offset: number) {
    return featureRequestRepository.list(limit, offset);
  },

  async auditLogs(limit: number, offset: number) {
    return auditLogRepository.list(limit, offset);
  }
};
