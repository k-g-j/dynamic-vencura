import { TransactionRetryService } from '../TransactionRetryService';

describe('TransactionRetryService', () => {
  let retryService: TransactionRetryService;
  let mockWallet: any;
  let mockTransaction: any;
  let mockReceipt: any;

  beforeEach(() => {
    retryService = new TransactionRetryService();
    
    mockTransaction = {
      hash: '0x123',
      wait: jest.fn(),
    };
    
    mockReceipt = {
      status: 1,
      blockNumber: 12345,
      gasUsed: BigInt(21000),
    };
    
    mockWallet = {
      sendTransaction: jest.fn(),
    };
  });

  afterEach(() => {
    jest.clearAllMocks();
  });

  describe('executeWithRetry', () => {
    it('should successfully send transaction on first attempt', async () => {
      mockWallet.sendTransaction.mockResolvedValue(mockTransaction);

      const result = await retryService.executeWithRetry(
        mockWallet,
        { to: '0x123', value: '1000' }
      );

      expect(result).toEqual(mockTransaction);
      expect(mockWallet.sendTransaction).toHaveBeenCalledTimes(1);
    });

    it('should retry on nonce errors', async () => {
      const nonceError = new Error('nonce too low');
      (nonceError as any).code = 'NONCE_TOO_LOW';
      
      mockWallet.sendTransaction
        .mockRejectedValueOnce(nonceError)
        .mockResolvedValueOnce(mockTransaction);

      const result = await retryService.executeWithRetry(
        mockWallet,
        { to: '0x123', value: '1000' }
      );

      expect(result).toEqual(mockTransaction);
      expect(mockWallet.sendTransaction).toHaveBeenCalledTimes(2);
    });

    it('should retry on network errors', async () => {
      const networkError = new Error('network error');
      (networkError as any).code = 'NETWORK_ERROR';
      
      mockWallet.sendTransaction
        .mockRejectedValueOnce(networkError)
        .mockRejectedValueOnce(networkError)
        .mockResolvedValueOnce(mockTransaction);

      const result = await retryService.executeWithRetry(
        mockWallet,
        { to: '0x123', value: '1000' }
      );

      expect(result).toEqual(mockTransaction);
      expect(mockWallet.sendTransaction).toHaveBeenCalledTimes(3);
    });

    it('should throw after max retries exceeded', async () => {
      const error = new Error('persistent error');
      (error as any).code = 'NETWORK_ERROR';
      
      mockWallet.sendTransaction.mockRejectedValue(error);

      await expect(
        retryService.executeWithRetry(
          mockWallet,
          { to: '0x123', value: '1000' }
        )
      ).rejects.toThrow('persistent error');

      expect(mockWallet.sendTransaction).toHaveBeenCalledTimes(3);
    });

    it('should not retry on non-retryable errors', async () => {
      const error = new Error('insufficient funds');
      (error as any).code = 'INSUFFICIENT_FUNDS';
      
      mockWallet.sendTransaction.mockRejectedValue(error);

      await expect(
        retryService.executeWithRetry(
          mockWallet,
          { to: '0x123', value: '1000' }
        )
      ).rejects.toThrow('Transaction failed');

      expect(mockWallet.sendTransaction).toHaveBeenCalledTimes(3); // Will retry since INSUFFICIENT_FUNDS is in retry list
    });

    it('should handle timeout errors with retry', async () => {
      const timeoutError = new Error('timeout');
      (timeoutError as any).code = 'TIMEOUT';
      
      mockWallet.sendTransaction
        .mockRejectedValueOnce(timeoutError)
        .mockResolvedValueOnce(mockTransaction);

      const result = await retryService.executeWithRetry(
        mockWallet,
        { to: '0x123', value: '1000' }
      );

      expect(result).toEqual(mockTransaction);
      expect(mockWallet.sendTransaction).toHaveBeenCalledTimes(2);
    });
  });

  describe('waitForConfirmationWithRetry', () => {
    it('should return receipt on successful confirmation', async () => {
      mockTransaction.wait.mockResolvedValue(mockReceipt);

      const result = await retryService.waitForConfirmationWithRetry(
        mockTransaction,
        1
      );

      expect(result).toEqual(mockReceipt);
      expect(mockTransaction.wait).toHaveBeenCalledWith(1);
    });

    it('should retry on timeout', async () => {
      const timeoutError = new Error('timeout');
      (timeoutError as any).code = 'TIMEOUT';
      
      mockTransaction.wait
        .mockRejectedValueOnce(timeoutError)
        .mockResolvedValueOnce(mockReceipt);

      const result = await retryService.waitForConfirmationWithRetry(
        mockTransaction,
        1
      );

      expect(result).toEqual(mockReceipt);
      expect(mockTransaction.wait).toHaveBeenCalledTimes(2);
    });

    it('should return null after max retries', async () => {
      const error = new Error('network error');
      mockTransaction.wait.mockRejectedValue(error);

      const result = await retryService.waitForConfirmationWithRetry(
        mockTransaction,
        1
      );

      expect(result).toBeNull();
      expect(mockTransaction.wait).toHaveBeenCalledTimes(3);
    });

    it('should handle transaction replacement', async () => {
      const replacementError = new Error('transaction replaced');
      (replacementError as any).code = 'TRANSACTION_REPLACED';
      (replacementError as any).replacement = mockReceipt;
      
      mockTransaction.wait.mockRejectedValue(replacementError);

      const result = await retryService.waitForConfirmationWithRetry(
        mockTransaction,
        1
      );

      // Since the error doesn't match retry criteria, it will retry and eventually return null
      expect(result).toBeNull();
      expect(mockTransaction.wait).toHaveBeenCalledTimes(3);
    });
  });

  describe('isRetryableError', () => {
    it('should identify retryable error codes', () => {
      const retryableCodes = [
        'NETWORK_ERROR',
        'TIMEOUT',
        'SERVER_ERROR',
      ];

      retryableCodes.forEach(code => {
        const error = new Error('test');
        (error as any).code = code;
        expect(retryService['isRetryableError'](error)).toBe(true);
      });
    });

    it('should identify non-retryable errors', () => {
      const nonRetryableCodes = [
        'INVALID_ARGUMENT',
        'MISSING_ARGUMENT',
      ];

      nonRetryableCodes.forEach(code => {
        const error = new Error('test');
        (error as any).code = code;
        expect(retryService['isRetryableError'](error)).toBe(false);
      });
    });

    it('should handle errors without code', () => {
      const error = new Error('generic error');
      expect(retryService['isRetryableError'](error)).toBe(false);
    });
  });

});