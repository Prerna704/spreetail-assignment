import bcrypt from 'bcryptjs';
import jwt from 'jsonwebtoken';
import { env } from '../config/env.js';
import { ApiError } from '../utils/ApiError.js';
import { createUser, findUserByEmail } from '../models/userModel.js';

function signToken(user) {
  return jwt.sign({ sub: user.id, email: user.email }, env.JWT_SECRET, {
    expiresIn: env.JWT_EXPIRES_IN
  });
}

export async function register(req, res) {
  const existing = await findUserByEmail(req.body.email);
  if (existing) {
    throw new ApiError(409, 'Email is already registered');
  }
  const passwordHash = await bcrypt.hash(req.body.password, 12);
  const user = await createUser({ ...req.body, passwordHash });
  res.status(201).json({ user, token: signToken(user) });
}

export async function login(req, res) {
  const user = await findUserByEmail(req.body.email);
  if (!user) {
    throw new ApiError(401, 'Invalid email or password');
  }
  const isValid = await bcrypt.compare(req.body.password, user.password_hash);
  if (!isValid) {
    throw new ApiError(401, 'Invalid email or password');
  }
  const publicUser = {
    id: user.id,
    name: user.name,
    email: user.email,
    created_at: user.created_at,
    updated_at: user.updated_at
  };
  res.json({ user: publicUser, token: signToken(user) });
}

export async function me(req, res) {
  res.json({ user: req.user });
}
