import { Router } from 'express';
import { login, me, register } from '../controllers/authController.js';
import { requireAuth } from '../middleware/auth.js';
import { validate } from '../middleware/validate.js';
import { authSchemas } from '../validators/schemas.js';
import { asyncHandler } from '../utils/asyncHandler.js';

export const authRoutes = Router();

authRoutes.post('/register', validate(authSchemas.register), asyncHandler(register));
authRoutes.post('/login', validate(authSchemas.login), asyncHandler(login));
authRoutes.get('/me', requireAuth, asyncHandler(me));
