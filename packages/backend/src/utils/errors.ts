/**
 * Custom error classes for improved error handling and debugging
 * 
 * Provides structured error responses with:
 * - Specific error codes for client handling
 * - Detailed messages for debugging
 * - Stack traces in development
 * - Request context for tracing
 */

export enum ErrorCode {
  // Authentication errors (401)
  UNAUTHORIZED = 'UNAUTHORIZED',
  INVALID_TOKEN = 'INVALID_TOKEN',
  TOKEN_EXPIRED = 'TOKEN_EXPIRED',
  DYNAMIC_AUTH_FAILED = 'DYNAMIC_AUTH_FAILED',
  
  // Authorization errors (403)
  FORBIDDEN = 'FORBIDDEN',
  WALLET_ACCESS_DENIED = 'WALLET_ACCESS_DENIED',
  
  // Validation errors (400)
  VALIDATION_ERROR = 'VALIDATION_ERROR',
  INVALID_ADDRESS = 'INVALID_ADDRESS',
  INVALID_AMOUNT = 'INVALID_AMOUNT',
  INSUFFICIENT_BALANCE = 'INSUFFICIENT_BALANCE',
  
  // Resource errors (404)
  NOT_FOUND = 'NOT_FOUND',
  WALLET_NOT_FOUND = 'WALLET_NOT_FOUND',
  USER_NOT_FOUND = 'USER_NOT_FOUND',
  TRANSACTION_NOT_FOUND = 'TRANSACTION_NOT_FOUND',
  
  // Blockchain errors (502)
  BLOCKCHAIN_ERROR = 'BLOCKCHAIN_ERROR',
  TRANSACTION_FAILED = 'TRANSACTION_FAILED',
  GAS_ESTIMATION_FAILED = 'GAS_ESTIMATION_FAILED',
  NETWORK_ERROR = 'NETWORK_ERROR',
  
  // Server errors (500)
  INTERNAL_ERROR = 'INTERNAL_ERROR',
  DATABASE_ERROR = 'DATABASE_ERROR',
  ENCRYPTION_ERROR = 'ENCRYPTION_ERROR',
  DECRYPTION_ERROR = 'DECRYPTION_ERROR',
  
  // Rate limiting (429)
  RATE_LIMIT_EXCEEDED = 'RATE_LIMIT_EXCEEDED',
}

export class AppError extends Error {
  public readonly code: ErrorCode;
  public readonly statusCode: number;
  public readonly details?: any;
  public readonly correlationId: string | undefined;

  constructor(
    code: ErrorCode,
    message: string,
    statusCode: number = 500,
    details?: any,
    correlationId?: string
  ) {
    super(message);
    this.name = 'AppError';
    this.code = code;
    this.statusCode = statusCode;
    this.details = details;
    this.correlationId = correlationId;
    
    // Maintain proper stack trace
    Error.captureStackTrace(this, this.constructor);
  }
}

export class AuthenticationError extends AppError {
  constructor(message: string = 'Authentication failed', code: ErrorCode = ErrorCode.UNAUTHORIZED, details?: any) {
    super(code, message, 401, details);
    this.name = 'AuthenticationError';
  }
}

export class AuthorizationError extends AppError {
  constructor(message: string = 'Access denied', code: ErrorCode = ErrorCode.FORBIDDEN, details?: any) {
    super(code, message, 403, details);
    this.name = 'AuthorizationError';
  }
}

export class ValidationError extends AppError {
  constructor(message: string, details?: any) {
    super(ErrorCode.VALIDATION_ERROR, message, 400, details);
    this.name = 'ValidationError';
  }
}

export class NotFoundError extends AppError {
  constructor(resource: string, id?: string) {
    const message = id 
      ? `${resource} with ID '${id}' not found`
      : `${resource} not found`;
    super(ErrorCode.NOT_FOUND, message, 404, { resource, id });
    this.name = 'NotFoundError';
  }
}

export class BlockchainError extends AppError {
  constructor(message: string, code: ErrorCode = ErrorCode.BLOCKCHAIN_ERROR, details?: any) {
    super(code, message, 502, details);
    this.name = 'BlockchainError';
  }
}

export class InsufficientBalanceError extends AppError {
  constructor(required: string, available: string, walletAddress: string) {
    const message = `Insufficient balance in wallet ${walletAddress}. Required: ${required} wei, Available: ${available} wei`;
    super(ErrorCode.INSUFFICIENT_BALANCE, message, 400, { required, available, walletAddress });
    this.name = 'InsufficientBalanceError';
  }
}

export class DatabaseError extends AppError {
  constructor(message: string, details?: any) {
    super(ErrorCode.DATABASE_ERROR, message, 500, details);
    this.name = 'DatabaseError';
  }
}

export class EncryptionError extends AppError {
  constructor(message: string = 'Encryption operation failed', details?: any) {
    super(ErrorCode.ENCRYPTION_ERROR, message, 500, details);
    this.name = 'EncryptionError';
  }
}

export class DecryptionError extends AppError {
  constructor(message: string = 'Decryption operation failed', details?: any) {
    super(ErrorCode.DECRYPTION_ERROR, message, 500, details);
    this.name = 'DecryptionError';
  }
}

export class RateLimitError extends AppError {
  constructor(message: string = 'Rate limit exceeded', retryAfter?: number) {
    super(ErrorCode.RATE_LIMIT_EXCEEDED, message, 429, { retryAfter });
    this.name = 'RateLimitError';
  }
}

/**
 * Type guard to check if error is an AppError
 */
export function isAppError(error: unknown): error is AppError {
  return error instanceof AppError;
}

/**
 * Format error for API response
 */
export function formatErrorResponse(error: unknown, correlationId?: string) {
  if (isAppError(error)) {
    return {
      error: error.code,
      message: error.message,
      statusCode: error.statusCode,
      correlationId: error.correlationId || correlationId,
      ...(process.env['NODE_ENV'] === 'development' && { 
        details: error.details,
        stack: error.stack 
      }),
    };
  }

  // Generic error handling
  const genericError = error as Error;
  return {
    error: ErrorCode.INTERNAL_ERROR,
    message: process.env['NODE_ENV'] === 'production' 
      ? 'An unexpected error occurred' 
      : genericError.message || 'Unknown error',
    statusCode: 500,
    correlationId,
    ...(process.env['NODE_ENV'] === 'development' && { 
      stack: genericError.stack 
    }),
  };
}