import { WalletService } from '../WalletService';
import { AppDataSource } from '../../config/database';
import { encrypt } from '../../utils/crypto';
import { ethers } from 'ethers';

jest.mock('../../config/database');
jest.mock('../../utils/crypto');
jest.mock('../TransactionRetryService', () => ({
  TransactionRetryService: jest.fn().mockImplementation(() => ({
    executeWithRetry: jest.fn(),
    waitForConfirmationWithRetry: jest.fn(),
  })),
}));
jest.mock('../AuditService', () => ({
  AuditService: {
    getInstance: jest.fn().mockReturnValue({
      logTransactionOperation: jest.fn(),
    }),
  },
  AuditEventType: {
    TRANSACTION_INITIATED: 'TRANSACTION_INITIATED',
    TRANSACTION_CONFIRMED: 'TRANSACTION_CONFIRMED',
    TRANSACTION_FAILED: 'TRANSACTION_FAILED',
  },
}));
jest.mock('../GasEstimationService', () => ({
  GasEstimationService: jest.fn().mockImplementation(() => ({
    estimateGas: jest.fn().mockResolvedValue({
      gasLimit: BigInt(21000),
      gasPrice: BigInt(20 * 1e9),
      maxFeePerGas: BigInt(30 * 1e9),
      maxPriorityFeePerGas: BigInt(2 * 1e9),
      estimatedCost: BigInt(21000) * BigInt(30 * 1e9),
      estimatedCostETH: '0.00063',
      isEIP1559: true,
      congestionLevel: 'medium',
    }),
  })),
}));
jest.mock('ethers', () => {
  const WalletMock: any = jest.fn();
  WalletMock.createRandom = jest.fn();
  
  return {
    ethers: {
      Wallet: WalletMock,
      JsonRpcProvider: jest.fn().mockImplementation(() => ({
        getBalance: jest.fn(),
        getFeeData: jest.fn().mockResolvedValue({
          gasPrice: BigInt(20 * 1e9), // 20 gwei
          maxFeePerGas: BigInt(30 * 1e9), // 30 gwei
          maxPriorityFeePerGas: BigInt(2 * 1e9), // 2 gwei
        }),
        estimateGas: jest.fn().mockResolvedValue(BigInt(21000)),
      })),
      parseEther: jest.fn((value: string) => BigInt(parseFloat(value) * 1e18)),
      formatEther: jest.fn((value: bigint) => (Number(value) / 1e18).toString()),
      parseUnits: jest.fn((value: string, unit: string) => {
        if (unit === 'gwei') return BigInt(parseFloat(value) * 1e9);
        if (unit === 'wei') return BigInt(value);
        return BigInt(value);
      }),
      formatUnits: jest.fn((value: bigint, unit: string) => {
        if (unit === 'gwei') return (Number(value) / 1e9).toString();
        if (unit === 'ether') return (Number(value) / 1e18).toString();
        return value.toString();
      }),
    },
    Wallet: WalletMock,
  };
});

describe('WalletService', () => {
  let walletService: WalletService;
  let mockWalletRepository: any;
  let mockTransactionRepository: any;
  let mockSignedMessageRepository: any;
  
  beforeEach(() => {
    mockWalletRepository = {
      create: jest.fn(),
      save: jest.fn(),
      findOne: jest.fn(),
      find: jest.fn(),
    };
    
    mockTransactionRepository = {
      create: jest.fn(),
      save: jest.fn(),
      find: jest.fn(),
    };
    
    mockSignedMessageRepository = {
      create: jest.fn(),
      save: jest.fn(),
    };
    
    (AppDataSource.getRepository as jest.Mock).mockImplementation((entity) => {
      if (entity.name === 'Wallet') return mockWalletRepository;
      if (entity.name === 'Transaction') return mockTransactionRepository;
      if (entity.name === 'SignedMessage') return mockSignedMessageRepository;
    });
    
    walletService = new WalletService();
  });
  
  describe('createWallet', () => {
    it('should create a new wallet successfully', async () => {
      const mockAddress = '0x742d35Cc6634C0532925a3b844Bc9e7595f0bEb4';
      const mockPrivateKey = '0x' + '1'.repeat(64);
      const encryptedKey = 'encrypted_key';
      
      jest.spyOn(ethers.Wallet, 'createRandom').mockReturnValue({
        address: mockAddress,
        privateKey: mockPrivateKey,
      } as any);
      
      (encrypt as jest.Mock).mockReturnValue(encryptedKey);
      
      const mockWallet = {
        id: 'wallet-id',
        address: mockAddress,
        name: 'Test Wallet',
        userId: 'user-id',
        createdAt: new Date(),
        updatedAt: new Date(),
      };
      
      mockWalletRepository.create.mockReturnValue(mockWallet);
      mockWalletRepository.save.mockResolvedValue(mockWallet);
      
      const result = await walletService.createWallet({
        name: 'Test Wallet',
        userId: 'user-id',
      });
      
      expect(result).toEqual({
        id: 'wallet-id',
        address: mockAddress,
        name: 'Test Wallet',
        userId: 'user-id',
        createdAt: expect.any(String),
        updatedAt: expect.any(String),
      });
      
      expect(encrypt).toHaveBeenCalledWith(mockPrivateKey);
      expect(mockWalletRepository.create).toHaveBeenCalledWith({
        name: 'Test Wallet',
        address: mockAddress,
        encryptedPrivateKey: encryptedKey,
        userId: 'user-id',
      });
    });
    
    it('should encrypt the private key before storing', async () => {
      const mockPrivateKey = '0x' + '2'.repeat(64);
      const mockAddress = '0x' + '3'.repeat(40);
      const encryptedKey = 'encrypted_key';
      
      jest.spyOn(ethers.Wallet, 'createRandom').mockReturnValue({
        address: mockAddress,
        privateKey: mockPrivateKey,
      } as any);
      
      (encrypt as jest.Mock).mockReturnValue(encryptedKey);
      
      const mockWallet = {
        id: 'wallet-id',
        address: mockAddress,
        name: 'Test',
        userId: 'user-id',
        encryptedPrivateKey: encryptedKey,
        createdAt: new Date(),
        updatedAt: new Date(),
      };
      
      mockWalletRepository.create.mockReturnValue(mockWallet);
      mockWalletRepository.save.mockResolvedValue(mockWallet);
      
      await walletService.createWallet({
        name: 'Test',
        userId: 'user-id',
      });
      
      expect(encrypt).toHaveBeenCalledWith(mockPrivateKey);
    });
  });
  
  describe('getWallet', () => {
    it('should retrieve a wallet by ID and user ID', async () => {
      const mockWallet = {
        id: 'wallet-id',
        userId: 'user-id',
        address: '0x123',
      };
      
      mockWalletRepository.findOne.mockResolvedValue(mockWallet);
      
      const result = await walletService.getWallet('wallet-id', 'user-id');
      
      expect(result).toEqual(mockWallet);
      expect(mockWalletRepository.findOne).toHaveBeenCalledWith({
        where: { id: 'wallet-id', userId: 'user-id' },
      });
    });
    
    it('should throw error for non-existent wallet', async () => {
      mockWalletRepository.findOne.mockResolvedValue(null);
      
      await expect(
        walletService.getWallet('invalid-id', 'user-id')
      ).rejects.toThrow("Wallet with ID 'invalid-id' not found");
    });
  });
  
  describe('getUserWallets', () => {
    it('should retrieve all wallets for a user', async () => {
      const mockWallets = [
        {
          id: 'wallet-1',
          address: '0x123',
          name: 'Wallet 1',
          userId: 'user-id',
          createdAt: new Date(),
          updatedAt: new Date(),
        },
        {
          id: 'wallet-2',
          address: '0x456',
          name: 'Wallet 2',
          userId: 'user-id',
          createdAt: new Date(),
          updatedAt: new Date(),
        },
      ];
      
      mockWalletRepository.find.mockResolvedValue(mockWallets);
      
      const result = await walletService.getUserWallets('user-id');
      
      expect(result).toHaveLength(2);
      expect(mockWalletRepository.find).toHaveBeenCalledWith({
        where: { userId: 'user-id' },
        order: { createdAt: 'DESC' },
      });
    });
  });

  describe('getBalance', () => {
    it('should retrieve wallet balance from blockchain', async () => {
      const mockWallet = {
        id: 'wallet-id',
        address: '0x742d35Cc6634C0532925a3b844Bc9e7595f0bEb4',
        userId: 'user-id',
      };
      
      mockWalletRepository.findOne.mockResolvedValue(mockWallet);
      
      const mockBalance = BigInt(1.5 * 1e18);
      const mockProvider = {
        getBalance: jest.fn().mockResolvedValue(mockBalance),
      };
      
      (walletService as any).provider = mockProvider;
      
      const result = await walletService.getBalance(
        { walletId: 'wallet-id' },
        'user-id'
      );
      
      expect(result).toEqual({
        walletId: 'wallet-id',
        address: mockWallet.address,
        balance: mockBalance.toString(),
        formattedBalance: ethers.formatEther(mockBalance),
      });
      
      expect(mockProvider.getBalance).toHaveBeenCalledWith(mockWallet.address);
    });
    
    it('should throw error if wallet not found', async () => {
      mockWalletRepository.findOne.mockResolvedValue(null);
      
      await expect(
        walletService.getBalance({ walletId: 'invalid-id' }, 'user-id')
      ).rejects.toThrow("Wallet with ID 'invalid-id' not found");
    });
  });

  describe('signMessage', () => {
    it('should sign a message with wallet private key', async () => {
      const mockWallet = {
        id: 'wallet-id',
        address: '0x742d35Cc6634C0532925a3b844Bc9e7595f0bEb4',
        encryptedPrivateKey: 'encrypted_key',
        userId: 'user-id',
      };
      
      mockWalletRepository.findOne.mockResolvedValue(mockWallet);
      
      const mockPrivateKey = '0x' + '1'.repeat(64);
      const mockSignature = '0xsignature123';
      
      jest.mock('../../utils/crypto', () => ({
        decrypt: jest.fn().mockReturnValue(mockPrivateKey),
      }));
      
      const { decrypt } = require('../../utils/crypto');
      (decrypt as jest.Mock).mockReturnValue(mockPrivateKey);
      
      const mockEthersWallet = {
        signMessage: jest.fn().mockResolvedValue(mockSignature),
      };
      
      (ethers.Wallet as unknown as jest.Mock).mockImplementation(() => mockEthersWallet);
      
      const mockSignedMessage = {
        walletId: 'wallet-id',
        message: 'Test message',
        signature: mockSignature,
      };
      
      mockSignedMessageRepository.create.mockReturnValue(mockSignedMessage);
      mockSignedMessageRepository.save.mockResolvedValue(mockSignedMessage);
      
      const result = await walletService.signMessage(
        { walletId: 'wallet-id', message: 'Test message' },
        'user-id'
      );
      
      expect(result).toEqual({
        walletId: 'wallet-id',
        message: 'Test message',
        signature: mockSignature,
      });
      
      expect(decrypt).toHaveBeenCalledWith('encrypted_key');
      expect(mockEthersWallet.signMessage).toHaveBeenCalledWith('Test message');
      expect(mockSignedMessageRepository.save).toHaveBeenCalled();
    });
    
    it('should store signed message in database for audit trail', async () => {
      const mockWallet = {
        id: 'wallet-id',
        address: '0x742d35Cc6634C0532925a3b844Bc9e7595f0bEb4',
        encryptedPrivateKey: 'encrypted_key',
        userId: 'user-id',
      };
      
      mockWalletRepository.findOne.mockResolvedValue(mockWallet);
      
      const mockPrivateKey = '0x' + '1'.repeat(64);
      const mockSignature = '0xsignature456';
      
      const { decrypt } = require('../../utils/crypto');
      (decrypt as jest.Mock).mockReturnValue(mockPrivateKey);
      
      const mockEthersWallet = {
        signMessage: jest.fn().mockResolvedValue(mockSignature),
      };
      
      (ethers.Wallet as unknown as jest.Mock).mockImplementation(() => mockEthersWallet);
      
      await walletService.signMessage(
        { walletId: 'wallet-id', message: 'Audit test' },
        'user-id'
      );
      
      expect(mockSignedMessageRepository.create).toHaveBeenCalledWith({
        walletId: 'wallet-id',
        message: 'Audit test',
        signature: mockSignature,
      });
      
      expect(mockSignedMessageRepository.save).toHaveBeenCalled();
    });
  });

  describe('sendTransaction', () => {
    it('should send transaction successfully', async () => {
      const mockWallet = {
        id: 'wallet-id',
        address: '0x742d35Cc6634C0532925a3b844Bc9e7595f0bEb4',
        encryptedPrivateKey: 'encrypted_key',
        userId: 'user-id',
      };
      
      mockWalletRepository.findOne.mockResolvedValue(mockWallet);
      
      const mockPrivateKey = '0x' + '1'.repeat(64);
      const { decrypt } = require('../../utils/crypto');
      (decrypt as jest.Mock).mockReturnValue(mockPrivateKey);
      
      const mockBalance = BigInt(10 * 1e18);
      const mockProvider = {
        getBalance: jest.fn().mockResolvedValue(mockBalance),
      };
      
      (walletService as any).provider = mockProvider;
      
      const mockTx = {
        hash: '0xtxhash123',
        wait: jest.fn(),
      };
      
      const mockEthersWallet = {
        sendTransaction: jest.fn().mockResolvedValue(mockTx),
      };
      
      (ethers.Wallet as unknown as jest.Mock).mockImplementation(() => mockEthersWallet);
      
      const mockRetryService = {
        executeWithRetry: jest.fn().mockResolvedValue(mockTx),
        waitForConfirmationWithRetry: jest.fn().mockResolvedValue({
          status: 1,
          blockNumber: 12345,
          gasUsed: BigInt(21000),
        }),
      };
      
      (walletService as any).retryService = mockRetryService;
      
      const mockTransaction = {
        id: 'tx-id',
        walletId: 'wallet-id',
        transactionHash: '0xtxhash123',
        from: mockWallet.address,
        to: '0xrecipient',
        amount: BigInt(1e18).toString(),
        status: 'pending',
      };
      
      mockTransactionRepository.create.mockReturnValue(mockTransaction);
      mockTransactionRepository.save.mockResolvedValue(mockTransaction);
      
      const result = await walletService.sendTransaction(
        {
          walletId: 'wallet-id',
          to: '0xrecipient' as `0x${string}`,
          amount: '1',
        },
        'user-id'
      );
      
      expect(result).toEqual({
        walletId: 'wallet-id',
        transactionHash: '0xtxhash123',
        from: mockWallet.address,
        to: '0xrecipient',
        amount: BigInt(1e18).toString(),
        status: 'pending',
      });
      
      expect(mockProvider.getBalance).toHaveBeenCalledWith(mockWallet.address);
      expect(mockRetryService.executeWithRetry).toHaveBeenCalled();
      expect(mockTransactionRepository.save).toHaveBeenCalled();
    });
    
    it('should throw error for insufficient balance', async () => {
      const mockWallet = {
        id: 'wallet-id',
        address: '0x742d35Cc6634C0532925a3b844Bc9e7595f0bEb4',
        encryptedPrivateKey: 'encrypted_key',
        userId: 'user-id',
      };
      
      mockWalletRepository.findOne.mockResolvedValue(mockWallet);
      
      const mockPrivateKey = '0x' + '1'.repeat(64);
      const { decrypt } = require('../../utils/crypto');
      (decrypt as jest.Mock).mockReturnValue(mockPrivateKey);
      
      const mockBalance = BigInt(0.5 * 1e18);
      const mockProvider = {
        getBalance: jest.fn().mockResolvedValue(mockBalance),
      };
      
      (walletService as any).provider = mockProvider;
      
      await expect(
        walletService.sendTransaction(
          {
            walletId: 'wallet-id',
            to: '0xrecipient' as `0x${string}`,
            amount: '1',
          },
          'user-id'
        )
      ).rejects.toThrow('Insufficient balance');
      
      expect(mockTransactionRepository.save).not.toHaveBeenCalled();
    });
    
    it('should handle custom gas parameters', async () => {
      const mockWallet = {
        id: 'wallet-id',
        address: '0x742d35Cc6634C0532925a3b844Bc9e7595f0bEb4',
        encryptedPrivateKey: 'encrypted_key',
        userId: 'user-id',
      };
      
      mockWalletRepository.findOne.mockResolvedValue(mockWallet);
      
      const mockPrivateKey = '0x' + '1'.repeat(64);
      const { decrypt } = require('../../utils/crypto');
      (decrypt as jest.Mock).mockReturnValue(mockPrivateKey);
      
      const mockBalance = BigInt(10 * 1e18);
      const mockProvider = {
        getBalance: jest.fn().mockResolvedValue(mockBalance),
      };
      
      (walletService as any).provider = mockProvider;
      
      const mockTx = {
        hash: '0xtxhash456',
        wait: jest.fn(),
      };
      
      const mockRetryService = {
        executeWithRetry: jest.fn().mockResolvedValue(mockTx),
        waitForConfirmationWithRetry: jest.fn().mockResolvedValue({
          status: 1,
          blockNumber: 12346,
          gasUsed: BigInt(30000),
        }),
      };
      
      (walletService as any).retryService = mockRetryService;
      
      const mockTransaction = {
        id: 'tx-id-2',
        walletId: 'wallet-id',
        transactionHash: '0xtxhash456',
        from: mockWallet.address,
        to: '0xrecipient',
        amount: BigInt(1e18).toString(),
        status: 'pending',
        gasPrice: '20',
      };
      
      mockTransactionRepository.create.mockReturnValue(mockTransaction);
      mockTransactionRepository.save.mockResolvedValue(mockTransaction);
      
      await walletService.sendTransaction(
        {
          walletId: 'wallet-id',
          to: '0xrecipient' as `0x${string}`,
          amount: '1',
          gasLimit: 50000,
          gasPrice: '20',
        },
        'user-id'
      );
      
      const callArgs = mockRetryService.executeWithRetry.mock.calls[0];
      expect(callArgs[1]).toMatchObject({
        to: '0xrecipient',
        value: BigInt(1e18),
        gasLimit: 50000,
        gasPrice: BigInt(20 * 1e9),
      });
    });
  });
});