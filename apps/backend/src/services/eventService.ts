import { eventRepository } from '../repositories/eventRepository';
import { auditLogService } from './auditLogService';

export const eventService = {
  async ingest(events: any[], actorUserId?: string) {
    await eventRepository.createBatch(events);
    await auditLogService.log({
      userId: actorUserId || null,
      action: 'events_ingested',
      entityType: 'event',
      metadata: { count: events.length }
    });
  }
};
