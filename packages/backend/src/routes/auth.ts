import { Router } from 'express';
import { AuthController } from '../controllers/AuthController';
import { authenticateUser } from '../middleware/auth';

const router = Router();
const authController = new AuthController();

router.post('/login', (req, res) => authController.login(req as any, res));
router.get('/profile', authenticateUser, (req, res) => authController.getProfile(req, res));

export default router;