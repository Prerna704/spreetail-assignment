import { query } from '../config/db.js';
import { toMoney } from './currencyService.js';

function addBalance(map, userId, amount) {
  map.set(userId, toMoney((map.get(userId) || 0) + Number(amount)));
}

function simplifyDebts(summary) {
  const creditors = summary
    .filter((row) => row.netAmount > 0.005)
    .map((row) => ({ ...row, remaining: row.netAmount }))
    .sort((a, b) => b.remaining - a.remaining);
  const debtors = summary
    .filter((row) => row.netAmount < -0.005)
    .map((row) => ({ ...row, remaining: Math.abs(row.netAmount) }))
    .sort((a, b) => b.remaining - a.remaining);

  const settlements = [];
  let creditorIndex = 0;
  let debtorIndex = 0;

  while (creditorIndex < creditors.length && debtorIndex < debtors.length) {
    const creditor = creditors[creditorIndex];
    const debtor = debtors[debtorIndex];
    const amount = toMoney(Math.min(creditor.remaining, debtor.remaining));

    settlements.push({
      fromUserId: debtor.userId,
      fromName: debtor.name,
      toUserId: creditor.userId,
      toName: creditor.name,
      amount
    });

    creditor.remaining = toMoney(creditor.remaining - amount);
    debtor.remaining = toMoney(debtor.remaining - amount);

    if (creditor.remaining <= 0.005) creditorIndex += 1;
    if (debtor.remaining <= 0.005) debtorIndex += 1;
  }

  return settlements;
}

export async function calculateGroupBalances(groupId) {
  const [memberRows, expenseRows, participantRows, settlementRows] = await Promise.all([
    query(
      `SELECT gm.user_id, u.name, u.email
       FROM group_members gm
       JOIN users u ON u.id = gm.user_id
       WHERE gm.group_id = $1
       ORDER BY u.name`,
      [groupId]
    ),
    query('SELECT * FROM expenses WHERE group_id = $1 AND deleted_at IS NULL', [groupId]),
    query(
      `SELECT ep.*, e.description, e.expense_date, e.paid_by, e.base_amount
       FROM expense_participants ep
       JOIN expenses e ON e.id = ep.expense_id
       WHERE e.group_id = $1 AND e.deleted_at IS NULL`,
      [groupId]
    ),
    query('SELECT * FROM settlements WHERE group_id = $1 AND deleted_at IS NULL AND is_settled = TRUE', [groupId])
  ]);

  const balances = new Map();
  const trace = [];
  for (const member of memberRows.rows) {
    balances.set(member.user_id, 0);
  }

  for (const expense of expenseRows.rows) {
    addBalance(balances, expense.paid_by, expense.base_amount);
    trace.push({
      type: 'EXPENSE_PAID',
      expenseId: expense.id,
      userId: expense.paid_by,
      amount: Number(expense.base_amount),
      description: expense.description,
      date: expense.expense_date
    });
  }

  for (const participant of participantRows.rows) {
    addBalance(balances, participant.user_id, -Number(participant.owed_base_amount));
    trace.push({
      type: 'EXPENSE_OWED',
      expenseId: participant.expense_id,
      userId: participant.user_id,
      amount: -Number(participant.owed_base_amount),
      description: participant.description,
      date: participant.expense_date
    });
  }

  for (const settlement of settlementRows.rows) {
    addBalance(balances, settlement.payer_id, settlement.base_amount);
    addBalance(balances, settlement.receiver_id, -Number(settlement.base_amount));
    trace.push({
      type: 'SETTLEMENT',
      settlementId: settlement.id,
      payerId: settlement.payer_id,
      receiverId: settlement.receiver_id,
      amount: Number(settlement.base_amount),
      date: settlement.settlement_date
    });
  }

  const membersById = new Map(memberRows.rows.map((member) => [member.user_id, member]));
  const summary = [...balances.entries()].map(([userId, netAmount]) => ({
    userId,
    name: membersById.get(userId)?.name ?? 'Unknown',
    email: membersById.get(userId)?.email ?? null,
    netAmount: toMoney(netAmount)
  }));

  return {
    summary,
    simplifiedDebts: simplifyDebts(summary),
    trace
  };
}
