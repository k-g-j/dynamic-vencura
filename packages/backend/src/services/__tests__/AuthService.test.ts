import { AuthService } from '../AuthService';
import { AppDataSource } from '../../config/database';
import { generateToken } from '../../middleware/auth';
import jwt from 'jsonwebtoken';
import jwksClient from 'jwks-rsa';

jest.mock('../../config/database');
jest.mock('../../middleware/auth');
jest.mock('jsonwebtoken');
jest.mock('jwks-rsa');
jest.mock('../AuditService', () => ({
  AuditService: {
    getInstance: jest.fn().mockReturnValue({
      logAuthEvent: jest.fn(),
    }),
  },
  AuditEventType: {
    AUTH_LOGIN_SUCCESS: 'AUTH_LOGIN_SUCCESS',
    AUTH_LOGIN_FAILED: 'AUTH_LOGIN_FAILED',
  },
}));

describe('AuthService', () => {
  let authService: AuthService;
  let mockUserRepository: any;

  beforeEach(() => {
    mockUserRepository = {
      findOne: jest.fn(),
      create: jest.fn(),
      save: jest.fn(),
    };

    (AppDataSource.getRepository as jest.Mock).mockImplementation(() => mockUserRepository);
    authService = new AuthService();
  });

  afterEach(() => {
    jest.clearAllMocks();
  });

  describe('authenticateWithDynamic', () => {
    it('should create a new user if not exists', async () => {
      const dynamicUser = {
        userId: 'dynamic-user-id',
        email: 'test@example.com',
      };

      const newUser = {
        id: 'user-id',
        email: 'test@example.com',
        dynamicUserId: 'dynamic-user-id',
        createdAt: new Date(),
        updatedAt: new Date(),
      };

      mockUserRepository.findOne.mockResolvedValue(null);
      mockUserRepository.create.mockReturnValue(newUser);
      mockUserRepository.save.mockResolvedValue(newUser);
      (generateToken as jest.Mock).mockReturnValue('jwt-token');

      const result = await authService.authenticateWithDynamic(dynamicUser);

      expect(mockUserRepository.findOne).toHaveBeenCalledWith({
        where: { dynamicUserId: 'dynamic-user-id' },
      });
      expect(mockUserRepository.create).toHaveBeenCalledWith({
        email: 'test@example.com',
        dynamicUserId: 'dynamic-user-id',
      });
      expect(result).toEqual({
        user: newUser,
        token: 'jwt-token',
      });
    });

    it('should return existing user if found', async () => {
      const dynamicUser = {
        userId: 'dynamic-user-id',
        email: 'test@example.com',
      };

      const existingUser = {
        id: 'user-id',
        email: 'test@example.com',
        dynamicUserId: 'dynamic-user-id',
        createdAt: new Date(),
        updatedAt: new Date(),
      };

      mockUserRepository.findOne.mockResolvedValue(existingUser);
      (generateToken as jest.Mock).mockReturnValue('jwt-token');

      const result = await authService.authenticateWithDynamic(dynamicUser);

      expect(mockUserRepository.create).not.toHaveBeenCalled();
      expect(mockUserRepository.save).not.toHaveBeenCalled();
      expect(result).toEqual({
        user: existingUser,
        token: 'jwt-token',
      });
    });
  });

  describe('verifyDynamicToken', () => {
    let mockClient: any;
    let mockGetSigningKey: jest.Mock;

    beforeEach(() => {
      mockGetSigningKey = jest.fn();
      mockClient = {
        getSigningKey: mockGetSigningKey,
      };
      (jwksClient as unknown as jest.Mock).mockReturnValue(mockClient);
    });

    it('should verify valid Dynamic token', async () => {
      const token = 'valid-dynamic-token';
      const decodedPayload = {
        sub: 'user-123',
        email: 'test@example.com',
        verified_credentials: [
          { address: '0x123', chain: 'ethereum' },
        ],
      };

      mockGetSigningKey.mockImplementation((_kid, callback) => {
        callback(null, { getPublicKey: () => 'public-key' });
      });

      (jwt.verify as unknown as jest.Mock).mockImplementation((_token, getKey, _options, callback) => {
        getKey({ kid: 'key-id' }, (err: any, _key: any) => {
          if (!err) {
            callback(null, decodedPayload);
          }
        });
      });

      const result = await authService.verifyDynamicToken(token);

      expect(result).toEqual({
        userId: 'user-123',
        email: 'test@example.com',
        verifiedCredentials: [
          { address: '0x123', chain: 'ethereum' },
        ],
      });
    });

    it('should return null for invalid token', async () => {
      const token = 'invalid-token';

      mockGetSigningKey.mockImplementation((_kid, callback) => {
        callback(new Error('Invalid key'), null);
      });

      (jwt.verify as unknown as jest.Mock).mockImplementation((_token, getKey, _options, callback) => {
        getKey({ kid: 'key-id' }, (err: any, _key: any) => {
          callback(err || new Error('Invalid token'), null);
        });
      });

      const result = await authService.verifyDynamicToken(token);

      expect(result).toBeNull();
    });

    it('should handle missing email in payload', async () => {
      const token = 'valid-token';
      const decodedPayload = {
        sub: 'user-456',
      };

      mockGetSigningKey.mockImplementation((_kid, callback) => {
        callback(null, { getPublicKey: () => 'public-key' });
      });

      (jwt.verify as unknown as jest.Mock).mockImplementation((_token, getKey, _options, callback) => {
        getKey({ kid: 'key-id' }, (err: any, _key: any) => {
          if (!err) {
            callback(null, decodedPayload);
          }
        });
      });

      const result = await authService.verifyDynamicToken(token);

      expect(result).toEqual({
        userId: 'user-456',
        email: 'user-456@dynamic.user',
      });
    });

    it('should handle verification errors gracefully', async () => {
      const token = 'error-token';

      (jwksClient as unknown as jest.Mock).mockImplementation(() => {
        throw new Error('JWKS client error');
      });

      const result = await authService.verifyDynamicToken(token);

      expect(result).toBeNull();
    });
  });

  describe('getUserById', () => {
    it('should return user if found', async () => {
      const user = {
        id: 'user-id',
        email: 'test@example.com',
        dynamicUserId: 'dynamic-id',
      };

      mockUserRepository.findOne.mockResolvedValue(user);

      const result = await authService.getUserById('user-id');

      expect(mockUserRepository.findOne).toHaveBeenCalledWith({
        where: { id: 'user-id' },
      });
      expect(result).toEqual(user);
    });

    it('should return null if user not found', async () => {
      mockUserRepository.findOne.mockResolvedValue(null);

      const result = await authService.getUserById('non-existent');

      expect(result).toBeNull();
    });
  });
});