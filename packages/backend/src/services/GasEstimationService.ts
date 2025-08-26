/**
 * Gas estimation service for optimizing transaction costs
 * 
 * Provides intelligent gas estimation with:
 * - Dynamic gas price calculation based on network conditions
 * - EIP-1559 support (maxFeePerGas/maxPriorityFeePerGas)
 * - Historical gas usage analysis
 * - Buffer calculations for safety
 * - Network congestion detection
 */

import { ethers } from 'ethers';
import { Logger } from '../utils/logger';

export interface GasEstimate {
  gasLimit: bigint;
  gasPrice?: bigint;
  maxFeePerGas?: bigint;
  maxPriorityFeePerGas?: bigint;
  estimatedCost: bigint;
  estimatedCostETH: string;
  isEIP1559: boolean;
  congestionLevel: 'low' | 'medium' | 'high';
}

export interface GasEstimationConfig {
  bufferPercentage: number; // Additional buffer for gas limit (default: 20%)
  priorityMultiplier: number; // Multiplier for priority fee (default: 1.5)
  maxGasPrice: bigint; // Maximum acceptable gas price in wei
  useEIP1559: boolean; // Use EIP-1559 pricing when available
}

const DEFAULT_CONFIG: GasEstimationConfig = {
  bufferPercentage: 20,
  priorityMultiplier: 1.5,
  maxGasPrice: ethers.parseUnits('500', 'gwei'), // 500 gwei max
  useEIP1559: true,
};

export class GasEstimationService {
  private provider: ethers.JsonRpcProvider;
  private config: GasEstimationConfig;
  private logger: Logger;
  private historicalGasUsage: Map<string, bigint[]> = new Map();

  constructor(provider: ethers.JsonRpcProvider, config?: Partial<GasEstimationConfig>) {
    this.provider = provider;
    this.config = { ...DEFAULT_CONFIG, ...config };
    this.logger = new Logger();
  }

  /**
   * Estimate gas for a transaction with intelligent pricing
   * 
   * @param transaction - Transaction parameters
   * @param urgency - Transaction urgency level affects gas price
   * @returns Comprehensive gas estimation
   */
  async estimateGas(
    transaction: ethers.TransactionRequest,
    urgency: 'low' | 'medium' | 'high' = 'medium'
  ): Promise<GasEstimate> {
    try {
      // Step 1: Estimate gas limit
      const estimatedGasLimit = await this.estimateGasLimit(transaction);
      
      // Step 2: Get current gas pricing
      const gasPricing = await this.getGasPricing(urgency);
      
      // Step 3: Calculate total estimated cost
      const estimatedCost = this.calculateEstimatedCost(estimatedGasLimit, gasPricing);
      
      // Step 4: Detect network congestion
      const congestionLevel = await this.detectCongestion();
      
      // Step 5: Apply historical adjustments if available
      const adjustedGasLimit = this.applyHistoricalAdjustment(
        transaction.to?.toString() || '',
        estimatedGasLimit
      );

      this.logger.info('Gas estimation completed', {
        gasLimit: adjustedGasLimit.toString(),
        gasPrice: gasPricing.gasPrice?.toString(),
        maxFeePerGas: gasPricing.maxFeePerGas?.toString(),
        estimatedCostETH: ethers.formatEther(estimatedCost),
        urgency,
        congestionLevel,
      });

      return {
        gasLimit: adjustedGasLimit,
        ...gasPricing,
        estimatedCost,
        estimatedCostETH: ethers.formatEther(estimatedCost),
        isEIP1559: !!gasPricing.maxFeePerGas,
        congestionLevel,
      };
    } catch (error) {
      this.logger.error('Gas estimation failed', error);
      
      // Fallback to safe defaults
      return this.getFallbackEstimate();
    }
  }

  /**
   * Estimate gas limit for a transaction
   * 
   * @param transaction - Transaction to estimate
   * @returns Gas limit with buffer
   */
  private async estimateGasLimit(transaction: ethers.TransactionRequest): Promise<bigint> {
    try {
      // Use provider's gas estimation
      const estimated = await this.provider.estimateGas(transaction);
      
      // Apply buffer for safety
      const bufferMultiplier = BigInt(100 + this.config.bufferPercentage);
      const bufferedGasLimit = (estimated * bufferMultiplier) / 100n;
      
      this.logger.info('Gas limit estimated', {
        raw: estimated.toString(),
        buffered: bufferedGasLimit.toString(),
        bufferPercentage: this.config.bufferPercentage,
      });
      
      return bufferedGasLimit;
    } catch (error) {
      this.logger.warn('Gas limit estimation failed, using defaults', { error });
      
      // Common default gas limits
      if (!transaction.data || transaction.data === '0x') {
        // Simple ETH transfer
        return 21000n * 120n / 100n; // 21000 + 20% buffer
      } else {
        // Contract interaction
        return 100000n * 120n / 100n; // 100000 + 20% buffer
      }
    }
  }

  /**
   * Get current gas pricing based on network conditions
   * 
   * @param urgency - Transaction urgency level
   * @returns Gas pricing parameters
   */
  private async getGasPricing(urgency: 'low' | 'medium' | 'high'): Promise<{
    gasPrice?: bigint;
    maxFeePerGas?: bigint;
    maxPriorityFeePerGas?: bigint;
  }> {
    const feeData = await this.provider.getFeeData();
    
    // Check if network supports EIP-1559
    if (this.config.useEIP1559 && feeData.maxFeePerGas && feeData.maxPriorityFeePerGas) {
      // EIP-1559 pricing
      const priorityMultiplier = this.getUrgencyMultiplier(urgency);
      
      const maxPriorityFeePerGas = (feeData.maxPriorityFeePerGas * BigInt(Math.floor(priorityMultiplier * 100))) / 100n;
      const maxFeePerGas = feeData.maxFeePerGas + maxPriorityFeePerGas;
      
      // Apply max gas price cap
      const cappedMaxFee = maxFeePerGas > this.config.maxGasPrice 
        ? this.config.maxGasPrice 
        : maxFeePerGas;
      
      return {
        maxFeePerGas: cappedMaxFee,
        maxPriorityFeePerGas,
      };
    } else if (feeData.gasPrice) {
      // Legacy pricing
      const multiplier = this.getUrgencyMultiplier(urgency);
      const adjustedGasPrice = (feeData.gasPrice * BigInt(Math.floor(multiplier * 100))) / 100n;
      
      // Apply max gas price cap
      const cappedGasPrice = adjustedGasPrice > this.config.maxGasPrice 
        ? this.config.maxGasPrice 
        : adjustedGasPrice;
      
      return {
        gasPrice: cappedGasPrice,
      };
    }
    
    // Fallback pricing
    return {
      gasPrice: ethers.parseUnits('20', 'gwei'),
    };
  }

  /**
   * Calculate estimated transaction cost
   * 
   * @param gasLimit - Gas limit for transaction
   * @param pricing - Gas pricing parameters
   * @returns Estimated cost in wei
   */
  private calculateEstimatedCost(
    gasLimit: bigint,
    pricing: { gasPrice?: bigint; maxFeePerGas?: bigint }
  ): bigint {
    if (pricing.maxFeePerGas) {
      return gasLimit * pricing.maxFeePerGas;
    } else if (pricing.gasPrice) {
      return gasLimit * pricing.gasPrice;
    }
    
    // Fallback calculation
    return gasLimit * ethers.parseUnits('20', 'gwei');
  }

  /**
   * Detect network congestion level
   * 
   * @returns Congestion level based on gas prices
   */
  private async detectCongestion(): Promise<'low' | 'medium' | 'high'> {
    try {
      const feeData = await this.provider.getFeeData();
      const gasPrice = feeData.gasPrice || feeData.maxFeePerGas;
      
      if (!gasPrice) return 'medium';
      
      const gasPriceGwei = Number(ethers.formatUnits(gasPrice, 'gwei'));
      
      if (gasPriceGwei < 20) return 'low';
      if (gasPriceGwei < 50) return 'medium';
      return 'high';
    } catch {
      return 'medium';
    }
  }

  /**
   * Apply historical gas usage patterns
   * 
   * @param address - Contract address (for tracking patterns)
   * @param estimatedGasLimit - Current gas limit estimate
   * @returns Adjusted gas limit based on history
   */
  private applyHistoricalAdjustment(address: string, estimatedGasLimit: bigint): bigint {
    if (!address) return estimatedGasLimit;
    
    const history = this.historicalGasUsage.get(address);
    if (!history || history.length === 0) return estimatedGasLimit;
    
    // Calculate average historical usage
    const totalUsage = history.reduce((sum, usage) => sum + usage, 0n);
    const averageUsage = totalUsage / BigInt(history.length);
    
    // If historical average is higher, use it with buffer
    if (averageUsage > estimatedGasLimit) {
      const adjustedLimit = (averageUsage * 110n) / 100n; // 10% buffer on historical average
      
      this.logger.info('Applied historical gas adjustment', {
        original: estimatedGasLimit.toString(),
        historical: averageUsage.toString(),
        adjusted: adjustedLimit.toString(),
      });
      
      return adjustedLimit;
    }
    
    return estimatedGasLimit;
  }

  /**
   * Record actual gas usage for learning
   * 
   * @param address - Contract address
   * @param gasUsed - Actual gas used
   */
  recordGasUsage(address: string, gasUsed: bigint): void {
    if (!address) return;
    
    const history = this.historicalGasUsage.get(address) || [];
    history.push(gasUsed);
    
    // Keep only last 10 entries
    if (history.length > 10) {
      history.shift();
    }
    
    this.historicalGasUsage.set(address, history);
  }

  /**
   * Get urgency multiplier for gas pricing
   * 
   * @param urgency - Transaction urgency level
   * @returns Price multiplier
   */
  private getUrgencyMultiplier(urgency: 'low' | 'medium' | 'high'): number {
    switch (urgency) {
      case 'low':
        return 0.9; // 10% discount for low priority
      case 'medium':
        return 1.0; // Standard pricing
      case 'high':
        return this.config.priorityMultiplier; // Premium for high priority
      default:
        return 1.0;
    }
  }

  /**
   * Get fallback gas estimate for error scenarios
   * 
   * @returns Safe fallback estimate
   */
  private getFallbackEstimate(): GasEstimate {
    const gasLimit = 100000n; // Safe default
    const gasPrice = ethers.parseUnits('30', 'gwei'); // Moderate gas price
    const estimatedCost = gasLimit * gasPrice;
    
    return {
      gasLimit,
      gasPrice,
      estimatedCost,
      estimatedCostETH: ethers.formatEther(estimatedCost),
      isEIP1559: false,
      congestionLevel: 'medium',
    };
  }

  /**
   * Validate gas parameters are within acceptable ranges
   * 
   * @param gasLimit - Proposed gas limit
   * @param gasPrice - Proposed gas price
   * @returns True if parameters are valid
   */
  validateGasParameters(gasLimit: bigint, gasPrice: bigint): boolean {
    // Check minimum gas limit
    if (gasLimit < 21000n) {
      this.logger.warn('Gas limit below minimum', { gasLimit: gasLimit.toString() });
      return false;
    }
    
    // Check maximum gas price
    if (gasPrice > this.config.maxGasPrice) {
      this.logger.warn('Gas price exceeds maximum', {
        gasPrice: gasPrice.toString(),
        maxGasPrice: this.config.maxGasPrice.toString(),
      });
      return false;
    }
    
    return true;
  }

  /**
   * Update configuration
   * 
   * @param config - New configuration values
   */
  updateConfig(config: Partial<GasEstimationConfig>): void {
    this.config = { ...this.config, ...config };
  }
}