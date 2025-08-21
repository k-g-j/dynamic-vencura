import { Response, NextFunction } from 'express';
import jwt from 'jsonwebtoken';
import { authenticateUser, generateToken, AuthRequest } from '../auth';
import { AppDataSource } from '../../config/database';
import { User } from '../../entities/User';
import { env } from '../../config/env';
import { Logger } from '../../utils/logger';

jest.mock('../../config/database');
jest.mock('jsonwebtoken');

describe('Auth Middleware', () => {
  let mockRequest: Partial<AuthRequest>;
  let mockResponse: Partial<Response>;
  let mockNext: NextFunction;
  let mockUserRepository: any;

  beforeEach(() => {
    mockRequest = {
      headers: {},
      logger: new Logger('test-correlation-id'),
    };
    
    mockResponse = {
      status: jest.fn().mockReturnThis(),
      json: jest.fn().mockReturnThis(),
    };
    
    mockNext = jest.fn();
    
    mockUserRepository = {
      findOne: jest.fn(),
    };
    
    (AppDataSource.getRepository as jest.Mock).mockReturnValue(mockUserRepository);
  });

  describe('authenticateUser', () => {
    it('should authenticate valid token successfully', async () => {
      const mockUser = {
        id: 'user-id',
        email: 'test@example.com',
        dynamicUserId: 'dynamic-id',
      };
      
      const mockDecoded = {
        userId: 'user-id',
        email: 'test@example.com',
        dynamicUserId: 'dynamic-id',
      };
      
      mockRequest.headers = {
        authorization: 'Bearer valid-token',
      };
      
      (jwt.verify as jest.Mock).mockReturnValue(mockDecoded);
      mockUserRepository.findOne.mockResolvedValue(mockUser);
      
      await authenticateUser(
        mockRequest as AuthRequest,
        mockResponse as Response,
        mockNext
      );
      
      expect(jwt.verify).toHaveBeenCalledWith('valid-token', env.JWT_SECRET);
      expect(mockUserRepository.findOne).toHaveBeenCalledWith({
        where: { id: 'user-id' },
        select: ['id', 'email', 'dynamicUserId', 'createdAt', 'updatedAt'],
      });
      expect(mockRequest.user).toEqual({
        id: 'user-id',
        email: 'test@example.com',
        dynamicUserId: 'dynamic-id',
      });
      expect(mockNext).toHaveBeenCalled();
    });
    
    it('should reject request without authorization header', async () => {
      mockRequest.headers = {};
      
      await authenticateUser(
        mockRequest as AuthRequest,
        mockResponse as Response,
        mockNext
      );
      
      expect(mockResponse.status).toHaveBeenCalledWith(401);
      expect(mockResponse.json).toHaveBeenCalledWith(
        expect.objectContaining({
          error: 'UNAUTHORIZED',
          message: 'Authorization header missing',
          statusCode: 401,
          correlationId: 'test-correlation-id',
        })
      );
      expect(mockNext).not.toHaveBeenCalled();
    });
    
    it('should reject request with invalid token format', async () => {
      mockRequest.headers = {
        authorization: 'InvalidFormat token',
      };
      
      await authenticateUser(
        mockRequest as AuthRequest,
        mockResponse as Response,
        mockNext
      );
      
      expect(mockResponse.status).toHaveBeenCalledWith(401);
      expect(mockResponse.json).toHaveBeenCalledWith(
        expect.objectContaining({
          error: 'UNAUTHORIZED',
          message: 'Invalid authorization header format. Expected: Bearer <token>',
          statusCode: 401,
          correlationId: 'test-correlation-id',
        })
      );
      expect(mockNext).not.toHaveBeenCalled();
    });
    
    it('should reject invalid token', async () => {
      mockRequest.headers = {
        authorization: 'Bearer invalid-token',
      };
      
      (jwt.verify as jest.Mock).mockImplementation(() => {
        throw new Error('Invalid token');
      });
      
      await authenticateUser(
        mockRequest as AuthRequest,
        mockResponse as Response,
        mockNext
      );
      
      expect(mockResponse.status).toHaveBeenCalledWith(401);
      expect(mockResponse.json).toHaveBeenCalledWith(
        expect.objectContaining({
          error: 'INVALID_TOKEN',
          message: 'Invalid token',
          statusCode: 401,
          correlationId: 'test-correlation-id',
        })
      );
      expect(mockNext).not.toHaveBeenCalled();
    });
    
    it('should reject if user not found in database', async () => {
      const mockDecoded = {
        userId: 'non-existent-user',
        email: 'test@example.com',
        dynamicUserId: 'dynamic-id',
      };
      
      mockRequest.headers = {
        authorization: 'Bearer valid-token',
      };
      
      (jwt.verify as jest.Mock).mockReturnValue(mockDecoded);
      mockUserRepository.findOne.mockResolvedValue(null);
      
      await authenticateUser(
        mockRequest as AuthRequest,
        mockResponse as Response,
        mockNext
      );
      
      expect(mockResponse.status).toHaveBeenCalledWith(403);
      expect(mockResponse.json).toHaveBeenCalledWith(
        expect.objectContaining({
          error: 'USER_NOT_FOUND',
          message: 'User account not found or deactivated',
          statusCode: 403,
          correlationId: 'test-correlation-id',
        })
      );
      expect(mockNext).not.toHaveBeenCalled();
    });
    
    it('should handle database errors gracefully', async () => {
      mockRequest.headers = {
        authorization: 'Bearer valid-token',
      };
      
      (jwt.verify as jest.Mock).mockReturnValue({
        userId: 'user-id',
        email: 'test@example.com',
        dynamicUserId: 'dynamic-id',
      });
      
      mockUserRepository.findOne.mockRejectedValue(new Error('Database error'));
      
      await authenticateUser(
        mockRequest as AuthRequest,
        mockResponse as Response,
        mockNext
      );
      
      // Database errors should return 500 status
      expect(mockResponse.status).toHaveBeenCalledWith(500);
      expect(mockResponse.json).toHaveBeenCalledWith(
        expect.objectContaining({
          error: 'INTERNAL_ERROR',
          statusCode: 500,
          correlationId: 'test-correlation-id',
        })
      );
      expect(mockNext).not.toHaveBeenCalled();
    });
  });

  describe('generateToken', () => {
    it('should generate token with user data', () => {
      const mockUser = {
        id: 'user-id',
        email: 'test@example.com',
        dynamicUserId: 'dynamic-id',
      };
      
      const mockToken = 'generated-token';
      (jwt.sign as jest.Mock).mockReturnValue(mockToken);
      
      const token = generateToken(mockUser);
      
      expect(jwt.sign).toHaveBeenCalledWith(
        {
          userId: 'user-id',
          email: 'test@example.com',
          dynamicUserId: 'dynamic-id',
        },
        env.JWT_SECRET,
        {
          expiresIn: '7d',
          algorithm: 'HS256',
          issuer: 'vencura-backend',
          audience: 'vencura-client',
        }
      );
      expect(token).toBe(mockToken);
    });
    
    it('should work with User entity', () => {
      const mockUser = new User();
      mockUser.id = 'user-id';
      mockUser.email = 'test@example.com';
      mockUser.dynamicUserId = 'dynamic-id';
      
      const mockToken = 'generated-token';
      (jwt.sign as jest.Mock).mockReturnValue(mockToken);
      
      const token = generateToken(mockUser);
      
      expect(jwt.sign).toHaveBeenCalledWith(
        {
          userId: 'user-id',
          email: 'test@example.com',
          dynamicUserId: 'dynamic-id',
        },
        env.JWT_SECRET,
        {
          expiresIn: '7d',
          algorithm: 'HS256',
          issuer: 'vencura-backend',
          audience: 'vencura-client',
        }
      );
      expect(token).toBe(mockToken);
    });
  });
});