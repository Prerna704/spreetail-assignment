export async function writeAudit(client, { actorId, entityType, entityId, action, beforeState, afterState, metadata = {} }) {
  await client.query(
    `INSERT INTO audit_logs (actor_id, entity_type, entity_id, action, before_state, after_state, metadata)
     VALUES ($1, $2, $3, $4, $5, $6, $7)`,
    [actorId, entityType, entityId, action, beforeState ?? null, afterState ?? null, metadata]
  );
}
