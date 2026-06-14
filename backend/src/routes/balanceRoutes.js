import { Router } from 'express';
import { getGroupBalances } from '../controllers/balanceController.js';
import { asyncHandler } from '../utils/asyncHandler.js';

export const balanceRoutes = Router();

balanceRoutes.get('/groups/:groupId/balances', asyncHandler(getGroupBalances));
