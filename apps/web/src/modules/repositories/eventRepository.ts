import { query } from '../config/db';

export const eventRepository = {
  async createBatch(events: any[]) {
    const values: string[] = [];
    const params: any[] = [];

    events.forEach((event, i) => {
      const base = i * 5;
      values.push(`($${base + 1}, $${base + 2}, $${base + 3}, $${base + 4}, $${base + 5})`);
      params.push(event.userId || null, event.deviceId, event.eventType, JSON.stringify(event.metadata || {}), event.timestamp);
    });

    await query(
      `INSERT INTO events (user_id, device_id, event_type, metadata, occurred_at)
       VALUES ${values.join(', ')}`,
      params
    );
  },

  async list(limit: number, offset: number) {
    const result = await query(
      `SELECT * FROM events WHERE deleted_at IS NULL
       ORDER BY occurred_at DESC LIMIT $1 OFFSET $2`,
      [limit, offset]
    );
    return result.rows;
  },

  async aggregateByType() {
    const result = await query(
      `SELECT event_type, COUNT(*)::int as count
       FROM events
       WHERE deleted_at IS NULL
       GROUP BY event_type
       ORDER BY count DESC`
    );
    return result.rows;
  }
};
