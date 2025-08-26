import { Router, Request, Response } from 'express';
import { AuthController } from '../controllers/AuthController';
import { authenticateUser } from '../middleware/auth';

const router = Router();
const authController = new AuthController();

router.post('/login', (req: Request, res: Response) => authController.login(req, res));
router.get('/profile', authenticateUser, (req: Request, res: Response) => authController.getProfile(req, res));

export default router;