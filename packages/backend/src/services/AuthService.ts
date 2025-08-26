import { Repository } from 'typeorm';
import jwt from 'jsonwebtoken';
import jwksClient from 'jwks-rsa';
import { AppDataSource } from '../config/database';
import { User } from '../entities/User';
import { generateToken } from '../middleware/auth';
import { env } from '../config/env';
import { AuditService, AuditEventType } from './AuditService';
import { logger } from '../utils/logger';

interface DynamicUser {
  userId: string;
  email: string;
  verifiedCredentials?: Array<{
    address: string;
    chain: string;
  }>;
}

interface DynamicJWTPayload {
  sub: string;
  email?: string;
  verified_credentials?: Array<{
    address: string;
    chain: string;
  }>;
}

/**
 * Authentication service for Dynamic SDK integration
 * 
 * Handles user authentication flow:
 * 1. Verifies Dynamic JWT tokens using JWKS
 * 2. Creates or retrieves user accounts
 * 3. Issues internal JWT tokens for API access
 */
export class AuthService {
  private userRepository: Repository<User>;
  private auditService: AuditService;

  constructor() {
    this.userRepository = AppDataSource.getRepository(User);
    this.auditService = AuditService.getInstance();
  }

  async authenticateWithDynamic(dynamicUser: DynamicUser): Promise<{ user: User; token: string }> {
    let user = await this.userRepository.findOne({
      where: { dynamicUserId: dynamicUser.userId },
    });

    if (!user) {
      user = this.userRepository.create({
        email: dynamicUser.email,
        dynamicUserId: dynamicUser.userId,
      });
      user = await this.userRepository.save(user);
      
      await this.auditService.logAuthEvent(
        AuditEventType.AUTH_LOGIN_SUCCESS,
        user.id,
        { newUser: true, email: user.email }
      );
    } else {
      await this.auditService.logAuthEvent(
        AuditEventType.AUTH_LOGIN_SUCCESS,
        user.id,
        { newUser: false, email: user.email }
      );
    }

    const token = generateToken(user);

    return { user, token };
  }

  /**
   * Verifies Dynamic JWT token using JWKS endpoint
   * 
   * Security flow:
   * 1. Fetch public keys from Dynamic's JWKS endpoint
   * 2. Verify JWT signature using RS256 algorithm
   * 3. Extract user information from verified payload
   * 4. Handle verification failures gracefully
   * 
   * @param token - JWT token from Dynamic SDK
   * @returns Verified user information or null if invalid
   */
  async verifyDynamicToken(token: string): Promise<DynamicUser | null> {
    try {
      // Log the environment ID being used
      logger.debug('Verifying Dynamic token with environment ID:', { environmentId: env.DYNAMIC_ENVIRONMENT_ID });
      
      // Create JWKS client with caching for performance
      const client = jwksClient({
        jwksUri: `https://app.dynamic.xyz/api/v0/sdk/${env.DYNAMIC_ENVIRONMENT_ID}/.well-known/jwks`,
        cache: true, // Cache keys to reduce API calls
        rateLimit: true, // Prevent hitting rate limits
      });

      // Helper function to retrieve signing key by key ID
      const getKey = (header: { kid?: string; alg?: string }, callback: (error: Error | null, key?: string) => void) => {
        if (!header.kid) {
          callback(new Error('No key ID found in token header'));
          return;
        }
        client.getSigningKey(header.kid, (err, key) => {
          if (err) {
            callback(err);
            return;
          }
          const signingKey = key?.getPublicKey();
          callback(null, signingKey);
        });
      };

      // Verify JWT signature and decode payload
      return new Promise((resolve) => {
        jwt.verify(token, getKey as jwt.GetPublicKeyOrSecret, { algorithms: ['RS256'] }, (err: jwt.VerifyErrors | null, decoded: unknown) => {
          if (err) {
            // Log verification errors for debugging
            logger.error('JWT verification error', err, {
              tokenPrefix: token.substring(0, 20) + '...',
              jwksUri: `https://app.dynamic.xyz/api/v0/sdk/${env.DYNAMIC_ENVIRONMENT_ID}/.well-known/jwks`,
            });
            resolve(null);
            return;
          }

          const payload = decoded as DynamicJWTPayload;
          
          // Transform Dynamic payload to internal user format
          const dynamicUser: DynamicUser = {
            userId: payload.sub,
            email: payload.email || `${payload.sub}@dynamic.user`,
            ...(payload.verified_credentials && { verifiedCredentials: payload.verified_credentials }),
          };

          resolve(dynamicUser);
        });
      });
    } catch (error) {
      logger.error('Error verifying Dynamic token', error);
      return null;
    }
  }

  async getUserById(userId: string): Promise<User | null> {
    return this.userRepository.findOne({
      where: { id: userId },
    });
  }
}