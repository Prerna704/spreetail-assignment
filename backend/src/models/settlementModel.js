import { withTransaction } from '../config/db.js';
import { assertActiveMember } from './groupModel.js';
import { writeAudit } from '../services/auditService.js';
import { getExchangeRate, toMoney } from '../services/currencyService.js';
import { ApiError } from '../utils/ApiError.js';

export async function listSettlements(groupId) {
  return withTransaction(async (client) => {
    const result = await client.query(
      `SELECT s.*, payer.name AS payer_name, receiver.name AS receiver_name
       FROM settlements s
       JOIN users payer ON payer.id = s.payer_id
       JOIN users receiver ON receiver.id = s.receiver_id
       WHERE s.group_id = $1 AND s.deleted_at IS NULL
       ORDER BY s.settlement_date DESC, s.created_at DESC`,
      [groupId]
    );
    return result.rows;
  });
}

export async function createSettlement(input, actorId) {
  return withTransaction(async (client) => {
    const payerActive = await assertActiveMember(client, input.groupId, input.payerId, input.settlementDate);
    const receiverActive = await assertActiveMember(client, input.groupId, input.receiverId, input.settlementDate);
    if (!payerActive || !receiverActive) {
      throw new ApiError(400, 'Settlement users must be active group members on settlement date');
    }

    const rate = await getExchangeRate({
      sourceCurrency: input.currency,
      targetCurrency: input.baseCurrency,
      date: input.settlementDate,
      client
    });
    const baseAmount = toMoney(Number(input.amount) * rate);
    const result = await client.query(
      `INSERT INTO settlements
       (group_id, payer_id, receiver_id, amount, currency, base_amount, exchange_rate,
        settlement_date, note, is_settled, created_by)
       VALUES ($1, $2, $3, $4, $5, $6, $7, $8, $9, TRUE, $10)
       RETURNING *`,
      [
        input.groupId,
        input.payerId,
        input.receiverId,
        input.amount,
        input.currency,
        baseAmount,
        rate,
        input.settlementDate,
        input.note ?? null,
        actorId
      ]
    );
    await writeAudit(client, {
      actorId,
      entityType: 'settlement',
      entityId: result.rows[0].id,
      action: 'CREATE',
      afterState: result.rows[0]
    });
    return result.rows[0];
  });
}

export async function deleteSettlement(settlementId, actorId) {
  return withTransaction(async (client) => {
    const before = await client.query('SELECT * FROM settlements WHERE id = $1 AND deleted_at IS NULL', [settlementId]);
    const result = await client.query(
      `UPDATE settlements SET deleted_at = NOW(), updated_at = NOW()
       WHERE id = $1 AND deleted_at IS NULL RETURNING *`,
      [settlementId]
    );
    if (!result.rows[0]) {
      throw new ApiError(404, 'Settlement not found');
    }
    await writeAudit(client, {
      actorId,
      entityType: 'settlement',
      entityId: settlementId,
      action: 'DELETE',
      beforeState: before.rows[0],
      afterState: result.rows[0]
    });
    return result.rows[0];
  });
}
