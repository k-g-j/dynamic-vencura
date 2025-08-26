/**
 * Transaction retry service for handling blockchain operation failures
 * 
 * Implements exponential backoff and intelligent retry logic for:
 * - Network timeouts
 * - Gas price fluctuations
 * - Nonce conflicts
 * - Temporary blockchain congestion
 */

import { ethers } from 'ethers';
import { Logger } from '../utils/logger';

export interface RetryConfig {
  maxRetries: number;
  initialDelayMs: number;
  maxDelayMs: number;
  backoffMultiplier: number;
  retryableErrors: string[];
}

export type TransactionRequest = ethers.TransactionRequest;

const DEFAULT_RETRY_CONFIG: RetryConfig = {
  maxRetries: 3,
  initialDelayMs: 1000,
  maxDelayMs: 30000,
  backoffMultiplier: 2,
  retryableErrors: [
    'NETWORK_ERROR',
    'TIMEOUT',
    'SERVER_ERROR',
    'INSUFFICIENT_FUNDS',
    'NONCE_TOO_LOW',
    'REPLACEMENT_UNDERPRICED',
    'UNPREDICTABLE_GAS_LIMIT',
  ],
};

export class TransactionRetryService {
  private config: RetryConfig;
  private logger: Logger;

  constructor(config?: Partial<RetryConfig>) {
    this.config = { ...DEFAULT_RETRY_CONFIG, ...config };
    this.logger = new Logger();
  }

  /**
   * Execute transaction with automatic retry logic
   * 
   * @param wallet - Ethers wallet instance
   * @param transaction - Transaction request parameters
   * @returns Transaction response or throws after max retries
   */
  async executeWithRetry(
    wallet: ethers.Wallet,
    transaction: TransactionRequest
  ): Promise<ethers.TransactionResponse> {
    let lastError: Error | undefined;
    let attempt = 0;

    while (attempt < this.config.maxRetries) {
      try {
        this.logger.info(`Transaction attempt ${attempt + 1}/${this.config.maxRetries}`, {
          to: transaction.to,
          value: transaction.value?.toString(),
        });

        // Adjust gas parameters if this is a retry
        if (attempt > 0) {
          transaction = await this.adjustGasParameters(wallet, transaction, attempt);
        }

        // Send transaction
        const tx = await wallet.sendTransaction(transaction);
        
        this.logger.info(`Transaction sent successfully`, {
          hash: tx.hash,
          attempt: attempt + 1,
        });

        return tx;
      } catch (error) {
        lastError = error as Error;
        attempt++;

        this.logger.warn(`Transaction attempt ${attempt} failed`, {
          error: lastError.message,
          code: 'code' in lastError ? (lastError as Error & { code?: string }).code : undefined,
        });

        // Check if error is retryable
        if (!this.isRetryableError(lastError)) {
          this.logger.error('Non-retryable transaction error', lastError);
          throw lastError;
        }

        // Don't wait after last attempt
        if (attempt < this.config.maxRetries) {
          const delay = this.calculateDelay(attempt);
          this.logger.info(`Waiting ${delay}ms before retry...`);
          await this.sleep(delay);
        }
      }
    }

    // All retries exhausted
    this.logger.error(`Transaction failed after ${this.config.maxRetries} attempts`, lastError);
    
    // Parse the error message to make it user-friendly
    const userFriendlyMessage = this.parseErrorMessage(lastError?.message || 'Transaction failed');
    
    throw new Error(userFriendlyMessage);
  }

  /**
   * Wait for transaction confirmation with retry logic
   * 
   * @param tx - Transaction response
   * @param confirmations - Number of confirmations to wait for
   * @returns Transaction receipt
   */
  async waitForConfirmationWithRetry(
    tx: ethers.TransactionResponse,
    confirmations: number = 1
  ): Promise<ethers.TransactionReceipt | null> {
    let attempt = 0;
    let lastError: Error | undefined;

    while (attempt < this.config.maxRetries) {
      try {
        this.logger.info(`Waiting for transaction confirmation (attempt ${attempt + 1})`, {
          hash: tx.hash,
          confirmations,
        });

        const receipt = await tx.wait(confirmations);
        
        if (receipt && receipt.status === 1) {
          this.logger.info('Transaction confirmed successfully', {
            hash: tx.hash,
            blockNumber: receipt.blockNumber,
            gasUsed: receipt.gasUsed.toString(),
          });
          return receipt;
        } else if (receipt && receipt.status === 0) {
          throw new Error(`Transaction reverted: ${tx.hash}`);
        }
        
        return receipt;
      } catch (error) {
        lastError = error as Error;
        attempt++;

        this.logger.warn(`Confirmation attempt ${attempt} failed`, {
          error: lastError.message,
          hash: tx.hash,
        });

        if (attempt < this.config.maxRetries) {
          const delay = this.calculateDelay(attempt);
          await this.sleep(delay);
        }
      }
    }

    this.logger.error(`Failed to confirm transaction after ${attempt} attempts`, lastError);
    return null;
  }

  /**
   * Adjust gas parameters for retry attempts
   * 
   * @param wallet - Ethers wallet
   * @param transaction - Original transaction
   * @param attempt - Current retry attempt
   * @returns Adjusted transaction parameters
   */
  private async adjustGasParameters(
    wallet: ethers.Wallet,
    transaction: TransactionRequest,
    attempt: number
  ): Promise<TransactionRequest> {
    const provider = wallet.provider;
    if (!provider) {
      return transaction;
    }

    const adjustedTx = { ...transaction };

    try {
      // Get current gas price
      const feeData = await provider.getFeeData();
      
      if (feeData.gasPrice) {
        // Increase gas price by 10% per attempt for faster inclusion
        const multiplier = 1 + (0.1 * attempt);
        const adjustedGasPrice = feeData.gasPrice * BigInt(Math.floor(multiplier * 100)) / 100n;
        
        adjustedTx.gasPrice = adjustedGasPrice;
        
        this.logger.info('Adjusted gas price for retry', {
          original: feeData.gasPrice.toString(),
          adjusted: adjustedGasPrice.toString(),
          attempt,
        });
      }

      // Re-estimate gas limit if not explicitly set
      if (!transaction.gasLimit) {
        try {
          const estimatedGas = await provider.estimateGas(adjustedTx);
          // Add 20% buffer to gas estimate
          adjustedTx.gasLimit = estimatedGas * 120n / 100n;
          
          this.logger.info('Re-estimated gas limit', {
            estimated: estimatedGas.toString(),
            adjusted: adjustedTx.gasLimit.toString(),
          });
        } catch (estimateError) {
          this.logger.warn('Failed to estimate gas, using default', { error: estimateError });
          adjustedTx.gasLimit = 100000n; // Default gas limit
        }
      }

      // Handle nonce issues
      if (!transaction.nonce) {
        const nonce = await provider.getTransactionCount(wallet.address, 'pending');
        adjustedTx.nonce = nonce;
        
        this.logger.info('Set nonce for retry', { nonce });
      }
    } catch (error) {
      this.logger.warn('Failed to adjust gas parameters', { error });
    }

    return adjustedTx;
  }

  /**
   * Check if error is retryable based on error code/message
   * 
   * @param error - Error to check
   * @returns True if error is retryable
   */
  private isRetryableError(error: Error): boolean {
    const errorMessage = error.message.toUpperCase();
    const errorCode = 'code' in error ? (error as Error & { code?: string }).code?.toUpperCase() : undefined;

    // Check against retryable error patterns
    for (const retryableError of this.config.retryableErrors) {
      if (errorMessage.includes(retryableError) || errorCode === retryableError) {
        return true;
      }
    }

    // Check for specific ethers error codes
    if (errorCode) {
      const retryableCodes = [
        'NETWORK_ERROR',
        'TIMEOUT',
        'SERVER_ERROR',
        'UNKNOWN_ERROR',
        'NOT_IMPLEMENTED',
      ];
      
      if (retryableCodes.includes(errorCode)) {
        return true;
      }
    }

    // Check for rate limiting
    if (errorMessage.includes('RATE') || errorMessage.includes('THROTTL')) {
      return true;
    }

    // Check for temporary network issues
    if (
      errorMessage.includes('ETIMEDOUT') ||
      errorMessage.includes('ECONNREFUSED') ||
      errorMessage.includes('ENOTFOUND') ||
      errorMessage.includes('ECONNRESET')
    ) {
      return true;
    }

    return false;
  }

  /**
   * Parse blockchain error messages to make them user-friendly
   * 
   * @param message - Raw error message
   * @returns User-friendly error message
   */
  private parseErrorMessage(message: string): string {
    // Handle ethers.js coalesce errors
    if (message.includes('could not coalesce error')) {
      // Try to extract the actual error message from the JSON structure
      const errorMatch = message.match(/"message"\s*:\s*"([^"]+)"/);
      if (errorMatch && errorMatch[1]) {
        const innerMessage = errorMatch[1];
        return this.getReadableErrorMessage(innerMessage);
      }
      return 'Transaction failed. Please check gas settings and try again';
    }
    
    // Direct error parsing
    return this.getReadableErrorMessage(message);
  }

  /**
   * Convert technical blockchain errors to readable messages
   * 
   * @param message - Technical error message
   * @returns Human-readable error message
   */
  private getReadableErrorMessage(message: string): string {
    const lowerMessage = message.toLowerCase();
    
    if (lowerMessage.includes('intrinsic gas too low')) {
      const gasMatch = message.match(/minimum needed (\d+)/);
      const minGas = gasMatch && gasMatch[1] ? parseInt(gasMatch[1]).toLocaleString() : '21,000';
      return `Transaction failed: Gas limit too low. Please set at least ${minGas} gas`;
    }
    
    if (lowerMessage.includes('insufficient funds')) {
      return 'Transaction failed: Insufficient balance to cover transaction and gas fees';
    }
    
    if (lowerMessage.includes('gas required exceeds allowance')) {
      return 'Transaction failed: Gas limit exceeded. Please increase the gas limit';
    }
    
    if (lowerMessage.includes('replacement transaction underpriced')) {
      return 'Transaction failed: A transaction is already pending. Increase gas price to replace it';
    }
    
    if (lowerMessage.includes('nonce too low')) {
      return 'Transaction failed: Transaction conflict detected. Please try again';
    }
    
    if (lowerMessage.includes('already known')) {
      return 'Transaction failed: This transaction has already been submitted';
    }
    
    if (lowerMessage.includes('max fee per gas less than block base fee')) {
      return 'Transaction failed: Gas price too low for current network conditions';
    }
    
    if (lowerMessage.includes('execution reverted')) {
      return 'Transaction failed: Transaction would fail. Please verify the recipient address and amount';
    }
    
    if (lowerMessage.includes('timeout') || lowerMessage.includes('etimedout')) {
      return 'Transaction failed: Network timeout. Please try again';
    }
    
    if (lowerMessage.includes('network') || lowerMessage.includes('connection')) {
      return 'Transaction failed: Network connection error. Please check your connection';
    }
    
    // If we can't parse it, return a generic but clean message
    if (message.length > 100) {
      return 'Transaction failed. Please check your inputs and try again';
    }
    
    return `Transaction failed: ${message}`;
  }

  /**
   * Calculate delay for next retry using exponential backoff
   * 
   * @param attempt - Current attempt number
   * @returns Delay in milliseconds
   */
  private calculateDelay(attempt: number): number {
    const exponentialDelay = this.config.initialDelayMs * Math.pow(this.config.backoffMultiplier, attempt - 1);
    const jitteredDelay = exponentialDelay * (0.5 + Math.random() * 0.5); // Add jitter
    return Math.min(jitteredDelay, this.config.maxDelayMs);
  }

  /**
   * Sleep for specified milliseconds
   * 
   * @param ms - Milliseconds to sleep
   */
  private sleep(ms: number): Promise<void> {
    return new Promise(resolve => setTimeout(resolve, ms));
  }

  /**
   * Update retry configuration
   * 
   * @param config - New configuration values
   */
  updateConfig(config: Partial<RetryConfig>): void {
    this.config = { ...this.config, ...config };
  }

  /**
   * Get current retry configuration
   * 
   * @returns Current retry configuration
   */
  getConfig(): RetryConfig {
    return { ...this.config };
  }
}