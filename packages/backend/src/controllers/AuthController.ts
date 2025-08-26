import { Request, Response } from 'express';
import { AuthService } from '../services/AuthService';
import { AuthRequest, generateToken } from '../middleware/auth';
import { Logger } from '../utils/logger';

/**
 * Controller for authentication endpoints
 * 
 * Handles:
 * - Dynamic SDK authentication
 * - User profile management
 * - Token refresh
 * - Logout
 */
export class AuthController {
  private authService: AuthService;

  constructor() {
    this.authService = new AuthService();
  }

  /**
   * Authenticate user with Dynamic token
   */
  async login(req: AuthRequest, res: Response): Promise<void> {
    try {
      const { token } = req.body;
      const logger = req.logger || new Logger();

      if (!token) {
        res.status(400).json({ error: 'Token is required' });
        return;
      }

      logger.logAuth('login_attempt');
      const dynamicUser = await this.authService.verifyDynamicToken(token);

      if (!dynamicUser) {
        logger.logAuth('login_failed', undefined, { reason: 'invalid_token' });
        res.status(401).json({ error: 'Invalid Dynamic token' });
        return;
      }

      const result = await this.authService.authenticateWithDynamic(dynamicUser);
      logger.logAuth('login_success', result.user.id);

      res.json({
        user: result.user,
        token: result.token,
      });
    } catch (error) {
      const logger = req.logger || new Logger();
      logger.error('Login error', error);
      
      // More detailed error response in non-production
      if (process.env['NODE_ENV'] !== 'production') {
        res.status(500).json({ 
          error: 'Internal server error',
          message: error instanceof Error ? error.message : 'Unknown error',
          details: error
        });
      } else {
        res.status(500).json({ error: 'Internal server error' });
      }
    }
  }

  // Keep backward compatibility
  async loginWithDynamic(req: Request, res: Response): Promise<void> {
    return this.login(req as AuthRequest, res);
  }

  /**
   * Get authenticated user's profile
   */
  async getProfile(req: AuthRequest, res: Response): Promise<void> {
    try {
      if (!req.user) {
        res.status(401).json({ error: 'Unauthorized' });
        return;
      }

      res.json({ user: req.user });
    } catch (error) {
      const logger = req.logger || new Logger();
      logger.error('Profile error', error);
      res.status(500).json({ error: 'Internal server error' });
    }
  }

  /**
   * Logout user (client-side token removal)
   */
  async logout(req: AuthRequest, res: Response): Promise<void> {
    try {
      const logger = req.logger || new Logger();
      if (req.user) {
        logger.logAuth('logout', req.user.id);
      }
      res.json({ message: 'Logged out successfully' });
    } catch (error) {
      res.status(500).json({ error: 'Internal server error' });
    }
  }

  /**
   * Refresh authentication token
   */
  async refreshToken(req: AuthRequest, res: Response): Promise<void> {
    try {
      if (!req.user) {
        res.status(401).json({ error: 'Unauthorized' });
        return;
      }

      const token = generateToken(req.user);
      const logger = req.logger || new Logger();
      logger.logAuth('token_refresh', req.user.id);

      res.json({ token, user: req.user });
    } catch (error) {
      const logger = req.logger || new Logger();
      logger.error('Token refresh error', error);
      res.status(500).json({ error: 'Internal server error' });
    }
  }
}