import { query, withTransaction } from '../config/db.js';
import { writeAudit } from '../services/auditService.js';

export async function listGroupsForUser(userId) {
  const result = await query(
    `SELECT g.*, COUNT(gm_all.id)::INTEGER AS member_count
     FROM groups g
     JOIN group_members gm ON gm.group_id = g.id AND gm.user_id = $1
     LEFT JOIN group_members gm_all ON gm_all.group_id = g.id
     WHERE g.deleted_at IS NULL
     GROUP BY g.id
     ORDER BY g.created_at DESC`,
    [userId]
  );
  return result.rows;
}

export async function getGroupById(groupId, userId) {
  const result = await query(
    `SELECT g.*
     FROM groups g
     JOIN group_members gm ON gm.group_id = g.id AND gm.user_id = $2
     WHERE g.id = $1 AND g.deleted_at IS NULL`,
    [groupId, userId]
  );
  return result.rows[0];
}

export async function getGroupMembers(groupId) {
  const result = await query(
    `SELECT gm.*, u.name, u.email
     FROM group_members gm
     JOIN users u ON u.id = gm.user_id
     WHERE gm.group_id = $1
     ORDER BY gm.join_date, u.name`,
    [groupId]
  );
  return result.rows;
}

export async function assertActiveMember(client, groupId, userId, onDate) {
  const result = await client.query(
    `SELECT 1
     FROM group_members
     WHERE group_id = $1
       AND user_id = $2
       AND join_date <= $3
       AND (leave_date IS NULL OR leave_date >= $3)`,
    [groupId, userId, onDate]
  );
  return result.rowCount > 0;
}

export async function createGroup({ name, baseCurrency, userId }) {
  return withTransaction(async (client) => {
    const groupResult = await client.query(
      `INSERT INTO groups (name, base_currency, created_by)
       VALUES ($1, $2, $3)
       RETURNING *`,
      [name, baseCurrency, userId]
    );
    const group = groupResult.rows[0];

    await client.query(
      `INSERT INTO group_members (group_id, user_id, join_date, role)
       VALUES ($1, $2, CURRENT_DATE, 'owner')`,
      [group.id, userId]
    );
    await writeAudit(client, {
      actorId: userId,
      entityType: 'group',
      entityId: group.id,
      action: 'CREATE',
      afterState: group
    });
    return group;
  });
}

export async function updateGroup({ groupId, userId, patch }) {
  return withTransaction(async (client) => {
    const before = await client.query('SELECT * FROM groups WHERE id = $1 AND deleted_at IS NULL', [groupId]);
    const result = await client.query(
      `UPDATE groups
       SET name = COALESCE($1, name),
           base_currency = COALESCE($2, base_currency),
           updated_at = NOW()
       WHERE id = $3 AND deleted_at IS NULL
       RETURNING *`,
      [patch.name ?? null, patch.baseCurrency ?? null, groupId]
    );
    await writeAudit(client, {
      actorId: userId,
      entityType: 'group',
      entityId: groupId,
      action: 'UPDATE',
      beforeState: before.rows[0],
      afterState: result.rows[0]
    });
    return result.rows[0];
  });
}

export async function deleteGroup({ groupId, userId }) {
  return withTransaction(async (client) => {
    const before = await client.query('SELECT * FROM groups WHERE id = $1 AND deleted_at IS NULL', [groupId]);
    const result = await client.query(
      `UPDATE groups SET deleted_at = NOW(), updated_at = NOW()
       WHERE id = $1 AND deleted_at IS NULL RETURNING *`,
      [groupId]
    );
    await writeAudit(client, {
      actorId: userId,
      entityType: 'group',
      entityId: groupId,
      action: 'DELETE',
      beforeState: before.rows[0],
      afterState: result.rows[0]
    });
    return result.rows[0];
  });
}

export async function addMember({ groupId, targetUserId, joinDate, actorId }) {
  return withTransaction(async (client) => {
    const result = await client.query(
      `INSERT INTO group_members (group_id, user_id, join_date)
       VALUES ($1, $2, $3)
       ON CONFLICT (group_id, user_id)
       DO UPDATE SET join_date = EXCLUDED.join_date, leave_date = NULL, updated_at = NOW()
       RETURNING *`,
      [groupId, targetUserId, joinDate]
    );
    await writeAudit(client, {
      actorId,
      entityType: 'group_member',
      entityId: result.rows[0].id,
      action: 'UPDATE',
      afterState: result.rows[0]
    });
    return result.rows[0];
  });
}

export async function removeMember({ groupId, targetUserId, leaveDate, actorId }) {
  return withTransaction(async (client) => {
    const before = await client.query(
      'SELECT * FROM group_members WHERE group_id = $1 AND user_id = $2',
      [groupId, targetUserId]
    );
    const result = await client.query(
      `UPDATE group_members
       SET leave_date = $1, updated_at = NOW()
       WHERE group_id = $2 AND user_id = $3
       RETURNING *`,
      [leaveDate, groupId, targetUserId]
    );
    await writeAudit(client, {
      actorId,
      entityType: 'group_member',
      entityId: result.rows[0].id,
      action: 'UPDATE',
      beforeState: before.rows[0],
      afterState: result.rows[0]
    });
    return result.rows[0];
  });
}
