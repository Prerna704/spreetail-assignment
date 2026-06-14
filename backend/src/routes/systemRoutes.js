import { Router } from 'express';
import { listAuditLogs } from '../controllers/auditController.js';
import { createExchangeRate, listExchangeRates } from '../controllers/currencyController.js';
import { approveDuplicateRemoval, listDuplicateRequests, requestDuplicateRemoval } from '../controllers/duplicateController.js';
import { searchUsersHandler } from '../controllers/userController.js';
import { validate } from '../middleware/validate.js';
import { exchangeRateSchemas } from '../validators/schemas.js';
import { asyncHandler } from '../utils/asyncHandler.js';

export const systemRoutes = Router();

systemRoutes.get('/users', asyncHandler(searchUsersHandler));
systemRoutes.get('/audit-logs', asyncHandler(listAuditLogs));
systemRoutes.get('/exchange-rates', asyncHandler(listExchangeRates));
systemRoutes.post('/exchange-rates', validate(exchangeRateSchemas.create), asyncHandler(createExchangeRate));
systemRoutes.get('/duplicates', asyncHandler(listDuplicateRequests));
systemRoutes.post('/duplicates', asyncHandler(requestDuplicateRemoval));
systemRoutes.post('/duplicates/:requestId/approve', asyncHandler(approveDuplicateRemoval));
