import { Router } from 'express';
import { WalletController } from '../controllers/WalletController';
import { authenticateUser } from '../middleware/auth';

const router = Router();
const walletController = new WalletController();

router.use(authenticateUser);

router.post('/', (req, res) => walletController.createWallet(req, res));
router.get('/', (req, res) => walletController.getUserWallets(req, res));
router.get('/:walletId/balance', (req, res) => walletController.getBalance(req, res));
router.post('/:walletId/sign-message', (req, res) => walletController.signMessage(req, res));
router.post('/:walletId/send-transaction', (req, res) => walletController.sendTransaction(req, res));
router.get('/:walletId/transactions', (req, res) => walletController.getTransactionHistory(req, res));

export default router;