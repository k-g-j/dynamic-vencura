import { Router } from 'express';
import authRoutes from './auth';
import walletRoutes from './wallets';

const router = Router();

router.use('/auth', authRoutes);
router.use('/wallets', walletRoutes);

router.get('/health', (req, res) => {
  res.json({ status: 'healthy', timestamp: new Date().toISOString() });
});

export default router;