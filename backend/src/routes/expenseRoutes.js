import { Router } from 'express';
import {
  createExpenseHandler,
  deleteExpenseHandler,
  exportGroupExpenses,
  getExpenseHandler,
  listGroupExpenses,
  updateExpenseHandler
} from '../controllers/expenseController.js';
import { validate } from '../middleware/validate.js';
import { expenseSchemas } from '../validators/schemas.js';
import { asyncHandler } from '../utils/asyncHandler.js';

export const expenseRoutes = Router();

expenseRoutes.get('/groups/:groupId/expenses', asyncHandler(listGroupExpenses));
expenseRoutes.get('/groups/:groupId/expenses/export.csv', asyncHandler(exportGroupExpenses));
expenseRoutes.post('/groups/:groupId/expenses', validate(expenseSchemas.create), asyncHandler(createExpenseHandler));
expenseRoutes.get('/expenses/:expenseId', asyncHandler(getExpenseHandler));
expenseRoutes.put('/expenses/:expenseId', validate(expenseSchemas.update), asyncHandler(updateExpenseHandler));
expenseRoutes.delete('/expenses/:expenseId', asyncHandler(deleteExpenseHandler));
