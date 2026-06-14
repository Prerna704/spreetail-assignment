import { ApiError } from '../utils/ApiError.js';
import { getGroupById } from '../models/groupModel.js';
import { calculateGroupBalances } from '../services/balanceService.js';

export async function getGroupBalances(req, res) {
  const group = await getGroupById(req.params.groupId, req.user.id);
  if (!group) throw new ApiError(404, 'Group not found');
  res.json({ balances: await calculateGroupBalances(group.id), currency: group.base_currency });
}
