import { ApiError } from '../utils/ApiError.js';
import { findUserByEmail } from '../models/userModel.js';
import {
  addMember,
  createGroup,
  deleteGroup,
  getGroupById,
  getGroupMembers,
  listGroupsForUser,
  removeMember,
  updateGroup
} from '../models/groupModel.js';

async function resolveTargetUser(body) {
  if (body.userId) {
    return body.userId;
  }
  const user = await findUserByEmail(body.email);
  if (!user) {
    throw new ApiError(404, 'User with this email is not registered');
  }
  return user.id;
}

export async function listGroups(req, res) {
  res.json({ groups: await listGroupsForUser(req.user.id) });
}

export async function createGroupHandler(req, res) {
  const group = await createGroup({
    name: req.body.name,
    baseCurrency: req.body.baseCurrency,
    userId: req.user.id
  });
  res.status(201).json({ group });
}

export async function getGroup(req, res) {
  const group = await getGroupById(req.params.groupId, req.user.id);
  if (!group) throw new ApiError(404, 'Group not found');
  const members = await getGroupMembers(group.id);
  res.json({ group, members });
}

export async function updateGroupHandler(req, res) {
  const group = await getGroupById(req.params.groupId, req.user.id);
  if (!group) throw new ApiError(404, 'Group not found');
  res.json({ group: await updateGroup({ groupId: group.id, userId: req.user.id, patch: req.body }) });
}

export async function deleteGroupHandler(req, res) {
  const group = await getGroupById(req.params.groupId, req.user.id);
  if (!group) throw new ApiError(404, 'Group not found');
  await deleteGroup({ groupId: group.id, userId: req.user.id });
  res.status(204).send();
}

export async function addMemberHandler(req, res) {
  const group = await getGroupById(req.params.groupId, req.user.id);
  if (!group) throw new ApiError(404, 'Group not found');
  const targetUserId = await resolveTargetUser(req.body);
  const member = await addMember({
    groupId: group.id,
    targetUserId,
    joinDate: req.body.joinDate ?? new Date().toISOString().slice(0, 10),
    actorId: req.user.id
  });
  res.status(201).json({ member });
}

export async function removeMemberHandler(req, res) {
  const group = await getGroupById(req.params.groupId, req.user.id);
  if (!group) throw new ApiError(404, 'Group not found');
  const targetUserId = await resolveTargetUser(req.body);
  const member = await removeMember({
    groupId: group.id,
    targetUserId,
    leaveDate: req.body.leaveDate ?? new Date().toISOString().slice(0, 10),
    actorId: req.user.id
  });
  res.json({ member });
}
