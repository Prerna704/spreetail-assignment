import { Router } from 'express';
import { exportReport, getReport, uploadExpenseCsv } from '../controllers/importController.js';
import { uploadCsv } from '../middleware/upload.js';
import { asyncHandler } from '../utils/asyncHandler.js';

export const importRoutes = Router();

importRoutes.post('/groups/:groupId/imports/csv', uploadCsv.single('file'), asyncHandler(uploadExpenseCsv));
importRoutes.get('/imports/:importId/report', asyncHandler(getReport));
importRoutes.get('/imports/:importId/report.csv', asyncHandler(exportReport));
