import { query } from '../config/db';

export const featureRequestRepository = {
  async create(data: { userId: string | null; title: string; description: string; status: string }) {
    const result = await query(
      `INSERT INTO feature_requests (user_id, title, description, status)
       VALUES ($1, $2, $3, $4)
       RETURNING *`,
      [data.userId, data.title, data.description, data.status]
    );
    return result.rows[0];
  },

  async list(limit: number, offset: number) {
    const result = await query(
      `SELECT fr.*,
        COALESCE((SELECT COUNT(*) FROM feature_request_votes v WHERE v.feature_request_id = fr.id AND v.deleted_at IS NULL), 0)::int AS votes
       FROM feature_requests fr
       WHERE fr.deleted_at IS NULL
       ORDER BY fr.created_at DESC
       LIMIT $1 OFFSET $2`,
      [limit, offset]
    );
    return result.rows;
  },

  async vote(featureRequestId: string, userId: string) {
    await query(
      `INSERT INTO feature_request_votes (feature_request_id, user_id)
       VALUES ($1, $2)
       ON CONFLICT (feature_request_id, user_id) DO NOTHING`,
      [featureRequestId, userId]
    );
  }
};
