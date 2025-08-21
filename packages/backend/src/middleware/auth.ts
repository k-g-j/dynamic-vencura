import { Request, Response, NextFunction } from 'express';
import jwt, { JsonWebTokenError, TokenExpiredError, NotBeforeError } from 'jsonwebtoken';
import { env } from '../config/env';
import { AppDataSource } from '../config/database';
import { User } from '../entities/User';
import { Logger } from '../utils/logger';
import {
  AuthenticationError,
  AuthorizationError,
  ErrorCode,
  formatErrorResponse,
} from '../utils/errors';

/**
 * Extended Express Request interface for authenticated routes
 * 
 * Adds authentication context to standard Express Request:
 * - user: Authenticated user information from JWT token
 * - correlationId: Unique request identifier for tracing
 * - logger: Request-scoped logger with correlation ID
 * 
 * @interface AuthRequest
 * @extends Request
 */
export interface AuthRequest extends Request {
  /** Authenticated user details extracted from JWT token */
  user?: {
    /** Internal user ID (UUID) */
    id: string;
    /** User email address */
    email: string;
    /** Dynamic SDK user identifier */
    dynamicUserId: string;
  };
  /** Unique request identifier for distributed tracing */
  correlationId?: string;
  /** Request-scoped logger with correlation context */
  logger?: Logger;
}

/**
 * Express middleware for JWT token authentication
 * 
 * Validates Bearer tokens in the Authorization header and attaches
 * authenticated user context to the request object. Implements comprehensive
 * security validations:
 * 
 * Authentication Flow:
 * 1. Extract Bearer token from Authorization header
 * 2. Verify JWT signature and expiration
 * 3. Decode user claims from token payload
 * 4. Validate user exists in database
 * 5. Attach user context to request object
 * 6. Log authentication event for audit
 * 
 * Security Features:
 * - JWT signature verification using HMAC SHA-256
 * - Token expiration validation
 * - User existence verification in database
 * - Structured error responses with correlation IDs
 * - Comprehensive audit logging
 * - Rate limiting protection (applied at route level)
 * 
 * @param req - Express request object (will be extended to AuthRequest)
 * @param res - Express response object
 * @param next - Next middleware function
 * @returns Promise<void>
 * 
 * @throws {AuthenticationError} When token is missing, invalid, or expired
 * @throws {AuthorizationError} When user is not found in database
 * 
 * @example
 * ```typescript
 * // Apply to protected routes
 * router.use('/api/wallets', authenticateUser);
 * 
 * // Or individual routes
 * router.get('/protected', authenticateUser, handler);
 * ```
 */
export async function authenticateUser(
  req: AuthRequest,
  res: Response,
  next: NextFunction
): Promise<void> {
  const logger = req.logger || new Logger(req.correlationId);
  
  try {
    const authHeader = req.headers.authorization;
    
    // Check for Authorization header with Bearer token
    if (!authHeader) {
      const error = new AuthenticationError(
        'Authorization header missing',
        ErrorCode.UNAUTHORIZED
      );
      logger.logAuth('authentication_failed', undefined, {
        reason: 'missing_header',
        userAgent: req.headers['user-agent'],
        ip: req.ip,
      });
      const errorResponse = formatErrorResponse(error, logger.correlationId);
      res.status(error.statusCode).json(errorResponse);
      return;
    }

    if (!authHeader.startsWith('Bearer ')) {
      const error = new AuthenticationError(
        'Invalid authorization header format. Expected: Bearer <token>',
        ErrorCode.UNAUTHORIZED
      );
      logger.logAuth('authentication_failed', undefined, {
        reason: 'invalid_format',
        authHeaderLength: authHeader.length,
      });
      const errorResponse = formatErrorResponse(error, logger.correlationId);
      res.status(error.statusCode).json(errorResponse);
      return;
    }

    const token = authHeader.substring(7); // Remove 'Bearer ' prefix
    
    if (!token.trim()) {
      const error = new AuthenticationError(
        'Empty token provided',
        ErrorCode.UNAUTHORIZED
      );
      logger.logAuth('authentication_failed', undefined, {
        reason: 'empty_token',
      });
      const errorResponse = formatErrorResponse(error, logger.correlationId);
      res.status(error.statusCode).json(errorResponse);
      return;
    }

    let decoded: {
      userId: string;
      email: string;
      dynamicUserId: string;
      iat?: number;
      exp?: number;
    };

    try {
      // Verify JWT token with our secret
      decoded = jwt.verify(token, env.JWT_SECRET) as typeof decoded;
    } catch (jwtError) {
      let errorCode = ErrorCode.INVALID_TOKEN;
      let message = 'Invalid token';
      
      if (jwtError instanceof TokenExpiredError) {
        errorCode = ErrorCode.TOKEN_EXPIRED;
        message = 'Token has expired';
      } else if (jwtError instanceof JsonWebTokenError) {
        message = 'Malformed token';
      } else if (jwtError instanceof NotBeforeError) {
        message = 'Token not yet valid';
      }

      const error = new AuthenticationError(message, errorCode);
      logger.logAuth('authentication_failed', undefined, {
        reason: 'jwt_verification_failed',
        jwtError: jwtError instanceof Error ? jwtError.message : 'Unknown JWT error',
        tokenLength: token.length,
      });
      const errorResponse = formatErrorResponse(error, logger.correlationId);
      res.status(error.statusCode).json(errorResponse);
      return;
    }

    // Validate required token claims
    if (!decoded.userId || !decoded.email || !decoded.dynamicUserId) {
      const error = new AuthenticationError(
        'Token missing required claims',
        ErrorCode.INVALID_TOKEN
      );
      logger.logAuth('authentication_failed', decoded.userId, {
        reason: 'missing_claims',
        hasUserId: !!decoded.userId,
        hasEmail: !!decoded.email,
        hasDynamicUserId: !!decoded.dynamicUserId,
      });
      const errorResponse = formatErrorResponse(error, logger.correlationId);
      res.status(error.statusCode).json(errorResponse);
      return;
    }

    // Verify user exists in database
    const userRepository = AppDataSource.getRepository(User);
    const user = await userRepository.findOne({
      where: { id: decoded.userId },
      select: ['id', 'email', 'dynamicUserId', 'createdAt', 'updatedAt'],
    });

    if (!user) {
      const error = new AuthorizationError(
        'User account not found or deactivated',
        ErrorCode.USER_NOT_FOUND
      );
      logger.logAuth('authorization_failed', decoded.userId, {
        reason: 'user_not_found',
        tokenEmail: decoded.email,
      });
      const errorResponse = formatErrorResponse(error, logger.correlationId);
      res.status(error.statusCode).json(errorResponse);
      return;
    }

    // Verify email consistency (detect token reuse after email change)
    if (user.email !== decoded.email) {
      const error = new AuthenticationError(
        'Token email mismatch - please re-authenticate',
        ErrorCode.INVALID_TOKEN
      );
      logger.logAuth('authentication_failed', user.id, {
        reason: 'email_mismatch',
        tokenEmail: decoded.email,
        currentEmail: user.email,
      });
      const errorResponse = formatErrorResponse(error, logger.correlationId);
      res.status(error.statusCode).json(errorResponse);
      return;
    }

    // Attach authenticated user to request
    req.user = {
      id: user.id,
      email: user.email,
      dynamicUserId: user.dynamicUserId,
    };

    // Log successful authentication
    logger.logAuth('authentication_success', user.id, {
      tokenAge: decoded.iat ? Date.now() / 1000 - decoded.iat : undefined,
      tokenExpiry: decoded.exp,
    });

    next();
  } catch (error) {
    // Catch any unexpected errors during authentication
    logger.error('Unexpected authentication error', error, {
      hasAuthHeader: !!req.headers.authorization,
      userAgent: req.headers['user-agent'],
      ip: req.ip,
    });
    
    const errorResponse = formatErrorResponse(error, logger.correlationId);
    res.status(500).json(errorResponse);
  }
}

/**
 * Generate JWT token for authenticated user session
 * 
 * Creates a signed JWT token containing user claims for authentication.
 * The token includes essential user information and is signed with HMAC SHA-256
 * using the server's JWT secret.
 * 
 * Token Claims:
 * - userId: Internal user ID (UUID) for database queries
 * - email: User email address for verification
 * - dynamicUserId: Dynamic SDK user identifier for integration
 * - iat: Issued at timestamp (automatically added by JWT library)
 * - exp: Expiration timestamp (7 days from issue)
 * 
 * Security Considerations:
 * - 7-day expiration balances security with user experience
 * - Token should be stored securely on client (httpOnly cookie preferred)
 * - Token contains no sensitive data (passwords, private keys, etc.)
 * - Email is included to detect account changes requiring re-authentication
 * 
 * @param user - User entity or user-like object with required fields
 * @returns Signed JWT token string
 * 
 * @example
 * ```typescript
 * const token = generateToken(user);
 * res.cookie('auth-token', token, { 
 *   httpOnly: true, 
 *   secure: true, 
 *   sameSite: 'strict' 
 * });
 * ```
 */
export function generateToken(
  user: User | { id: string; email: string; dynamicUserId: string }
): string {
  // Create JWT payload with user claims
  const payload = {
    userId: user.id,
    email: user.email,
    dynamicUserId: user.dynamicUserId,
  };

  // Sign token with 7-day expiration
  return jwt.sign(payload, env.JWT_SECRET, {
    expiresIn: '7d',
    algorithm: 'HS256', // Explicitly specify algorithm
    issuer: 'vencura-backend',
    audience: 'vencura-client',
  });
}

/**
 * Verify and decode JWT token without database lookup
 * 
 * Utility function to verify token signature and extract claims
 * without performing database validation. Useful for token introspection
 * and debugging.
 * 
 * @param token - JWT token string to verify
 * @returns Decoded token payload or null if invalid
 * 
 * @example
 * ```typescript
 * const payload = verifyTokenOnly(tokenString);
 * if (payload) {
 *   console.log('Token valid for user:', payload.userId);
 * }
 * ```
 */
export function verifyTokenOnly(
  token: string
): { userId: string; email: string; dynamicUserId: string; iat: number; exp: number } | null {
  try {
    return jwt.verify(token, env.JWT_SECRET) as {
      userId: string;
      email: string;
      dynamicUserId: string;
      iat: number;
      exp: number;
    };
  } catch {
    return null;
  }
}