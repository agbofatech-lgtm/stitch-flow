import { featureRequestRepository } from '../repositories/featureRequestRepository';
import { auditLogService } from './auditLogService';

export const featureRequestService = {
  async create(data: { userId: string | null; title: string; description: string; status: string }) {
    const featureRequest = await featureRequestRepository.create(data);
    await auditLogService.log({
      userId: data.userId,
      action: 'feature_request_created',
      entityType: 'feature_request',
      entityId: featureRequest.id
    });
    return featureRequest;
  },

  async list(limit: number, offset: number) {
    return featureRequestRepository.list(limit, offset);
  },

  async vote(featureRequestId: string, userId: string) {
    await featureRequestRepository.vote(featureRequestId, userId);
    await auditLogService.log({
      userId,
      action: 'feature_request_voted',
      entityType: 'feature_request',
      entityId: featureRequestId
    });
  }
};
