import { auditLogRepository } from '@modules/repositories/auditLogRepository';

export const auditLogService = {
  async log(data: {
    userId?: string | null;
    action: string;
    entityType: string;
    entityId?: string | null;
    metadata?: any;
  }) {
    await auditLogRepository.create(data);
  }
};
