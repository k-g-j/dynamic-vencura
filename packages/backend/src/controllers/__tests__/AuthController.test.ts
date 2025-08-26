import { AuthController } from '../AuthController';
import { AuthService } from '../../services/AuthService';
import { Request, Response } from 'express';

jest.mock('../../services/AuthService');

describe('AuthController', () => {
  let authController: AuthController;
  let mockAuthService: jest.Mocked<AuthService>;
  let mockRequest: Partial<Request>;
  let mockResponse: Partial<Response>;

  beforeEach(() => {
    mockAuthService = new AuthService() as jest.Mocked<AuthService>;
    authController = new AuthController();
    (authController as any).authService = mockAuthService;

    mockRequest = {
      body: {},
    };

    mockResponse = {
      status: jest.fn().mockReturnThis(),
      json: jest.fn().mockReturnThis(),
    };
  });

  describe('login', () => {
    it('should successfully authenticate with Dynamic token', async () => {
      const mockDynamicToken = 'valid.jwt.token';
      const mockUser = { id: 'user-id', email: 'test@example.com' };
      const mockToken = 'internal.jwt.token';

      mockRequest.body = { token: mockDynamicToken };

      mockAuthService.verifyDynamicToken.mockResolvedValue({
        userId: 'dynamic-user-id',
        email: 'test@example.com',
      });

      mockAuthService.authenticateWithDynamic.mockResolvedValue({
        user: mockUser as any,
        token: mockToken,
      });

      await authController.login(
        mockRequest as Request,
        mockResponse as Response
      );

      expect(mockAuthService.verifyDynamicToken).toHaveBeenCalledWith(mockDynamicToken);
      expect(mockResponse.json).toHaveBeenCalledWith({
        token: mockToken,
        user: mockUser,
      });
    });

    it('should return 401 for invalid Dynamic token', async () => {
      mockRequest.body = { token: 'invalid.token' };
      mockAuthService.verifyDynamicToken.mockResolvedValue(null);

      await authController.login(
        mockRequest as Request,
        mockResponse as Response
      );

      expect(mockResponse.status).toHaveBeenCalledWith(401);
      expect(mockResponse.json).toHaveBeenCalledWith({
        error: 'Invalid Dynamic token',
      });
    });

    it('should handle missing token', async () => {
      mockRequest.body = {};

      await authController.login(
        mockRequest as Request,
        mockResponse as Response
      );

      expect(mockResponse.status).toHaveBeenCalledWith(400);
      expect(mockResponse.json).toHaveBeenCalledWith({
        error: 'Token is required',
      });
    });
  });
});