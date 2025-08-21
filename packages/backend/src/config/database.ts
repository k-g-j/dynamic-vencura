import { DataSource } from 'typeorm';
import { env } from './env';
import { User } from '../entities/User';
import { Wallet } from '../entities/Wallet';
import { Transaction } from '../entities/Transaction';
import { SignedMessage } from '../entities/SignedMessage';
import { AuditLog } from '../entities/AuditLog';

const isProduction = env.NODE_ENV === 'production';
const usePostgres = isProduction && env.DATABASE_URL && !env.DATABASE_URL.includes('localhost');

export const AppDataSource = new DataSource({
  type: usePostgres ? 'postgres' : 'better-sqlite3',
  database: usePostgres ? undefined : ':memory:',
  url: usePostgres ? env.DATABASE_URL : undefined,
  // Use synchronize for development, migrations for production
  synchronize: !isProduction,
  logging: env.NODE_ENV === 'development',
  entities: [User, Wallet, Transaction, SignedMessage, AuditLog],
  // Use compiled migrations in production, TypeScript in development
  migrations: isProduction ? ['dist/migrations/*.js'] : ['src/migrations/*.ts'],
  migrationsRun: isProduction, // Auto-run migrations in production
  subscribers: [],
  ssl: usePostgres ? { rejectUnauthorized: false } : false,
  extra: usePostgres ? {
    connectionTimeoutMillis: 10000,
    query_timeout: 10000,
    statement_timeout: 10000,
  } : undefined,
} as any);