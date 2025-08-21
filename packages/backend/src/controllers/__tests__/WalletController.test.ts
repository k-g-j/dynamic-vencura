import { Response } from 'express';
import { WalletController } from '../WalletController';
import { WalletService } from '../../services/WalletService';
import { AuthRequest } from '../../middleware/auth';

jest.mock('../../services/WalletService', () => ({
  WalletService: jest.fn().mockImplementation(() => ({
    createWallet: jest.fn(),
    getUserWallets: jest.fn(),
    getBalance: jest.fn(),
    signMessage: jest.fn(),
    sendTransaction: jest.fn(),
    getTransactionHistory: jest.fn(),
  })),
}));

describe('WalletController', () => {
  let walletController: WalletController;
  let mockRequest: Partial<AuthRequest>;
  let mockResponse: Partial<Response>;
  let mockWalletService: jest.Mocked<WalletService>;

  beforeEach(() => {
    jest.clearAllMocks();
    walletController = new WalletController();
    mockWalletService = (walletController as any).walletService;
    
    mockRequest = {
      user: {
        id: '123e4567-e89b-12d3-a456-426614174000', // Valid UUID
        email: 'test@example.com',
        dynamicUserId: 'dynamic-user-id',
      },
      body: {},
      params: {},
    };
    
    mockResponse = {
      status: jest.fn().mockReturnThis(),
      json: jest.fn().mockReturnThis(),
    };
  });

  describe('createWallet', () => {
    it('should create a wallet successfully', async () => {
      const mockWallet = {
        id: 'wallet-id',
        address: '0x123' as `0x${string}`,
        name: 'Test Wallet',
        userId: '123e4567-e89b-12d3-a456-426614174000',
        createdAt: '2024-01-01T00:00:00.000Z',
        updatedAt: '2024-01-01T00:00:00.000Z',
      };
      
      mockRequest.body = { name: 'Test Wallet' };
      mockWalletService.createWallet.mockResolvedValue(mockWallet);
      
      await walletController.createWallet(mockRequest as AuthRequest, mockResponse as Response);
      
      // Check if the service was called
      expect(mockWalletService.createWallet).toHaveBeenCalled();
      expect(mockResponse.status).toHaveBeenCalledWith(201);
      expect(mockResponse.json).toHaveBeenCalledWith(mockWallet);
    });
    
    it('should return 401 if user is not authenticated', async () => {
      mockRequest.user = undefined;
      
      await walletController.createWallet(mockRequest as AuthRequest, mockResponse as Response);
      
      expect(mockResponse.status).toHaveBeenCalledWith(401);
      expect(mockResponse.json).toHaveBeenCalledWith({ error: 'Unauthorized' });
      expect(mockWalletService.createWallet).not.toHaveBeenCalled();
    });
    
    it('should handle validation errors', async () => {
      mockRequest.body = {}; // Missing required name field
      
      await walletController.createWallet(mockRequest as AuthRequest, mockResponse as Response);
      
      expect(mockResponse.status).toHaveBeenCalledWith(400);
      expect(mockResponse.json).toHaveBeenCalledWith(
        expect.objectContaining({ error: expect.any(String) })
      );
    });
  });

  describe('getUserWallets', () => {
    it('should retrieve user wallets successfully', async () => {
      const mockWallets = [
        {
          id: 'wallet-1',
          address: '0x123' as `0x${string}`,
          name: 'Wallet 1',
          userId: '123e4567-e89b-12d3-a456-426614174000',
          createdAt: '2024-01-01T00:00:00.000Z',
          updatedAt: '2024-01-01T00:00:00.000Z',
        },
        {
          id: 'wallet-2',
          address: '0x456' as `0x${string}`,
          name: 'Wallet 2',
          userId: '123e4567-e89b-12d3-a456-426614174000',
          createdAt: '2024-01-01T00:00:00.000Z',
          updatedAt: '2024-01-01T00:00:00.000Z',
        },
      ];
      
      mockWalletService.getUserWallets.mockResolvedValue(mockWallets);
      
      await walletController.getUserWallets(mockRequest as AuthRequest, mockResponse as Response);
      
      expect(mockWalletService.getUserWallets).toHaveBeenCalled();
      expect(mockResponse.json).toHaveBeenCalledWith(mockWallets);
    });
    
    it('should return 401 if user is not authenticated', async () => {
      mockRequest.user = undefined;
      
      await walletController.getUserWallets(mockRequest as AuthRequest, mockResponse as Response);
      
      expect(mockResponse.status).toHaveBeenCalledWith(401);
      expect(mockResponse.json).toHaveBeenCalledWith({ error: 'Unauthorized' });
    });
  });

  describe('getBalance', () => {
    it('should get wallet balance successfully', async () => {
      const mockBalance = {
        walletId: '987fcdeb-51a9-87d6-c3b2-456789123456',
        address: '0x123',
        balance: '1000000000000000000',
        formattedBalance: '1.0',
      };
      
      mockRequest.params = { walletId: '987fcdeb-51a9-87d6-c3b2-456789123456' }; // Valid UUID
      mockWalletService.getBalance.mockResolvedValue(mockBalance);
      
      await walletController.getBalance(mockRequest as AuthRequest, mockResponse as Response);
      
      expect(mockWalletService.getBalance).toHaveBeenCalled();
      expect(mockResponse.json).toHaveBeenCalledWith(mockBalance);
    });
    
    it('should handle missing wallet ID', async () => {
      mockRequest.params = {};
      
      await walletController.getBalance(mockRequest as AuthRequest, mockResponse as Response);
      
      expect(mockResponse.status).toHaveBeenCalledWith(400);
      expect(mockResponse.json).toHaveBeenCalledWith(
        expect.objectContaining({ error: expect.any(String) })
      );
    });
  });

  describe('signMessage', () => {
    it('should sign message successfully', async () => {
      const mockSignedMessage = {
        walletId: '987fcdeb-51a9-87d6-c3b2-456789123456',
        message: 'Test message',
        signature: '0xsignature123',
      };
      
      mockRequest.params = { walletId: '987fcdeb-51a9-87d6-c3b2-456789123456' }; // Valid UUID
      mockRequest.body = { message: 'Test message' };
      mockWalletService.signMessage.mockResolvedValue(mockSignedMessage);
      
      await walletController.signMessage(mockRequest as AuthRequest, mockResponse as Response);
      
      expect(mockWalletService.signMessage).toHaveBeenCalled();
      expect(mockResponse.json).toHaveBeenCalledWith(mockSignedMessage);
    });
    
    it('should handle missing message', async () => {
      mockRequest.params = { walletId: '987fcdeb-51a9-87d6-c3b2-456789123456' }; // Valid UUID
      mockRequest.body = {};
      
      await walletController.signMessage(mockRequest as AuthRequest, mockResponse as Response);
      
      expect(mockResponse.status).toHaveBeenCalledWith(400);
      expect(mockResponse.json).toHaveBeenCalledWith(
        expect.objectContaining({ error: expect.any(String) })
      );
    });
  });

  describe('sendTransaction', () => {
    it('should send transaction successfully', async () => {
      const mockTransaction = {
        walletId: '987fcdeb-51a9-87d6-c3b2-456789123456',
        transactionHash: '0xtxhash123',
        from: '0x742d35Cc6634C0532925a3b844Bc9e7595f0bEb4' as `0x${string}`,
        to: '0x742d35Cc6634C0532925a3b844Bc9e7595f0bEb4' as `0x${string}`,
        amount: '1000000000000000000',
        status: 'pending' as const,
      };
      
      mockRequest.params = { walletId: '987fcdeb-51a9-87d6-c3b2-456789123456' }; // Valid UUID
      mockRequest.body = {
        to: '0x742d35Cc6634C0532925a3b844Bc9e7595f0bEb4', // Valid Ethereum address
        amount: '1',
        gasLimit: 21000,
        gasPrice: '20',
      };
      mockWalletService.sendTransaction.mockResolvedValue(mockTransaction);
      
      await walletController.sendTransaction(mockRequest as AuthRequest, mockResponse as Response);
      
      expect(mockWalletService.sendTransaction).toHaveBeenCalled();
      expect(mockResponse.json).toHaveBeenCalledWith(mockTransaction);
    });
    
    it('should handle missing recipient address', async () => {
      mockRequest.params = { walletId: '987fcdeb-51a9-87d6-c3b2-456789123456' }; // Valid UUID
      mockRequest.body = { amount: '1' };
      
      await walletController.sendTransaction(mockRequest as AuthRequest, mockResponse as Response);
      
      expect(mockResponse.status).toHaveBeenCalledWith(400);
      expect(mockResponse.json).toHaveBeenCalledWith(
        expect.objectContaining({ error: expect.any(String) })
      );
    });
    
    it('should handle service errors', async () => {
      mockRequest.params = { walletId: '987fcdeb-51a9-87d6-c3b2-456789123456' }; // Valid UUID
      mockRequest.body = { to: '0x742d35Cc6634C0532925a3b844Bc9e7595f0bEb4', amount: '1' };
      mockWalletService.sendTransaction.mockRejectedValue(
        new Error('Insufficient balance')
      );
      
      await walletController.sendTransaction(mockRequest as AuthRequest, mockResponse as Response);
      
      expect(mockResponse.status).toHaveBeenCalledWith(400);
      expect(mockResponse.json).toHaveBeenCalledWith({ error: 'Insufficient balance' });
    });
  });

  describe('getTransactionHistory', () => {
    it('should get transaction history successfully', async () => {
      const mockTransactions = [
        {
          walletId: '987fcdeb-51a9-87d6-c3b2-456789123456',
          transactionHash: '0xtx1',
          from: '0x123' as `0x${string}`,
          to: '0x456' as `0x${string}`,
          amount: '1000000000000000000',
          status: 'confirmed' as const,
          gasUsed: '21000',
          blockNumber: 12345,
        },
        {
          walletId: '987fcdeb-51a9-87d6-c3b2-456789123456',
          transactionHash: '0xtx2',
          from: '0x123' as `0x${string}`,
          to: '0x789' as `0x${string}`,
          amount: '2000000000000000000',
          status: 'pending' as const,
        },
      ];
      
      mockRequest.params = { walletId: '987fcdeb-51a9-87d6-c3b2-456789123456' }; // Valid UUID
      mockWalletService.getTransactionHistory.mockResolvedValue(mockTransactions);
      
      await walletController.getTransactionHistory(mockRequest as AuthRequest, mockResponse as Response);
      
      expect(mockWalletService.getTransactionHistory).toHaveBeenCalled();
      expect(mockResponse.json).toHaveBeenCalledWith(mockTransactions);
    });
    
    it('should handle missing wallet ID', async () => {
      mockRequest.params = {};
      
      await walletController.getTransactionHistory(mockRequest as AuthRequest, mockResponse as Response);
      
      expect(mockResponse.status).toHaveBeenCalledWith(400);
      expect(mockResponse.json).toHaveBeenCalledWith({ error: 'Wallet ID is required' });
    });
  });
});