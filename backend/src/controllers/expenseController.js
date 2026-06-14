import { ApiError } from '../utils/ApiError.js';
import { createExpense, deleteExpense, getExpenseWithParticipants, listExpenses, updateExpense } from '../models/expenseModel.js';
import { getGroupById } from '../models/groupModel.js';
import { query } from '../config/db.js';
import { sendCsv, toCsv } from '../utils/csv.js';

export async function listGroupExpenses(req, res) {
  const group = await getGroupById(req.params.groupId, req.user.id);
  if (!group) throw new ApiError(404, 'Group not found');
  res.json({ expenses: await listExpenses(group.id) });
}

export async function exportGroupExpenses(req, res) {
  const group = await getGroupById(req.params.groupId, req.user.id);
  if (!group) throw new ApiError(404, 'Group not found');

  const result = await query(
    `SELECT
       e.id,
       TO_CHAR(e.expense_date, 'YYYY-MM-DD') AS expense_date,
       e.description,
       e.category,
       payer.name AS paid_by,
       e.amount,
       e.currency,
       e.exchange_rate,
       e.base_amount,
       e.split_type,
       COALESCE(
         STRING_AGG(
           participant.name || ':' || ep.owed_base_amount,
           '; ' ORDER BY participant.name
         ),
         ''
       ) AS participant_breakdown
     FROM expenses e
     JOIN users payer ON payer.id = e.paid_by
     LEFT JOIN expense_participants ep ON ep.expense_id = e.id
     LEFT JOIN users participant ON participant.id = ep.user_id
     WHERE e.group_id = $1 AND e.deleted_at IS NULL
     GROUP BY e.id, payer.name
     ORDER BY e.expense_date, e.created_at`,
    [group.id]
  );

  const csv = toCsv(result.rows, [
    { key: 'expense_date', label: 'date' },
    { key: 'description', label: 'description' },
    { key: 'category', label: 'category' },
    { key: 'paid_by', label: 'paid_by' },
    { key: 'amount', label: 'amount' },
    { key: 'currency', label: 'currency' },
    { key: 'exchange_rate', label: 'exchange_rate' },
    { key: 'base_amount', label: 'base_amount' },
    { key: 'split_type', label: 'split_type' },
    { key: 'participant_breakdown', label: 'participant_breakdown' },
    { key: 'id', label: 'expense_id' }
  ]);

  sendCsv(res, `${group.name.replace(/[^a-z0-9]+/gi, '_').toLowerCase()}_expenses.csv`, csv);
}

export async function createExpenseHandler(req, res) {
  const group = await getGroupById(req.params.groupId, req.user.id);
  if (!group) throw new ApiError(404, 'Group not found');
  const expense = await createExpense(
    { ...req.body, groupId: group.id, baseCurrency: group.base_currency },
    req.user.id
  );
  res.status(201).json({ expense });
}

export async function getExpenseHandler(req, res) {
  const expense = await getExpenseWithParticipants(req.params.expenseId);
  if (!expense?.id) throw new ApiError(404, 'Expense not found');
  const group = await getGroupById(expense.group_id, req.user.id);
  if (!group) throw new ApiError(404, 'Expense not found');
  res.json({ expense });
}

export async function updateExpenseHandler(req, res) {
  const expense = await getExpenseWithParticipants(req.params.expenseId);
  if (!expense?.id) throw new ApiError(404, 'Expense not found');
  const group = await getGroupById(expense.group_id, req.user.id);
  if (!group) throw new ApiError(404, 'Expense not found');
  const baseCurrency = group.base_currency;
  const updated = await updateExpense(req.params.expenseId, { ...req.body, groupId: expense.group_id, baseCurrency }, req.user.id);
  res.json({ expense: updated });
}

export async function deleteExpenseHandler(req, res) {
  const expense = await getExpenseWithParticipants(req.params.expenseId);
  if (!expense?.id) throw new ApiError(404, 'Expense not found');
  const group = await getGroupById(expense.group_id, req.user.id);
  if (!group) throw new ApiError(404, 'Expense not found');
  await deleteExpense(req.params.expenseId, req.user.id);
  res.status(204).send();
}
