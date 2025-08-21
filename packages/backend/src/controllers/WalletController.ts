import { Response } from 'express';
import { AuthRequest } from '../middleware/auth';
import { WalletService } from '../services/WalletService';
import {
  createWalletSchema,
  signMessageSchema,
  sendTransactionSchema,
  getBalanceSchema,
} from '@vencura/shared';

/**
 * Controller handling all wallet-related API endpoints
 * 
 * Responsibilities:
 * - Request validation using Zod schemas
 * - Authentication verification
 * - Service layer delegation
 * - Error response formatting
 * - HTTP status code management
 */
export class WalletController {
  private walletService: WalletService;

  constructor() {
    this.walletService = new WalletService();
  }

  /**
   * Creates a new custodial wallet for authenticated user
   * 
   * POST /api/wallets
   * 
   * @param req - Request with wallet name in body
   * @param res - Response with created wallet details
   * @returns 201 with wallet details or error status
   */
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

  /**
   * Retrieves all wallets owned by authenticated user
   * 
   * GET /api/wallets
   * 
   * @param req - Authenticated request
   * @param res - Response with array of user's wallets
   * @returns 200 with wallet list or error status
   */
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

  /**
   * Queries current balance of specified wallet from blockchain
   * 
   * GET /api/wallets/:walletId/balance
   * 
   * @param req - Request with wallet ID in params
   * @param res - Response with balance in wei and ETH
   * @returns 200 with balance details or error status
   */
  async getBalance(req: AuthRequest, res: Response): Promise<void> {
    try {
      if (!req.user) {
        res.status(401).json({ error: 'Unauthorized' });
        return;
      }

      const validatedData = getBalanceSchema.parse({
        walletId: req.params['walletId']!,
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

  /**
   * Signs a message with wallet's private key for authentication
   * 
   * POST /api/wallets/:walletId/sign-message
   * 
   * Creates cryptographic signature for message verification.
   * Used for proving wallet ownership without exposing private key.
   * 
   * @param req - Request with wallet ID in params and message in body
   * @param res - Response with signature and original message
   * @returns 200 with signed message or error status
   */
  async signMessage(req: AuthRequest, res: Response): Promise<void> {
    try {
      if (!req.user) {
        res.status(401).json({ error: 'Unauthorized' });
        return;
      }

      const validatedData = signMessageSchema.parse({
        walletId: req.params['walletId']!,
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

  /**
   * Sends Ethereum transaction from custodial wallet
   * 
   * POST /api/wallets/:walletId/send-transaction
   * 
   * Validates balance, signs transaction, and broadcasts to blockchain.
   * Returns immediately with pending status while confirmation occurs async.
   * 
   * @param req - Request with recipient, amount, and optional gas parameters
   * @param res - Response with transaction hash and details
   * @returns 200 with transaction details or error status
   */
  async sendTransaction(req: AuthRequest, res: Response): Promise<void> {
    try {
      if (!req.user) {
        res.status(401).json({ error: 'Unauthorized' });
        return;
      }

      const validatedData = sendTransactionSchema.parse({
        walletId: req.params['walletId']!,
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

  /**
   * Retrieves transaction history for specified wallet
   * 
   * GET /api/wallets/:walletId/transactions
   * 
   * Returns all blockchain transactions for the wallet,
   * ordered by creation date (newest first).
   * 
   * @param req - Request with wallet ID in params
   * @param res - Response with array of transaction records
   * @returns 200 with transaction history or error status
   */
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