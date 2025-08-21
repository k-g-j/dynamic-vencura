import { DataSource } from 'typeorm';
import { env } from './env';
import { User } from '../entities/User';
import { Wallet } from '../entities/Wallet';
import { Transaction } from '../entities/Transaction';
import { SignedMessage } from '../entities/SignedMessage';
import { AuditLog } from '../entities/AuditLog';

/**
 * TypeORM Data Source configuration for migrations
 * 
 * This configuration is used by TypeORM CLI for running migrations
 * in production environments. It ensures database schema consistency
 * across deployments.
 */
export const AppDataSource = new DataSource({
  type: 'postgres',
  url: env.DATABASE_URL,
  synchronize: false, // Never use synchronize in production
  logging: env.NODE_ENV === 'development',
  entities: [User, Wallet, Transaction, SignedMessage, AuditLog],
  migrations: ['dist/migrations/*.js'],
  subscribers: [],
  ssl: env.NODE_ENV === 'production' ? {
    rejectUnauthorized: false, // Required for Fly.io PostgreSQL
  } : false,
});

/**
 * CLI configuration for TypeORM
 * 
 * Usage:
 * - Generate migration: npm run migration:generate -- -n MigrationName
 * - Run migrations: npm run migration:run
 * - Revert migration: npm run migration:revert
 */
export default AppDataSource;