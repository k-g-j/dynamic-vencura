import { DataSource } from 'typeorm';
import { env } from './env';
import { User } from '../entities/User';
import { Wallet } from '../entities/Wallet';
import { Transaction } from '../entities/Transaction';
import { SignedMessage } from '../entities/SignedMessage';

export const AppDataSource = new DataSource({
  type: 'postgres',
  url: env.DATABASE_URL,
  synchronize: env.NODE_ENV === 'development',
  logging: env.NODE_ENV === 'development',
  entities: [User, Wallet, Transaction, SignedMessage],
  migrations: ['src/migrations/*.ts'],
  subscribers: [],
  ssl: env.NODE_ENV === 'production' ? { rejectUnauthorized: false } : false,
});