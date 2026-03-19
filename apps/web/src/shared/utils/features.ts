export function getTierFeatures(tier: string) {
  switch (tier) {
    case 'enterprise':
      return {
        features: ['offline-sync', 'analytics', 'advanced-reports', 'multi-device'],
        syncPermissions: { maxSyncIntervalMinutes: 5 }
      };
    case 'pro':
      return {
        features: ['offline-sync', 'analytics', 'multi-device'],
        syncPermissions: { maxSyncIntervalMinutes: 15 }
      };
    default:
      return {
        features: ['offline-sync'],
        syncPermissions: { maxSyncIntervalMinutes: 60 }
      };
  }
}
