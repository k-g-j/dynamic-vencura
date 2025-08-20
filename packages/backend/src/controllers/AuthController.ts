import { Request, Response } from 'express';
import { AuthService } from '../services/AuthService';

export class AuthController {
  private authService: AuthService;

  constructor() {
    this.authService = new AuthService();
  }

  async loginWithDynamic(req: Request, res: Response): Promise<void> {
    try {
      const { dynamicToken } = req.body;

      if (!dynamicToken) {
        res.status(400).json({ error: 'Dynamic token is required' });
        return;
      }

      const dynamicUser = await this.authService.verifyDynamicToken(dynamicToken);

      if (!dynamicUser) {
        res.status(401).json({ error: 'Invalid Dynamic token' });
        return;
      }

      const { user, token } = await this.authService.authenticateWithDynamic(dynamicUser);

      res.json({
        user: {
          id: user.id,
          email: user.email,
          dynamicUserId: user.dynamicUserId,
        },
        token,
      });
    } catch (error) {
      console.error('Login error:', error);
      res.status(500).json({ error: 'Internal server error' });
    }
  }

  async getProfile(req: Request & { user?: { id: string } }, res: Response): Promise<void> {
    try {
      if (!req.user) {
        res.status(401).json({ error: 'Unauthorized' });
        return;
      }

      const user = await this.authService.getUserById(req.user.id);

      if (!user) {
        res.status(404).json({ error: 'User not found' });
        return;
      }

      res.json({
        id: user.id,
        email: user.email,
        dynamicUserId: user.dynamicUserId,
        createdAt: user.createdAt,
        updatedAt: user.updatedAt,
      });
    } catch (error) {
      console.error('Profile error:', error);
      res.status(500).json({ error: 'Internal server error' });
    }
  }
}