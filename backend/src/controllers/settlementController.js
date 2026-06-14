import { ApiError } from '../utils/ApiError.js';
import { query } from '../config/db.js';
import { getGroupById } from '../models/groupModel.js';
import { createSettlement, deleteSettlement, listSettlements } from '../models/settlementModel.js';

export async function listGroupSettlements(req, res) {
  const group = await getGroupById(req.params.groupId, req.user.id);
  if (!group) throw new ApiError(404, 'Group not found');
  res.json({ settlements: await listSettlements(group.id) });
}

export async function createSettlementHandler(req, res) {
  const group = await getGroupById(req.params.groupId, req.user.id);
  if (!group) throw new ApiError(404, 'Group not found');
  const settlement = await createSettlement(
    { ...req.body, groupId: group.id, baseCurrency: group.base_currency },
    req.user.id
  );
  res.status(201).json({ settlement });
}

export async function deleteSettlementHandler(req, res) {
  const settlement = await query('SELECT group_id FROM settlements WHERE id = $1 AND deleted_at IS NULL', [req.params.settlementId]);
  if (!settlement.rows[0]) throw new ApiError(404, 'Settlement not found');
  const group = await getGroupById(settlement.rows[0].group_id, req.user.id);
  if (!group) throw new ApiError(404, 'Settlement not found');
  await deleteSettlement(req.params.settlementId, req.user.id);
  res.status(204).send();
}
