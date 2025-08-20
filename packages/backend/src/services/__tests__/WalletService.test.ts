/**
 * Unit tests for WalletService
 */

import { WalletService } from '../WalletService';
import { AppDataSource } from '../../config/database';
import { Wallet } from '../../entities/Wallet';
import { Transaction } from '../../entities/Transaction';
import { SignedMessage } from '../../entities/SignedMessage';
import { encrypt, decrypt } from '../../utils/crypto';
import { ethers } from 'ethers';

jest.mock('../../config/database');
jest.mock('../../utils/crypto');

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
      if (entity === Wallet) return mockWalletRepository;
      if (entity === Transaction) return mockTransactionRepository;
      if (entity === SignedMessage) return mockSignedMessageRepository;
      return null;
    });

    walletService = new WalletService();
  });

  afterEach(() => {
    jest.clearAllMocks();
  });

  describe('createWallet', () => {
    it('should create a new wallet successfully', async () => {
      const mockWallet = {
        id: 'wallet-id',
        name: 'Test Wallet',
        address: '0x1234567890123456789012345678901234567890',
        encryptedPrivateKey: 'encrypted-key',
        userId: 'user-id',
        createdAt: new Date(),
        updatedAt: new Date(),
      };

      mockWalletRepository.create.mockReturnValue(mockWallet);
      mockWalletRepository.save.mockResolvedValue(mockWallet);
      (encrypt as jest.Mock).mockReturnValue('encrypted-key');

      const result = await walletService.createWallet({
        name: 'Test Wallet',
        userId: 'user-id',
      });

      expect(result).toHaveProperty('id');
      expect(result).toHaveProperty('address');
      expect(result.name).toBe('Test Wallet');
      expect(result.userId).toBe('user-id');
      expect(mockWalletRepository.save).toHaveBeenCalled();
    });

    it('should encrypt the private key before storing', async () => {
      const mockWallet = {
        id: 'wallet-id',
        name: 'Test Wallet',
        address: '0x1234567890123456789012345678901234567890',
        encryptedPrivateKey: 'encrypted-key',
        userId: 'user-id',
        createdAt: new Date(),
        updatedAt: new Date(),
      };

      mockWalletRepository.create.mockReturnValue(mockWallet);
      mockWalletRepository.save.mockResolvedValue(mockWallet);
      (encrypt as jest.Mock).mockReturnValue('encrypted-key');

      await walletService.createWallet({
        name: 'Test Wallet',
        userId: 'user-id',
      });

      expect(encrypt).toHaveBeenCalled();
    });
  });

  describe('getWallet', () => {
    it('should retrieve a wallet by id and userId', async () => {
      const mockWallet = {
        id: 'wallet-id',
        userId: 'user-id',
        address: '0x1234567890123456789012345678901234567890',
      };

      mockWalletRepository.findOne.mockResolvedValue(mockWallet);

      const result = await walletService.getWallet('wallet-id', 'user-id');

      expect(result).toEqual(mockWallet);
      expect(mockWalletRepository.findOne).toHaveBeenCalledWith({
        where: { id: 'wallet-id', userId: 'user-id' },
      });
    });

    it('should throw error if wallet not found', async () => {
      mockWalletRepository.findOne.mockResolvedValue(null);

      await expect(
        walletService.getWallet('wallet-id', 'user-id')
      ).rejects.toThrow('Wallet not found or access denied');
    });
  });

  describe('getUserWallets', () => {
    it('should retrieve all wallets for a user', async () => {
      const mockWallets = [
        {
          id: 'wallet-1',
          address: '0x1234567890123456789012345678901234567890',
          name: 'Wallet 1',
          userId: 'user-id',
          createdAt: new Date(),
          updatedAt: new Date(),
        },
        {
          id: 'wallet-2',
          address: '0x0987654321098765432109876543210987654321',
          name: 'Wallet 2',
          userId: 'user-id',
          createdAt: new Date(),
          updatedAt: new Date(),
        },
      ];

      mockWalletRepository.find.mockResolvedValue(mockWallets);

      const result = await walletService.getUserWallets('user-id');

      expect(result).toHaveLength(2);
      expect(result[0]?.id).toBe('wallet-1');
      expect(result[1]?.id).toBe('wallet-2');
    });
  });

  describe('getBalance', () => {
    it('should retrieve wallet balance', async () => {
      const mockWallet = {
        id: 'wallet-id',
        address: '0x1234567890123456789012345678901234567890',
      };

      mockWalletRepository.findOne.mockResolvedValue(mockWallet);

      const mockProvider = {
        getBalance: jest.fn().mockResolvedValue(ethers.parseEther('1.5')),
      };
      (walletService as any).provider = mockProvider;

      const result = await walletService.getBalance(
        { walletId: 'wallet-id' },
        'user-id'
      );

      expect(result.walletId).toBe('wallet-id');
      expect(result.formattedBalance).toBe('1.5');
    });
  });

  describe('signMessage', () => {
    it('should sign a message with wallet private key', async () => {
      const mockWallet = {
        id: 'wallet-id',
        address: '0x1234567890123456789012345678901234567890',
        encryptedPrivateKey: 'encrypted-key',
      };

      const mockSignedMessage = {
        id: 'signed-message-id',
        walletId: 'wallet-id',
        message: 'Test message',
        signature: 'signature-hash',
      };

      mockWalletRepository.findOne.mockResolvedValue(mockWallet);
      mockSignedMessageRepository.create.mockReturnValue(mockSignedMessage);
      mockSignedMessageRepository.save.mockResolvedValue(mockSignedMessage);
      (decrypt as jest.Mock).mockReturnValue('0x0123456789abcdef0123456789abcdef0123456789abcdef0123456789abcdef');

      const result = await walletService.signMessage(
        { walletId: 'wallet-id', message: 'Test message' },
        'user-id'
      );

      expect(result.walletId).toBe('wallet-id');
      expect(result.message).toBe('Test message');
      expect(result).toHaveProperty('signature');
    });
  });

  describe('sendTransaction', () => {
    it('should send a transaction successfully', async () => {
      const mockWallet = {
        id: 'wallet-id',
        address: '0x1234567890123456789012345678901234567890',
        encryptedPrivateKey: 'encrypted-key',
      };

      const mockTransaction = {
        id: 'tx-id',
        walletId: 'wallet-id',
        transactionHash: '0xhash',
        from: '0x1234567890123456789012345678901234567890',
        to: '0x0987654321098765432109876543210987654321',
        amount: ethers.parseEther('0.1').toString(),
        status: 'pending',
      };

      mockWalletRepository.findOne.mockResolvedValue(mockWallet);
      mockTransactionRepository.create.mockReturnValue(mockTransaction);
      mockTransactionRepository.save.mockResolvedValue(mockTransaction);
      (decrypt as jest.Mock).mockReturnValue('0x0123456789abcdef0123456789abcdef0123456789abcdef0123456789abcdef');

      const mockProvider = {
        getBalance: jest.fn().mockResolvedValue(ethers.parseEther('1.0')),
      };
      (walletService as any).provider = mockProvider;

      const mockEthersWallet = {
        sendTransaction: jest.fn().mockResolvedValue({
          hash: '0xhash',
          wait: jest.fn().mockResolvedValue({
            status: 1,
            blockNumber: 12345,
            gasUsed: ethers.parseUnits('21000', 'wei'),
          }),
        }),
      };
      jest.spyOn(ethers, 'Wallet').mockImplementation(() => mockEthersWallet as any);

      const result = await walletService.sendTransaction(
        {
          walletId: 'wallet-id',
          to: '0x0987654321098765432109876543210987654321' as `0x${string}`,
          amount: 0.1,
        },
        'user-id'
      );

      expect(result.walletId).toBe('wallet-id');
      expect(result.transactionHash).toBe('0xhash');
      expect(result.status).toBe('pending');
    });

    it('should throw error for insufficient balance', async () => {
      const mockWallet = {
        id: 'wallet-id',
        address: '0x1234567890123456789012345678901234567890',
        encryptedPrivateKey: 'encrypted-key',
      };

      mockWalletRepository.findOne.mockResolvedValue(mockWallet);
      (decrypt as jest.Mock).mockReturnValue('0x0123456789abcdef0123456789abcdef0123456789abcdef0123456789abcdef');

      const mockProvider = {
        getBalance: jest.fn().mockResolvedValue(ethers.parseEther('0.05')),
      };
      (walletService as any).provider = mockProvider;

      await expect(
        walletService.sendTransaction(
          {
            walletId: 'wallet-id',
            to: '0x0987654321098765432109876543210987654321' as `0x${string}`,
            amount: 0.1,
          },
          'user-id'
        )
      ).rejects.toThrow('Insufficient balance');
    });
  });
});