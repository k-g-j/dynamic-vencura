import {
  AppError,
  AuthenticationError,
  AuthorizationError,
  ValidationError,
  NotFoundError,
  BlockchainError,
  InsufficientBalanceError,
  DatabaseError,
  EncryptionError,
  DecryptionError,
  RateLimitError,
  ErrorCode,
  isAppError,
  formatErrorResponse,
} from '../errors';

describe('Error Classes', () => {
  describe('AppError', () => {
    it('should create app error with all properties', () => {
      const error = new AppError(
        ErrorCode.INTERNAL_ERROR,
        'Test error',
        500,
        { detail: 'test' },
        'correlation-123'
      );

      expect(error.code).toBe(ErrorCode.INTERNAL_ERROR);
      expect(error.message).toBe('Test error');
      expect(error.statusCode).toBe(500);
      expect(error.details).toEqual({ detail: 'test' });
      expect(error.correlationId).toBe('correlation-123');
      expect(error.name).toBe('AppError');
    });

    it('should capture stack trace', () => {
      const error = new AppError(ErrorCode.INTERNAL_ERROR, 'Test');
      expect(error.stack).toBeDefined();
      expect(error.stack).toContain('AppError');
    });
  });

  describe('AuthenticationError', () => {
    it('should create with default values', () => {
      const error = new AuthenticationError();
      
      expect(error.code).toBe(ErrorCode.UNAUTHORIZED);
      expect(error.message).toBe('Authentication failed');
      expect(error.statusCode).toBe(401);
      expect(error.name).toBe('AuthenticationError');
    });

    it('should accept custom message and code', () => {
      const error = new AuthenticationError(
        'Token expired',
        ErrorCode.TOKEN_EXPIRED,
        { expiredAt: '2024-01-01' }
      );
      
      expect(error.code).toBe(ErrorCode.TOKEN_EXPIRED);
      expect(error.message).toBe('Token expired');
      expect(error.details).toEqual({ expiredAt: '2024-01-01' });
    });
  });

  describe('AuthorizationError', () => {
    it('should create with default values', () => {
      const error = new AuthorizationError();
      
      expect(error.code).toBe(ErrorCode.FORBIDDEN);
      expect(error.message).toBe('Access denied');
      expect(error.statusCode).toBe(403);
      expect(error.name).toBe('AuthorizationError');
    });

    it('should accept custom values', () => {
      const error = new AuthorizationError(
        'Wallet access denied',
        ErrorCode.WALLET_ACCESS_DENIED,
        { walletId: 'wallet-123' }
      );
      
      expect(error.code).toBe(ErrorCode.WALLET_ACCESS_DENIED);
      expect(error.message).toBe('Wallet access denied');
    });
  });

  describe('ValidationError', () => {
    it('should create validation error', () => {
      const error = new ValidationError('Invalid input', {
        field: 'email',
        reason: 'invalid format',
      });
      
      expect(error.code).toBe(ErrorCode.VALIDATION_ERROR);
      expect(error.message).toBe('Invalid input');
      expect(error.statusCode).toBe(400);
      expect(error.details).toEqual({
        field: 'email',
        reason: 'invalid format',
      });
    });
  });

  describe('NotFoundError', () => {
    it('should create with resource and id', () => {
      const error = new NotFoundError('Wallet', 'wallet-123');
      
      expect(error.code).toBe(ErrorCode.NOT_FOUND);
      expect(error.message).toBe("Wallet with ID 'wallet-123' not found");
      expect(error.statusCode).toBe(404);
      expect(error.details).toEqual({
        resource: 'Wallet',
        id: 'wallet-123',
      });
    });

    it('should create with resource only', () => {
      const error = new NotFoundError('User');
      
      expect(error.message).toBe('User not found');
      expect(error.details).toEqual({
        resource: 'User',
        id: undefined,
      });
    });
  });

  describe('BlockchainError', () => {
    it('should create with default code', () => {
      const error = new BlockchainError('Network timeout');
      
      expect(error.code).toBe(ErrorCode.BLOCKCHAIN_ERROR);
      expect(error.message).toBe('Network timeout');
      expect(error.statusCode).toBe(502);
    });

    it('should accept custom code', () => {
      const error = new BlockchainError(
        'Gas estimation failed',
        ErrorCode.GAS_ESTIMATION_FAILED,
        { estimatedGas: null }
      );
      
      expect(error.code).toBe(ErrorCode.GAS_ESTIMATION_FAILED);
    });
  });

  describe('InsufficientBalanceError', () => {
    it('should format message with amounts', () => {
      const error = new InsufficientBalanceError(
        '1000000000000000000',
        '500000000000000000',
        '0x123abc'
      );
      
      expect(error.code).toBe(ErrorCode.INSUFFICIENT_BALANCE);
      expect(error.message).toBe(
        'Insufficient balance in wallet 0x123abc. Required: 1000000000000000000 wei, Available: 500000000000000000 wei'
      );
      expect(error.statusCode).toBe(400);
      expect(error.details).toEqual({
        required: '1000000000000000000',
        available: '500000000000000000',
        walletAddress: '0x123abc',
      });
    });
  });

  describe('DatabaseError', () => {
    it('should create database error', () => {
      const error = new DatabaseError('Connection failed', {
        host: 'localhost',
        port: 5432,
      });
      
      expect(error.code).toBe(ErrorCode.DATABASE_ERROR);
      expect(error.message).toBe('Connection failed');
      expect(error.statusCode).toBe(500);
    });
  });

  describe('EncryptionError', () => {
    it('should create with default message', () => {
      const error = new EncryptionError();
      
      expect(error.code).toBe(ErrorCode.ENCRYPTION_ERROR);
      expect(error.message).toBe('Encryption operation failed');
      expect(error.statusCode).toBe(500);
    });

    it('should accept custom message', () => {
      const error = new EncryptionError('Invalid key length');
      expect(error.message).toBe('Invalid key length');
    });
  });

  describe('DecryptionError', () => {
    it('should create with default message', () => {
      const error = new DecryptionError();
      
      expect(error.code).toBe(ErrorCode.DECRYPTION_ERROR);
      expect(error.message).toBe('Decryption operation failed');
      expect(error.statusCode).toBe(500);
    });
  });

  describe('RateLimitError', () => {
    it('should create with retry after', () => {
      const error = new RateLimitError('Too many requests', 60);
      
      expect(error.code).toBe(ErrorCode.RATE_LIMIT_EXCEEDED);
      expect(error.message).toBe('Too many requests');
      expect(error.statusCode).toBe(429);
      expect(error.details).toEqual({ retryAfter: 60 });
    });

    it('should create without retry after', () => {
      const error = new RateLimitError();
      
      expect(error.message).toBe('Rate limit exceeded');
      expect(error.details).toEqual({ retryAfter: undefined });
    });
  });
});

describe('Utility Functions', () => {
  describe('isAppError', () => {
    it('should return true for AppError instances', () => {
      const error = new AppError(ErrorCode.INTERNAL_ERROR, 'Test');
      expect(isAppError(error)).toBe(true);
    });

    it('should return true for derived error classes', () => {
      expect(isAppError(new AuthenticationError())).toBe(true);
      expect(isAppError(new ValidationError('Test'))).toBe(true);
      expect(isAppError(new NotFoundError('Resource'))).toBe(true);
    });

    it('should return false for regular errors', () => {
      expect(isAppError(new Error('Test'))).toBe(false);
      expect(isAppError('string error')).toBe(false);
      expect(isAppError(null)).toBe(false);
      expect(isAppError(undefined)).toBe(false);
    });
  });

  describe('formatErrorResponse', () => {
    const originalEnv = process.env['NODE_ENV'];

    afterEach(() => {
      process.env['NODE_ENV'] = originalEnv;
    });

    it('should format AppError in development', () => {
      process.env['NODE_ENV'] = 'development';
      
      const error = new ValidationError('Invalid email', {
        field: 'email',
      });
      
      const response = formatErrorResponse(error, 'corr-123');
      
      expect(response).toEqual({
        error: ErrorCode.VALIDATION_ERROR,
        message: 'Invalid email',
        statusCode: 400,
        correlationId: 'corr-123',
        details: { field: 'email' },
        stack: expect.stringContaining('ValidationError'),
      });
    });

    it('should format AppError in production', () => {
      process.env['NODE_ENV'] = 'production';
      
      const error = new ValidationError('Invalid email', {
        field: 'email',
      });
      
      const response = formatErrorResponse(error, 'corr-456');
      
      expect(response).toEqual({
        error: ErrorCode.VALIDATION_ERROR,
        message: 'Invalid email',
        statusCode: 400,
        correlationId: 'corr-456',
      });
      expect(response).not.toHaveProperty('details');
      expect(response).not.toHaveProperty('stack');
    });

    it('should format generic error in development', () => {
      process.env['NODE_ENV'] = 'development';
      
      const error = new Error('Something went wrong');
      const response = formatErrorResponse(error, 'corr-789');
      
      expect(response).toEqual({
        error: ErrorCode.INTERNAL_ERROR,
        message: 'Something went wrong',
        statusCode: 500,
        correlationId: 'corr-789',
        stack: expect.stringContaining('Error'),
      });
    });

    it('should format generic error in production', () => {
      process.env['NODE_ENV'] = 'production';
      
      const error = new Error('Database connection failed');
      const response = formatErrorResponse(error);
      
      expect(response).toEqual({
        error: ErrorCode.INTERNAL_ERROR,
        message: 'An unexpected error occurred',
        statusCode: 500,
        correlationId: undefined,
      });
    });

    it('should handle non-error objects', () => {
      process.env['NODE_ENV'] = 'development';
      
      const response = formatErrorResponse('string error');
      
      expect(response).toEqual({
        error: ErrorCode.INTERNAL_ERROR,
        message: 'Unknown error',
        statusCode: 500,
        correlationId: undefined,
      });
    });
  });
});