import { withTransaction } from '../config/db.js';
import { assertActiveMember } from './groupModel.js';
import { writeAudit } from '../services/auditService.js';
import { getExchangeRate, toMoney } from '../services/currencyService.js';
import { buildParticipantShares } from '../services/splitService.js';
import { ApiError } from '../utils/ApiError.js';

async function insertParticipants(client, expenseId, shares) {
  for (const share of shares) {
    await client.query(
      `INSERT INTO expense_participants (expense_id, user_id, percentage, exact_amount, owed_base_amount)
       VALUES ($1, $2, $3, $4, $5)`,
      [expenseId, share.userId, share.percentage ?? null, share.exactAmount ?? null, share.owedBaseAmount]
    );
  }
}

async function validateExpenseMembers(client, { groupId, paidBy, participants, expenseDate }) {
  const paidByActive = await assertActiveMember(client, groupId, paidBy, expenseDate);
  if (!paidByActive) {
    throw new ApiError(400, 'Payer is not an active member on expense date');
  }

  for (const participant of participants) {
    const active = await assertActiveMember(client, groupId, participant.userId, expenseDate);
    if (!active) {
      throw new ApiError(400, `Participant ${participant.userId} is not active on expense date`);
    }
  }
}

function convertExactParticipants(participants, rate) {
  return participants.map((participant) => ({
    ...participant,
    exactAmount: participant.exactAmount === undefined ? undefined : toMoney(Number(participant.exactAmount) * rate)
  }));
}

export async function listExpenses(groupId) {
  return withTransaction(async (client) => {
    const result = await client.query(
      `SELECT e.*, u.name AS paid_by_name
       FROM expenses e
       JOIN users u ON u.id = e.paid_by
       WHERE e.group_id = $1 AND e.deleted_at IS NULL
       ORDER BY e.expense_date DESC, e.created_at DESC`,
      [groupId]
    );
    return result.rows;
  });
}

export async function getExpenseWithParticipants(expenseId) {
  return withTransaction(async (client) => {
    const expenseResult = await client.query(
      `SELECT e.*, u.name AS paid_by_name
       FROM expenses e
       JOIN users u ON u.id = e.paid_by
       WHERE e.id = $1 AND e.deleted_at IS NULL`,
      [expenseId]
    );
    const participantsResult = await client.query(
      `SELECT ep.*, u.name, u.email
       FROM expense_participants ep
       JOIN users u ON u.id = ep.user_id
       WHERE ep.expense_id = $1
       ORDER BY u.name`,
      [expenseId]
    );
    return { ...expenseResult.rows[0], participants: participantsResult.rows };
  });
}

export async function createExpense(input, actorId, existingClient = null) {
  const execute = async (client) => {
    await validateExpenseMembers(client, input);
    const rate = await getExchangeRate({
      sourceCurrency: input.currency,
      targetCurrency: input.baseCurrency,
      date: input.expenseDate,
      client
    });
    const baseAmount = toMoney(Number(input.amount) * rate);
    const splitParticipants = input.splitType === 'EXACT' ? convertExactParticipants(input.participants, rate) : input.participants;
    const shares = buildParticipantShares({
      splitType: input.splitType,
      baseAmount,
      participants: splitParticipants
    });

    const expenseResult = await client.query(
      `INSERT INTO expenses
       (group_id, description, category, amount, currency, base_amount, exchange_rate, expense_date,
        paid_by, split_type, source_import_id, created_by)
       VALUES ($1, $2, $3, $4, $5, $6, $7, $8, $9, $10, $11, $12)
       RETURNING *`,
      [
        input.groupId,
        input.description,
        input.category,
        input.amount,
        input.currency,
        baseAmount,
        rate,
        input.expenseDate,
        input.paidBy,
        input.splitType,
        input.sourceImportId ?? null,
        actorId
      ]
    );
    await insertParticipants(client, expenseResult.rows[0].id, shares);
    await writeAudit(client, {
      actorId,
      entityType: 'expense',
      entityId: expenseResult.rows[0].id,
      action: input.sourceImportId ? 'IMPORT' : 'CREATE',
      afterState: { ...expenseResult.rows[0], participants: shares }
    });
    return expenseResult.rows[0];
  };

  return existingClient ? execute(existingClient) : withTransaction(execute);
}

export async function updateExpense(expenseId, input, actorId) {
  return withTransaction(async (client) => {
    const before = await client.query('SELECT * FROM expenses WHERE id = $1 AND deleted_at IS NULL', [expenseId]);
    if (!before.rows[0]) {
      throw new ApiError(404, 'Expense not found');
    }

    await validateExpenseMembers(client, input);
    const rate = await getExchangeRate({
      sourceCurrency: input.currency,
      targetCurrency: input.baseCurrency,
      date: input.expenseDate,
      client
    });
    const baseAmount = toMoney(Number(input.amount) * rate);
    const splitParticipants = input.splitType === 'EXACT' ? convertExactParticipants(input.participants, rate) : input.participants;
    const shares = buildParticipantShares({ splitType: input.splitType, baseAmount, participants: splitParticipants });

    const result = await client.query(
      `UPDATE expenses
       SET description = $1, category = $2, amount = $3, currency = $4, base_amount = $5,
           exchange_rate = $6, expense_date = $7, paid_by = $8, split_type = $9, updated_at = NOW()
       WHERE id = $10 AND deleted_at IS NULL
       RETURNING *`,
      [
        input.description,
        input.category,
        input.amount,
        input.currency,
        baseAmount,
        rate,
        input.expenseDate,
        input.paidBy,
        input.splitType,
        expenseId
      ]
    );
    await client.query('DELETE FROM expense_participants WHERE expense_id = $1', [expenseId]);
    await insertParticipants(client, expenseId, shares);
    await writeAudit(client, {
      actorId,
      entityType: 'expense',
      entityId: expenseId,
      action: 'UPDATE',
      beforeState: before.rows[0],
      afterState: { ...result.rows[0], participants: shares }
    });
    return result.rows[0];
  });
}

export async function deleteExpense(expenseId, actorId) {
  return withTransaction(async (client) => {
    const before = await client.query('SELECT * FROM expenses WHERE id = $1 AND deleted_at IS NULL', [expenseId]);
    const result = await client.query(
      `UPDATE expenses SET deleted_at = NOW(), updated_at = NOW()
       WHERE id = $1 AND deleted_at IS NULL RETURNING *`,
      [expenseId]
    );
    if (!result.rows[0]) {
      throw new ApiError(404, 'Expense not found');
    }
    await writeAudit(client, {
      actorId,
      entityType: 'expense',
      entityId: expenseId,
      action: 'DELETE',
      beforeState: before.rows[0],
      afterState: result.rows[0]
    });
    return result.rows[0];
  });
}
