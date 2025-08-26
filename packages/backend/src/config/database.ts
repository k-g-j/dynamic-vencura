import { DataSource, DataSourceOptions } from 'typeorm';
import { env } from './env';
import { User } from '../entities/User';
import { Wallet } from '../entities/Wallet';
import { Transaction } from '../entities/Transaction';
import { SignedMessage } from '../entities/SignedMessage';
import { AuditLog } from '../entities/AuditLog';

const isProduction = env.NODE_ENV === 'production';
const usePostgres = isProduction && env.DATABASE_URL && !env.DATABASE_URL.includes('localhost');

const dataSourceOptions: DataSourceOptions = usePostgres ? {
  type: 'postgres',
  url: env.DATABASE_URL,
  synchronize: !isProduction,
  logging: env.NODE_ENV === 'development',
  entities: [User, Wallet, Transaction, SignedMessage, AuditLog],
  migrations: isProduction ? ['dist/migrations/*.js'] : ['src/migrations/*.ts'],
  migrationsRun: isProduction,
  subscribers: [],
  ssl: { rejectUnauthorized: false },
  extra: {
    connectionTimeoutMillis: 10000,
    query_timeout: 10000,
    statement_timeout: 10000,
  },
} : {
  type: 'better-sqlite3',
  database: ':memory:',
  synchronize: !isProduction,
  logging: env.NODE_ENV === 'development',
  entities: [User, Wallet, Transaction, SignedMessage, AuditLog],
  migrations: isProduction ? ['dist/migrations/*.js'] : ['src/migrations/*.ts'],
  migrationsRun: isProduction,
  subscribers: [],
};

export const AppDataSource = new DataSource(dataSourceOptions);