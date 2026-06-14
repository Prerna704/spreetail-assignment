import { query } from '../config/db.js';

export async function listAuditLogs(req, res) {
  const result = await query(
    `SELECT al.*, u.name AS actor_name
     FROM audit_logs al
     LEFT JOIN users u ON u.id = al.actor_id
     ORDER BY al.created_at DESC
     LIMIT 100`
  );
  res.json({ auditLogs: result.rows });
}
