import dotenv from 'dotenv';
import { z } from 'zod';

dotenv.config();

const envSchema = z.object({
  NODE_ENV: z.enum(['development', 'production', 'test']).default('development'),
  PORT: z.string().default('3001'),
  DATABASE_URL: z.string().default('postgresql://postgres:postgres@localhost:5432/vencura'),
  JWT_SECRET: z.string().min(32),
  ENCRYPTION_KEY: z.string().min(32),
  SEPOLIA_RPC_URL: z.string().default('https://sepolia.infura.io/v3/63264d1583fd460d8aace681426f267c'),
  DYNAMIC_ENVIRONMENT_ID: z.string(),
  DYNAMIC_API_KEY: z.string().optional(),
  CORS_ORIGIN: z.string().default('http://localhost:3000'),
  RATE_LIMIT_WINDOW_MS: z.string().default('900000'),
  RATE_LIMIT_MAX_REQUESTS: z.string().default('100'),
  LOG_LEVEL: z.enum(['error', 'warn', 'info', 'debug']).default('info'),
});

const parseEnv = () => {
  try {
    return envSchema.parse(process.env);
  } catch (error) {
    if (process.env['NODE_ENV'] === 'test') {
      return {
        NODE_ENV: 'test' as const,
        PORT: '3001',
        DATABASE_URL: 'postgresql://postgres:postgres@localhost:5432/vencura_test',
        JWT_SECRET: 'test-jwt-secret-key-min-32-characters-long',
        ENCRYPTION_KEY: 'test-encryption-key-min-32-characters-long',
        SEPOLIA_RPC_URL: 'https://sepolia.infura.io/v3/test',
        DYNAMIC_ENVIRONMENT_ID: 'test-environment-id',
        DYNAMIC_API_KEY: undefined,
        CORS_ORIGIN: 'http://localhost:3000',
        RATE_LIMIT_WINDOW_MS: '900000',
        RATE_LIMIT_MAX_REQUESTS: '100',
        LOG_LEVEL: 'error' as const,
      };
    }
    if (error instanceof z.ZodError) {
      console.error('Environment variable validation failed:');
      error.errors.forEach((err) => {
        console.error(`  ${err.path.join('.')}: ${err.message}`);
      });
      process.exit(1);
    }
    throw error;
  }
};

export const env = parseEnv();