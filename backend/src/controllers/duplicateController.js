import { withTransaction } from '../config/db.js';
import { writeAudit } from '../services/auditService.js';
import { ApiError } from '../utils/ApiError.js';

export async function requestDuplicateRemoval(req, res) {
  const result = await withTransaction(async (client) => {
    const request = await client.query(
      `INSERT INTO duplicate_review_requests
       (group_id, source_expense_id, duplicate_expense_id, requested_by)
       VALUES ($1, $2, $3, $4)
       RETURNING *`,
      [req.body.groupId, req.body.sourceExpenseId, req.body.duplicateExpenseId, req.user.id]
    );
    return request.rows[0];
  });
  res.status(201).json({ duplicateReviewRequest: result });
}

export async function listDuplicateRequests(_req, res) {
  const result = await withTransaction(async (client) => {
    const requests = await client.query(
      `SELECT drr.*, g.name AS group_name
       FROM duplicate_review_requests drr
       JOIN groups g ON g.id = drr.group_id
       ORDER BY drr.created_at DESC`
    );
    return requests.rows;
  });
  res.json({ duplicateReviewRequests: result });
}

export async function approveDuplicateRemoval(req, res) {
  const result = await withTransaction(async (client) => {
    const requestResult = await client.query(
      `SELECT * FROM duplicate_review_requests WHERE id = $1 AND status = 'PENDING'`,
      [req.params.requestId]
    );
    const request = requestResult.rows[0];
    if (!request) throw new ApiError(404, 'Pending duplicate review request not found');

    const before = await client.query('SELECT * FROM expenses WHERE id = $1', [request.duplicate_expense_id]);
    await client.query(
      `UPDATE expenses SET deleted_at = NOW(), updated_at = NOW()
       WHERE id = $1 AND deleted_at IS NULL`,
      [request.duplicate_expense_id]
    );
    const updatedRequest = await client.query(
      `UPDATE duplicate_review_requests
       SET status = 'APPROVED', reviewed_by = $1, reviewed_at = NOW()
       WHERE id = $2
       RETURNING *`,
      [req.user.id, req.params.requestId]
    );
    await writeAudit(client, {
      actorId: req.user.id,
      entityType: 'expense',
      entityId: request.duplicate_expense_id,
      action: 'APPROVE_DUPLICATE_REMOVAL',
      beforeState: before.rows[0],
      afterState: { deleted_at: new Date().toISOString() },
      metadata: { duplicateReviewRequestId: req.params.requestId }
    });
    return updatedRequest.rows[0];
  });
  res.json({ duplicateReviewRequest: result });
}
