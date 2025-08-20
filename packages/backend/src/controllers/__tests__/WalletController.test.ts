/**
 * Integration tests for WalletController
 */

import request from 'supertest';
import express from 'express';
import { WalletController } from '../WalletController';
import { WalletService } from '../../services/WalletService';
import { authenticateUser } from '../../middleware/auth';

jest.mock('../../services/WalletService');
jest.mock('../../middleware/auth');

describe('WalletController', () => {
  let app: express.Application;
  let walletController: WalletController;
  let mockWalletService: jest.Mocked<WalletService>;

  beforeEach(() => {
    app = express();
    app.use(express.json());
    
    mockWalletService = new WalletService() as jest.Mocked<WalletService>;
    walletController = new WalletController();
    (walletController as any).walletService = mockWalletService;

    (authenticateUser as jest.Mock).mockImplementation((req, _res, next) => {
      req.user = { id: 'test-user-id', email: 'test@example.com', dynamicUserId: 'dynamic-id' };
      next();
    });

    app.post('/wallets', authenticateUser, (req, res) => walletController.createWallet(req, res));
    app.get('/wallets', authenticateUser, (req, res) => walletController.getUserWallets(req, res));
    app.get('/wallets/:walletId/balance', authenticateUser, (req, res) => walletController.getBalance(req, res));
    app.post('/wallets/:walletId/sign-message', authenticateUser, (req, res) => walletController.signMessage(req, res));
    app.post('/wallets/:walletId/send-transaction', authenticateUser, (req, res) => walletController.sendTransaction(req, res));
    app.get('/wallets/:walletId/transactions', authenticateUser, (req, res) => walletController.getTransactionHistory(req, res));
  });

  afterEach(() => {
    jest.clearAllMocks();
  });

  describe('POST /wallets', () => {
    it('should create a new wallet', async () => {
      const mockWallet = {
        id: 'wallet-id',
        address: '0x1234567890123456789012345678901234567890' as `0x${string}`,
        name: 'Test Wallet',
        userId: 'test-user-id',
        createdAt: new Date().toISOString(),
        updatedAt: new Date().toISOString(),
      };

      mockWalletService.createWallet.mockResolvedValue(mockWallet);

      const response = await request(app)
        .post('/wallets')
        .send({ name: 'Test Wallet' })
        .expect(201);

      expect(response.body).toEqual(mockWallet);
      expect(mockWalletService.createWallet).toHaveBeenCalledWith({
        name: 'Test Wallet',
        userId: 'test-user-id',
      });
    });

    it('should return 400 for invalid wallet name', async () => {
      const response = await request(app)
        .post('/wallets')
        .send({ name: '' })
        .expect(400);

      expect(response.body).toHaveProperty('error');
    });
  });

  describe('GET /wallets', () => {
    it('should return user wallets', async () => {
      const mockWallets = [
        {
          id: 'wallet-1',
          address: '0x1234567890123456789012345678901234567890' as `0x${string}`,
          name: 'Wallet 1',
          userId: 'test-user-id',
          createdAt: new Date().toISOString(),
          updatedAt: new Date().toISOString(),
        },
        {
          id: 'wallet-2',
          address: '0x0987654321098765432109876543210987654321' as `0x${string}`,
          name: 'Wallet 2',
          userId: 'test-user-id',
          createdAt: new Date().toISOString(),
          updatedAt: new Date().toISOString(),
        },
      ];

      mockWalletService.getUserWallets.mockResolvedValue(mockWallets);

      const response = await request(app)
        .get('/wallets')
        .expect(200);

      expect(response.body).toEqual(mockWallets);
      expect(mockWalletService.getUserWallets).toHaveBeenCalledWith('test-user-id');
    });
  });

  describe('GET /wallets/:walletId/balance', () => {
    it('should return wallet balance', async () => {
      const mockBalance = {
        walletId: 'wallet-id',
        balance: '1500000000000000000',
        formattedBalance: '1.5',
      };

      mockWalletService.getBalance.mockResolvedValue(mockBalance);

      const response = await request(app)
        .get('/wallets/wallet-id/balance')
        .expect(200);

      expect(response.body).toEqual(mockBalance);
      expect(mockWalletService.getBalance).toHaveBeenCalledWith(
        { walletId: 'wallet-id' },
        'test-user-id'
      );
    });
  });

  describe('POST /wallets/:walletId/sign-message', () => {
    it('should sign a message', async () => {
      const mockSignedMessage = {
        walletId: 'wallet-id',
        message: 'Test message',
        signature: '0xsignature',
      };

      mockWalletService.signMessage.mockResolvedValue(mockSignedMessage);

      const response = await request(app)
        .post('/wallets/wallet-id/sign-message')
        .send({ message: 'Test message' })
        .expect(200);

      expect(response.body).toEqual(mockSignedMessage);
      expect(mockWalletService.signMessage).toHaveBeenCalledWith(
        { walletId: 'wallet-id', message: 'Test message' },
        'test-user-id'
      );
    });

    it('should return 400 for empty message', async () => {
      const response = await request(app)
        .post('/wallets/wallet-id/sign-message')
        .send({ message: '' })
        .expect(400);

      expect(response.body).toHaveProperty('error');
    });
  });

  describe('POST /wallets/:walletId/send-transaction', () => {
    it('should send a transaction', async () => {
      const mockTransaction = {
        walletId: 'wallet-id',
        transactionHash: '0xhash',
        from: '0x1234567890123456789012345678901234567890' as `0x${string}`,
        to: '0x0987654321098765432109876543210987654321' as `0x${string}`,
        amount: '100000000000000000',
        status: 'pending' as const,
      };

      mockWalletService.sendTransaction.mockResolvedValue(mockTransaction);

      const response = await request(app)
        .post('/wallets/wallet-id/send-transaction')
        .send({
          to: '0x0987654321098765432109876543210987654321',
          amount: 0.1,
        })
        .expect(200);

      expect(response.body).toEqual(mockTransaction);
      expect(mockWalletService.sendTransaction).toHaveBeenCalledWith(
        {
          walletId: 'wallet-id',
          to: '0x0987654321098765432109876543210987654321',
          amount: 0.1,
          gasLimit: undefined,
          gasPrice: undefined,
        },
        'test-user-id'
      );
    });

    it('should return 400 for invalid address', async () => {
      const response = await request(app)
        .post('/wallets/wallet-id/send-transaction')
        .send({
          to: 'invalid-address',
          amount: 0.1,
        })
        .expect(400);

      expect(response.body).toHaveProperty('error');
    });

    it('should return 400 for invalid amount', async () => {
      const response = await request(app)
        .post('/wallets/wallet-id/send-transaction')
        .send({
          to: '0x0987654321098765432109876543210987654321',
          amount: -1,
        })
        .expect(400);

      expect(response.body).toHaveProperty('error');
    });
  });

  describe('GET /wallets/:walletId/transactions', () => {
    it('should return transaction history', async () => {
      const mockTransactions = [
        {
          walletId: 'wallet-id',
          transactionHash: '0xhash1',
          from: '0x1234567890123456789012345678901234567890' as `0x${string}`,
          to: '0x0987654321098765432109876543210987654321' as `0x${string}`,
          amount: '100000000000000000',
          status: 'confirmed' as const,
          blockNumber: 12345,
        },
        {
          walletId: 'wallet-id',
          transactionHash: '0xhash2',
          from: '0x1234567890123456789012345678901234567890' as `0x${string}`,
          to: '0x1111111111111111111111111111111111111111' as `0x${string}`,
          amount: '200000000000000000',
          status: 'pending' as const,
        },
      ];

      mockWalletService.getTransactionHistory.mockResolvedValue(mockTransactions);

      const response = await request(app)
        .get('/wallets/wallet-id/transactions')
        .expect(200);

      expect(response.body).toEqual(mockTransactions);
      expect(mockWalletService.getTransactionHistory).toHaveBeenCalledWith(
        'wallet-id',
        'test-user-id'
      );
    });
  });
});