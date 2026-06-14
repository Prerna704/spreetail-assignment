import express from 'express';
import cors from 'cors';
import helmet from 'helmet';
import rateLimit from 'express-rate-limit';
import { env } from './config/env.js';
import { requireAuth } from './middleware/auth.js';
import { errorHandler, notFoundHandler } from './middleware/errorHandler.js';
import { authRoutes } from './routes/authRoutes.js';
import { groupRoutes } from './routes/groupRoutes.js';
import { expenseRoutes } from './routes/expenseRoutes.js';
import { settlementRoutes } from './routes/settlementRoutes.js';
import { balanceRoutes } from './routes/balanceRoutes.js';
import { importRoutes } from './routes/importRoutes.js';
import { systemRoutes } from './routes/systemRoutes.js';

export const app = express();

app.use(helmet());
app.use(cors({ origin: env.CORS_ORIGIN, credentials: true }));
app.use(express.json({ limit: '1mb' }));
app.use(rateLimit({ windowMs: 60 * 1000, limit: 120 }));

app.get('/health', (_req, res) => res.json({ status: 'ok' }));
app.use('/api/auth', authRoutes);
app.use('/api/groups', requireAuth, groupRoutes);
app.use('/api', requireAuth, expenseRoutes);
app.use('/api', requireAuth, settlementRoutes);
app.use('/api', requireAuth, balanceRoutes);
app.use('/api', requireAuth, importRoutes);
app.use('/api', requireAuth, systemRoutes);

app.use(notFoundHandler);
app.use(errorHandler);
