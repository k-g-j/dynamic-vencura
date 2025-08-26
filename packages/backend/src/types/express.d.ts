import { Request as ExpressRequest } from 'express';

declare global {
  namespace Express {
    interface Request {
      correlationId?: string;
      user?: {
        id: string;
        email: string;
        dynamicUserId: string;
      };
    }
  }
}

export interface JWKSHeader {
  kid: string;
  alg?: string;
}

export interface JWKSCallback {
  (error: Error | null, key?: string): void;
}

export interface LogContext {
  correlationId?: string;
  userId?: string;
  service?: string;
  [key: string]: unknown;
}

export interface SensitiveData {
  password?: string;
  token?: string;
  privateKey?: string;
  encryptedPrivateKey?: string;
  [key: string]: unknown;
}

export interface TransactionDetails {
  to?: string;
  amount?: string;
  gasLimit?: number;
  gasPrice?: string;
  [key: string]: unknown;
}

export interface WebSocketMessage {
  type: string;
  payload: unknown;
}

export interface ErrorDetails {
  field?: string;
  reason?: string;
  code?: string;
  [key: string]: unknown;
}