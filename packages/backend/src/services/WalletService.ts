import { ethers, Wallet as EthersWallet } from 'ethers';
import { Repository } from 'typeorm';
import { AppDataSource } from '../config/database';
import { Wallet } from '../entities/Wallet';
import { Transaction } from '../entities/Transaction';
import { SignedMessage } from '../entities/SignedMessage';
import { encrypt, decrypt } from '../utils/crypto';
import { env } from '../config/env';
import { TransactionRetryService } from './TransactionRetryService';
import { WebSocketService } from './WebSocketService';
import { AuditService, AuditEventType } from './AuditService';
import { GasEstimationService } from './GasEstimationService';
import { logger } from '../utils/logger';
import {
  NotFoundError,
  InsufficientBalanceError,
} from '../utils/errors';
import type {
  CreateWalletRequest,
  SignMessageRequest,
  SendTransactionRequest,
  GetBalanceRequest,
  WalletResponse,
  BalanceResponse,
  SignedMessageResponse,
  TransactionResponse,
} from '@vencura/shared';

/**
 * Service layer for wallet operations
 * 
 * Handles all blockchain interactions and wallet management including:
 * - Wallet creation with secure key generation
 * - Balance queries from blockchain
 * - Message signing for authentication
 * - Transaction sending with gas optimization
 * - Transaction history tracking
 */
export class WalletService {
  private walletRepository: Repository<Wallet>;
  private transactionRepository: Repository<Transaction>;
  private signedMessageRepository: Repository<SignedMessage>;
  private provider: ethers.JsonRpcProvider;
  private retryService: TransactionRetryService;
  private gasEstimationService: GasEstimationService;
  private websocketService?: WebSocketService;
  private auditService: AuditService;

  constructor() {
    this.walletRepository = AppDataSource.getRepository(Wallet);
    this.transactionRepository = AppDataSource.getRepository(Transaction);
    this.signedMessageRepository = AppDataSource.getRepository(SignedMessage);
    this.provider = new ethers.JsonRpcProvider(env.SEPOLIA_RPC_URL);
    this.retryService = new TransactionRetryService();
    this.gasEstimationService = new GasEstimationService(this.provider);
    this.auditService = AuditService.getInstance();
    
    // WebSocket service might not be initialized yet
    try {
      this.websocketService = WebSocketService.getInstance();
    } catch {
      // WebSocket service not initialized yet
    }
  }

  /**
   * Creates a new custodial wallet with encrypted private key storage
   * 
   * Security flow:
   * 1. Generate cryptographically secure random private key
   * 2. Encrypt private key using AES-256-GCM before storage
   * 3. Store only encrypted key in database
   * 4. Return public wallet information (never expose private key)
   * 
   * @param data - Wallet creation request with name and user ID
   * @returns Public wallet information without private key
   */
  async createWallet(data: CreateWalletRequest): Promise<WalletResponse> {
    // Generate new random wallet with secure entropy
    const ethersWallet = EthersWallet.createRandom();
    
    // Encrypt private key before any storage operation
    const encryptedPrivateKey = encrypt(ethersWallet.privateKey);

    // Create wallet entity with encrypted key only
    const wallet = this.walletRepository.create({
      name: data.name,
      address: ethersWallet.address,
      encryptedPrivateKey,
      userId: data.userId,
    });

    const savedWallet = await this.walletRepository.save(wallet);

    // Return only public information
    return {
      id: savedWallet.id,
      address: savedWallet.address as `0x${string}`,
      name: savedWallet.name,
      userId: savedWallet.userId,
      createdAt: savedWallet.createdAt.toISOString(),
      updatedAt: savedWallet.updatedAt.toISOString(),
    };
  }

  /**
   * Retrieve a specific wallet with ownership validation
   * 
   * Internal method to fetch wallet entity from database while ensuring
   * the authenticated user owns the requested wallet. Throws NotFoundError
   * if wallet doesn't exist or doesn't belong to the user.
   * 
   * @param walletId - UUID of the wallet to retrieve
   * @param userId - UUID of the authenticated user for ownership validation
   * @returns Promise resolving to wallet entity with encrypted private key
   * @throws {NotFoundError} When wallet not found or user lacks access
   * 
   * @private This method is used internally by other service methods
   */
  async getWallet(walletId: string, userId: string): Promise<Wallet> {
    const wallet = await this.walletRepository.findOne({
      where: { id: walletId, userId },
    });

    if (!wallet) {
      throw new NotFoundError('Wallet', walletId);
    }

    return wallet;
  }

  /**
   * Retrieve all wallets belonging to a specific user
   * 
   * Fetches all custodial wallets associated with the authenticated user,
   * ordered by creation date (newest first). Private keys are never included
   * in the response for security.
   * 
   * @param userId - UUID of the user whose wallets to retrieve
   * @returns Promise resolving to array of wallet response objects (no private keys)
   * 
   * @example
   * ```typescript
   * const userWallets = await walletService.getUserWallets(userId);
   * // Returns array of wallet objects with public information
   * ```
   */
  async getUserWallets(userId: string): Promise<WalletResponse[]> {
    const wallets = await this.walletRepository.find({
      where: { userId },
      order: { createdAt: 'DESC' },
    });

    return wallets.map((wallet) => ({
      id: wallet.id,
      address: wallet.address as `0x${string}`,
      name: wallet.name,
      userId: wallet.userId,
      createdAt: wallet.createdAt.toISOString(),
      updatedAt: wallet.updatedAt.toISOString(),
    }));
  }

  /**
   * Queries current wallet balance from blockchain
   * 
   * @param data - Request containing wallet ID
   * @param userId - User ID for access control
   * @returns Balance in wei and formatted ETH
   */
  async getBalance(data: GetBalanceRequest, userId: string): Promise<BalanceResponse> {
    // Verify wallet ownership before balance query
    const wallet = await this.getWallet(data.walletId, userId);
    
    // Query current balance from blockchain RPC
    const balance = await this.provider.getBalance(wallet.address);

    return {
      walletId: wallet.id,
      address: wallet.address,
      balance: balance.toString(), // Balance in wei (smallest unit)
      formattedBalance: ethers.formatEther(balance), // Human-readable ETH
    };
  }

  /**
   * Signs a message with wallet's private key for authentication
   * 
   * Creates an audit trail by storing signed messages in database.
   * Used for proving wallet ownership without exposing private key.
   * 
   * @param data - Message to sign and wallet ID
   * @param userId - User ID for access control
   * @returns Signed message with cryptographic signature
   */
  async signMessage(data: SignMessageRequest, userId: string): Promise<SignedMessageResponse> {
    // Verify wallet ownership
    const wallet = await this.getWallet(data.walletId, userId);
    
    // Decrypt private key in memory only
    const privateKey = decrypt(wallet.encryptedPrivateKey);
    const ethersWallet = new EthersWallet(privateKey);
    
    // Create EIP-191 signature
    const signature = await ethersWallet.signMessage(data.message);

    // Store signature for audit trail
    const signedMessage = this.signedMessageRepository.create({
      walletId: wallet.id,
      message: data.message,
      signature,
    });

    await this.signedMessageRepository.save(signedMessage);

    return {
      walletId: wallet.id,
      message: data.message,
      signature,
    };
  }

  /**
   * Sends an Ethereum transaction from custodial wallet
   * 
   * Security and reliability features:
   * - Balance validation before sending
   * - Gas optimization with configurable parameters
   * - Async status tracking with blockchain confirmations
   * - Transaction history for audit trail
   * 
   * Transaction lifecycle:
   * 1. Validate sufficient balance (including gas fees)
   * 2. Prepare transaction with gas parameters
   * 3. Sign and broadcast to blockchain
   * 4. Store pending transaction in database
   * 5. Asynchronously update status after confirmation
   * 
   * Gas handling:
   * - Automatic gas estimation if not provided
   * - Support for custom gas limits and prices
   * - Retry logic with gas price bumping on failures
   * - EIP-1559 compatible (maxFeePerGas/maxPriorityFeePerGas)
   * 
   * Error scenarios:
   * - Insufficient balance: Throws InsufficientBalanceError
   * - Network issues: Handled by retry service
   * - Invalid recipient: Validated by ethers.js
   * - Gas too low: Automatically adjusted in retry logic
   * 
   * @param data - Transaction details (recipient, amount, gas)
   * @param userId - User ID for access control
   * @returns Transaction details with hash for tracking
   * @throws InsufficientBalanceError if balance < amount + estimated gas
   * @throws BlockchainError for network issues after retries exhausted
   * 
   * @example
   * ```typescript
   * const tx = await walletService.sendTransaction({
   *   walletId: 'abc-123',
   *   to: '0x742d35Cc6634C0532925a3b844Bc9e7595f0bEb4',
   *   amount: '0.1', // ETH amount as string
   *   gasLimit: 21000, // Optional: defaults to estimation
   *   gasPrice: '20' // Optional: in gwei
   * }, userId);
   * 
   * // Transaction is now pending
   * // Transaction hash available in tx.transactionHash
   * // Status updates via WebSocket or polling getTransactionHistory
   * ```
   */
  async sendTransaction(data: SendTransactionRequest, userId: string): Promise<TransactionResponse> {
    // Step 1: Verify wallet ownership and get wallet details
    const wallet = await this.getWallet(data.walletId, userId);
    
    // Step 2: Decrypt private key for transaction signing (secure in-memory operation)
    const privateKey = decrypt(wallet.encryptedPrivateKey);
    const ethersWallet = new EthersWallet(privateKey, this.provider);

    // Step 3: Prepare base transaction request
    const amountWei = ethers.parseEther(data.amount.toString());
    const baseTransaction: ethers.TransactionRequest = {
      to: data.to as string,
      value: amountWei,
      from: wallet.address,
    };

    // Step 4: Estimate gas if not provided
    let transactionRequest = baseTransaction;
    if (!data.gasLimit || !data.gasPrice) {
      const urgency = this.determineTransactionUrgency(data.amount);
      const gasEstimate = await this.gasEstimationService.estimateGas(baseTransaction, urgency);
      
      transactionRequest = {
        ...baseTransaction,
        gasLimit: data.gasLimit ?? gasEstimate.gasLimit,
      };

      // Apply gas pricing based on network support
      if (gasEstimate.maxFeePerGas && gasEstimate.maxPriorityFeePerGas) {
        // EIP-1559 transaction
        transactionRequest.maxFeePerGas = gasEstimate.maxFeePerGas;
        transactionRequest.maxPriorityFeePerGas = gasEstimate.maxPriorityFeePerGas;
      } else if (data.gasPrice) {
        // Use provided gas price
        transactionRequest.gasPrice = ethers.parseUnits(data.gasPrice, 'gwei');
      } else if (gasEstimate.gasPrice) {
        // Use estimated gas price
        transactionRequest.gasPrice = gasEstimate.gasPrice;
      }
      
      // Log gas estimation details
      await this.auditService.logTransactionOperation(
        AuditEventType.TRANSACTION_INITIATED,
        userId,
        wallet.id,
        undefined,
        {
          action: 'gas_estimation',
          estimatedCostETH: gasEstimate.estimatedCostETH,
          congestionLevel: gasEstimate.congestionLevel,
        }
      );
      
      // Step 5: Validate balance including gas costs
      const totalCost = amountWei + gasEstimate.estimatedCost;
      const balance = await this.provider.getBalance(wallet.address);
      
      if (balance < totalCost) {
        throw new InsufficientBalanceError(
          totalCost.toString(),
          balance.toString(),
          wallet.address
        );
      }
    } else {
      // Manual gas parameters provided
      transactionRequest.gasLimit = data.gasLimit;
      if (data.gasPrice) {
        transactionRequest.gasPrice = ethers.parseUnits(data.gasPrice, 'gwei');
      }
      
      // Basic balance check
      const balance = await this.provider.getBalance(wallet.address);
      if (balance < amountWei) {
        throw new InsufficientBalanceError(
          amountWei.toString(),
          balance.toString(),
          wallet.address
        );
      }
    }

    // Sign and broadcast transaction with retry mechanism
    const tx = await this.retryService.executeWithRetry(ethersWallet, transactionRequest);

    // Store transaction record immediately as pending
    const transactionData: Partial<Transaction> = {
      walletId: wallet.id,
      transactionHash: tx.hash,
      from: wallet.address,
      to: data.to,
      amount: amountWei.toString(),
      status: 'pending',
    };
    
    if (data.gasPrice) {
      transactionData.gasPrice = data.gasPrice;
    }
    
    const transaction = this.transactionRepository.create(transactionData);
    const savedTransaction = await this.transactionRepository.save(transaction) as unknown as Transaction;

    // Emit pending transaction via WebSocket
    if (this.websocketService) {
      this.websocketService.emitTransactionUpdate(userId, {
        walletId: wallet.id,
        transactionHash: tx.hash,
        status: 'pending',
      });
    }

    await this.auditService.logTransactionOperation(
      AuditEventType.TRANSACTION_INITIATED,
      userId,
      wallet.id,
      tx.hash,
      { to: data.to, amount: amountWei.toString() }
    );

    // Asynchronously wait for blockchain confirmation with retry
    // This doesn't block the API response
    this.retryService.waitForConfirmationWithRetry(tx, 1).then(async (receipt) => {
      if (receipt) {
        // Update status based on blockchain confirmation
        savedTransaction.status = receipt.status === 1 ? 'confirmed' : 'failed';
        savedTransaction.blockNumber = receipt.blockNumber;
        savedTransaction.gasUsed = receipt.gasUsed.toString();
        await this.transactionRepository.save(savedTransaction);
        
        // Emit status update via WebSocket
        if (this.websocketService) {
          this.websocketService.emitTransactionUpdate(userId, {
            walletId: wallet.id,
            transactionHash: tx.hash,
            status: savedTransaction.status as 'confirmed' | 'failed',
            blockNumber: receipt.blockNumber,
            gasUsed: receipt.gasUsed.toString(),
          });
        }
        
        await this.auditService.logTransactionOperation(
          savedTransaction.status === 'confirmed' ? 
            AuditEventType.TRANSACTION_CONFIRMED : 
            AuditEventType.TRANSACTION_FAILED,
          userId,
          wallet.id,
          tx.hash,
          { blockNumber: receipt.blockNumber, gasUsed: receipt.gasUsed.toString() }
        );
      } else {
        // Transaction confirmation failed after retries
        savedTransaction.status = 'failed';
        await this.transactionRepository.save(savedTransaction);
        
        // Emit failure via WebSocket
        if (this.websocketService) {
          this.websocketService.emitTransactionUpdate(userId, {
            walletId: wallet.id,
            transactionHash: tx.hash,
            status: 'failed',
            error: 'Confirmation timeout',
          });
        }
        
        await this.auditService.logTransactionOperation(
          AuditEventType.TRANSACTION_FAILED,
          userId,
          wallet.id,
          tx.hash,
          { reason: 'Confirmation timeout' }
        );
      }
    }).catch(async (error) => {
      // Handle transaction failure with detailed logging
      logger.error('Transaction confirmation failed after retries', undefined, {
        transactionHash: tx.hash,
        walletId: wallet.id,
        error: error.message,
        code: error.code,
      });
      savedTransaction.status = 'failed';
      await this.transactionRepository.save(savedTransaction);
      
      // Emit failure via WebSocket
      if (this.websocketService) {
        this.websocketService.emitTransactionUpdate(userId, {
          walletId: wallet.id,
          transactionHash: tx.hash,
          status: 'failed',
          error: error.message,
        });
      }
      
      await this.auditService.logTransactionOperation(
        AuditEventType.TRANSACTION_FAILED,
        userId,
        wallet.id,
        tx.hash,
        { error: error.message, code: error.code }
      );
    });

    // Return immediately with pending status
    return {
      walletId: wallet.id,
      transactionHash: tx.hash,
      from: wallet.address as `0x${string}`,
      to: data.to,
      amount: amountWei.toString(),
      status: 'pending',
    };
  }

  /**
   * Retrieve transaction history for a specific wallet
   * 
   * Fetches all blockchain transactions associated with the specified wallet,
   * ordered by creation date (newest first). Includes both pending and confirmed
   * transactions with their current status from the blockchain.
   * 
   * Security: Validates wallet ownership before returning transaction data
   * to ensure users can only access their own transaction history.
   * 
   * @param walletId - UUID of the wallet to get transactions for
   * @param userId - UUID of the authenticated user for ownership validation
   * @returns Promise resolving to array of transaction response objects
   * @throws {NotFoundError} When wallet not found or user lacks access
   * 
   * @example
   * ```typescript
   * const history = await walletService.getTransactionHistory(walletId, userId);
   * const pendingTxs = history.filter(tx => tx.status === 'pending');
   * ```
   */
  async getTransactionHistory(walletId: string, userId: string): Promise<TransactionResponse[]> {
    const wallet = await this.getWallet(walletId, userId);
    
    const transactions = await this.transactionRepository.find({
      where: { walletId: wallet.id },
      order: { createdAt: 'DESC' },
    });

    // Check and update status of pending transactions
    const pendingTransactions = transactions.filter(tx => tx.status === 'pending');
    
    if (pendingTransactions.length > 0) {
      // Check each pending transaction status on blockchain
      await Promise.all(pendingTransactions.map(async (tx) => {
        try {
          const receipt = await this.provider.getTransactionReceipt(tx.transactionHash);
          
          if (receipt) {
            // Transaction has been mined, update status
            tx.status = receipt.status === 1 ? 'confirmed' : 'failed';
            tx.blockNumber = receipt.blockNumber;
            tx.gasUsed = receipt.gasUsed.toString();
            
            // Save updated status to database
            await this.transactionRepository.save(tx);
            
            // Emit status update via WebSocket if available
            if (this.websocketService) {
              this.websocketService.emitTransactionUpdate(userId, {
                walletId: wallet.id,
                transactionHash: tx.transactionHash,
                status: tx.status as 'confirmed' | 'failed',
                blockNumber: receipt.blockNumber,
                gasUsed: receipt.gasUsed.toString(),
              });
            }
            
            // Log the status update
            await this.auditService.logTransactionOperation(
              tx.status === 'confirmed' ? 
                AuditEventType.TRANSACTION_CONFIRMED : 
                AuditEventType.TRANSACTION_FAILED,
              userId,
              wallet.id,
              tx.transactionHash,
              { blockNumber: receipt.blockNumber, gasUsed: receipt.gasUsed.toString() }
            );
          }
        } catch (error) {
          // Transaction not found or network error, keep as pending
          console.error(`Failed to check transaction status for ${tx.transactionHash}:`, error);
        }
      }));
    }

    return transactions.map((tx) => ({
      walletId: tx.walletId,
      transactionHash: tx.transactionHash,
      from: tx.from as `0x${string}`,
      to: tx.to as `0x${string}`,
      amount: tx.amount,
      status: tx.status,
      gasUsed: tx.gasUsed,
      blockNumber: tx.blockNumber,
    }));
  }

  /**
   * Determine transaction urgency based on amount
   * 
   * Higher value transactions get higher priority for faster confirmation
   * 
   * @param amount - Transaction amount in ETH
   * @returns Urgency level for gas pricing
   */
  private determineTransactionUrgency(amount: string | number): 'low' | 'medium' | 'high' {
    const amountETH = parseFloat(amount.toString());
    
    if (amountETH < 0.01) {
      return 'low'; // Small transactions can wait
    } else if (amountETH < 1) {
      return 'medium'; // Standard priority
    } else {
      return 'high'; // High value transactions get priority
    }
  }
}