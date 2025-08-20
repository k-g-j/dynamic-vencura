import { Response } from 'express';
import { AuthRequest } from '../middleware/auth';
import { WalletService } from '../services/WalletService';
import {
  createWalletSchema,
  signMessageSchema,
  sendTransactionSchema,
  getBalanceSchema,
} from '@vencura/shared';

export class WalletController {
  private walletService: WalletService;

  constructor() {
    this.walletService = new WalletService();
  }

  async createWallet(req: AuthRequest, res: Response): Promise<void> {
    try {
      if (!req.user) {
        res.status(401).json({ error: 'Unauthorized' });
        return;
      }

      const validatedData = createWalletSchema.parse({
        ...req.body,
        userId: req.user.id,
      });

      const wallet = await this.walletService.createWallet(validatedData);
      res.status(201).json(wallet);
    } catch (error) {
      if (error instanceof Error) {
        res.status(400).json({ error: error.message });
      } else {
        res.status(500).json({ error: 'Internal server error' });
      }
    }
  }

  async getUserWallets(req: AuthRequest, res: Response): Promise<void> {
    try {
      if (!req.user) {
        res.status(401).json({ error: 'Unauthorized' });
        return;
      }

      const wallets = await this.walletService.getUserWallets(req.user.id);
      res.json(wallets);
    } catch (error) {
      if (error instanceof Error) {
        res.status(400).json({ error: error.message });
      } else {
        res.status(500).json({ error: 'Internal server error' });
      }
    }
  }

  async getBalance(req: AuthRequest, res: Response): Promise<void> {
    try {
      if (!req.user) {
        res.status(401).json({ error: 'Unauthorized' });
        return;
      }

      const validatedData = getBalanceSchema.parse({
        walletId: req.params['walletId'],
      });

      const balance = await this.walletService.getBalance(validatedData, req.user.id);
      res.json(balance);
    } catch (error) {
      if (error instanceof Error) {
        res.status(400).json({ error: error.message });
      } else {
        res.status(500).json({ error: 'Internal server error' });
      }
    }
  }

  async signMessage(req: AuthRequest, res: Response): Promise<void> {
    try {
      if (!req.user) {
        res.status(401).json({ error: 'Unauthorized' });
        return;
      }

      const validatedData = signMessageSchema.parse({
        walletId: req.params['walletId'],
        message: req.body.message,
      });

      const signedMessage = await this.walletService.signMessage(validatedData, req.user.id);
      res.json(signedMessage);
    } catch (error) {
      if (error instanceof Error) {
        res.status(400).json({ error: error.message });
      } else {
        res.status(500).json({ error: 'Internal server error' });
      }
    }
  }

  async sendTransaction(req: AuthRequest, res: Response): Promise<void> {
    try {
      if (!req.user) {
        res.status(401).json({ error: 'Unauthorized' });
        return;
      }

      const validatedData = sendTransactionSchema.parse({
        walletId: req.params['walletId'],
        to: req.body.to,
        amount: req.body.amount,
        gasLimit: req.body.gasLimit,
        gasPrice: req.body.gasPrice,
      });

      const transaction = await this.walletService.sendTransaction(validatedData, req.user.id);
      res.json(transaction);
    } catch (error) {
      if (error instanceof Error) {
        res.status(400).json({ error: error.message });
      } else {
        res.status(500).json({ error: 'Internal server error' });
      }
    }
  }

  async getTransactionHistory(req: AuthRequest, res: Response): Promise<void> {
    try {
      if (!req.user) {
        res.status(401).json({ error: 'Unauthorized' });
        return;
      }

      const walletId = req.params['walletId'];
      if (!walletId) {
        res.status(400).json({ error: 'Wallet ID is required' });
        return;
      }
      const transactions = await this.walletService.getTransactionHistory(
        walletId,
        req.user.id
      );
      res.json(transactions);
    } catch (error) {
      if (error instanceof Error) {
        res.status(400).json({ error: error.message });
      } else {
        res.status(500).json({ error: 'Internal server error' });
      }
    }
  }
}