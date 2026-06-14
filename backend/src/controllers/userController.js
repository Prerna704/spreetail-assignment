import { searchUsers } from '../models/userModel.js';

export async function searchUsersHandler(req, res) {
  res.json({ users: await searchUsers(req.query.q || '') });
}
