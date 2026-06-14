import { Router } from 'express';
import {
  createSettlementHandler,
  deleteSettlementHandler,
  listGroupSettlements
} from '../controllers/settlementController.js';
import { validate } from '../middleware/validate.js';
import { settlementSchemas } from '../validators/schemas.js';
import { asyncHandler } from '../utils/asyncHandler.js';

export const settlementRoutes = Router();

settlementRoutes.get('/groups/:groupId/settlements', asyncHandler(listGroupSettlements));
settlementRoutes.post('/groups/:groupId/settlements', validate(settlementSchemas.create), asyncHandler(createSettlementHandler));
settlementRoutes.delete('/settlements/:settlementId', asyncHandler(deleteSettlementHandler));
