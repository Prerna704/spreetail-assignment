import { query } from '../config/db.js';

const publicUserFields = 'id, name, email, created_at, updated_at';

export async function createUser({ name, email, passwordHash }) {
  const result = await query(
    `INSERT INTO users (name, email, password_hash)
     VALUES ($1, $2, $3)
     RETURNING ${publicUserFields}`,
    [name, email, passwordHash]
  );
  return result.rows[0];
}

export async function findUserByEmail(email) {
  const result = await query('SELECT * FROM users WHERE email = $1', [email]);
  return result.rows[0];
}

export async function findUserById(id) {
  const result = await query(`SELECT ${publicUserFields} FROM users WHERE id = $1`, [id]);
  return result.rows[0];
}

export async function searchUsers(searchTerm) {
  const result = await query(
    `SELECT ${publicUserFields}
     FROM users
     WHERE name ILIKE $1 OR email ILIKE $1
     ORDER BY name
     LIMIT 20`,
    [`%${searchTerm}%`]
  );
  return result.rows;
}
