import dotenv from 'dotenv';
import { z } from 'zod';

dotenv.config();

const envSchema = z.object({
  NODE_ENV: z.enum(['development', 'test', 'production']).default('development'),
  PORT: z.coerce.number().default(4000),
  DATABASE_URL: z.string().min(1).refine(
    (value) => !value.includes('user:password@'),
    'DATABASE_URL still has placeholder user:password credentials'
  ),
  JWT_SECRET: z.string().min(32).refine(
    (value) => value !== 'replace-with-a-long-random-secret',
    'JWT_SECRET must be changed from the example value'
  ),
  JWT_EXPIRES_IN: z.string().default('7d'),
  CORS_ORIGIN: z.string().default('http://localhost:5173')
});

export const env = envSchema.parse(process.env);
