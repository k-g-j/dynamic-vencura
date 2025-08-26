/**
 * Modal component for sending transactions
 */

import React, { useState } from 'react';
import { ethereumAddressSchema } from '@vencura/shared';

interface SendTransactionModalProps {
  onClose: () => void;
  onSend: (to: string, amount: number, gasLimit?: number, gasPrice?: string) => Promise<{ transactionHash: string } | void>;
  currentBalance: string;
}

interface TransactionState {
  status: 'idle' | 'pending' | 'success' | 'error';
  message?: string;
  txHash?: string;
}

const SendTransactionModal: React.FC<SendTransactionModalProps> = ({ onClose, onSend, currentBalance }) => {
  const [to, setTo] = useState('');
  const [amount, setAmount] = useState('');
  const [gasLimit, setGasLimit] = useState('');
  const [gasPrice, setGasPrice] = useState('');
  const [txState, setTxState] = useState<TransactionState>({ status: 'idle' });
  const [errors, setErrors] = useState<Record<string, string>>({});

  /** Validate form inputs */
  const validateForm = (): boolean => {
    const newErrors: Record<string, string> = {};
    
    try {
      ethereumAddressSchema.parse(to);
    } catch {
      newErrors['to'] = 'Invalid Ethereum address';
    }
    
    const amountNum = parseFloat(amount);
    if (!amount || isNaN(amountNum) || amountNum <= 0) {
      newErrors['amount'] = 'Amount must be greater than 0';
    }
    
    const balanceNum = parseFloat(currentBalance);
    if (amountNum > balanceNum) {
      newErrors['amount'] = 'Insufficient balance';
    }
    
    if (gasLimit && (isNaN(parseInt(gasLimit)) || parseInt(gasLimit) <= 0)) {
      newErrors['gasLimit'] = 'Gas limit must be a positive number';
    }
    
    if (gasPrice && (isNaN(parseFloat(gasPrice)) || parseFloat(gasPrice) <= 0)) {
      newErrors['gasPrice'] = 'Gas price must be a positive number';
    }
    
    setErrors(newErrors);
    return Object.keys(newErrors).length === 0;
  };

  /** Handle form submission */
  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    
    if (!validateForm()) return;
    
    setTxState({ status: 'pending', message: 'Sending transaction...' });
    try {
      const result = await onSend(
        to,
        parseFloat(amount),
        gasLimit ? parseInt(gasLimit) : undefined,
        gasPrice || undefined
      );
      
      // Store transaction hash if available
      if (result && typeof result === 'object' && 'transactionHash' in result) {
        setTxState({ 
          status: 'success', 
          message: 'Transaction sent successfully!',
          txHash: result.transactionHash 
        });
      } else {
        setTxState({ status: 'success', message: 'Transaction sent successfully!' });
      }
      
      // Auto-close after success
      setTimeout(() => onClose(), 3000);
    } catch (err) {
      // Parse error message to make it user-friendly
      let errorMessage = 'Transaction failed';
      const error = err as { response?: { data?: { message?: string; error?: string } }; message?: string };
      
      // Helper function to parse blockchain error messages
      const parseBlockchainError = (msg: string): string => {
        // Common blockchain errors with user-friendly messages
        if (msg.includes('intrinsic gas too low')) {
          const gasMatch = msg.match(/minimum needed (\d+)/);
          const minGas = gasMatch && gasMatch[1] ? parseInt(gasMatch[1]).toLocaleString() : '21,000';
          return `Gas limit too low. Please set at least ${minGas} gas`;
        }
        if (msg.includes('insufficient funds')) {
          return 'Insufficient balance to cover transaction and gas fees';
        }
        if (msg.includes('gas required exceeds allowance')) {
          return 'Gas limit exceeded. Please increase the gas limit';
        }
        if (msg.includes('replacement transaction underpriced')) {
          return 'A transaction is already pending. Increase gas price to replace it';
        }
        if (msg.includes('nonce too low')) {
          return 'Transaction conflict detected. Please refresh and try again';
        }
        if (msg.includes('already known')) {
          return 'This transaction has already been submitted';
        }
        if (msg.includes('max fee per gas less than block base fee')) {
          return 'Gas price too low for current network conditions. Please increase gas price';
        }
        if (msg.includes('execution reverted')) {
          return 'Transaction would fail. Please verify the recipient address and amount';
        }
        if (msg.includes('invalid address')) {
          return 'Invalid recipient address format';
        }
        if (msg.includes('timeout')) {
          return 'Network timeout. Please try again';
        }
        if (msg.includes('network') || msg.includes('connection')) {
          return 'Network connection error. Please check your connection and try again';
        }
        return '';
      };
      
      // Try to extract error from response
      if (error.response?.data?.message) {
        const parsed = parseBlockchainError(error.response.data.message);
        errorMessage = parsed || error.response.data.message;
      } else if (error.response?.data?.error) {
        const parsed = parseBlockchainError(error.response.data.error);
        errorMessage = parsed || error.response.data.error;
      } else if (error.message) {
        const message = error.message;
        
        // Handle complex error messages from backend
        if (message.includes('Transaction failed after') && message.includes('attempts:')) {
          // Extract the actual error from "Transaction failed after X attempts: ..."
          const afterAttempts = message.split('attempts:')[1];
          if (afterAttempts) {
            // Try to parse JSON error object if present
            const errorMatch = afterAttempts.match(/"message"\s*:\s*"([^"]+)"/);
            if (errorMatch && errorMatch[1]) {
              const parsed = parseBlockchainError(errorMatch[1]);
              errorMessage = parsed || 'Transaction failed. Please check gas settings and try again';
            } else {
              // Try direct parsing
              const parsed = parseBlockchainError(afterAttempts);
              errorMessage = parsed || 'Transaction failed. Please check gas settings and try again';
            }
          }
        } else if (message.includes('could not coalesce error')) {
          // Parse ethers.js coalesce errors
          const errorMatch = message.match(/"message"\s*:\s*"([^"]+)"/);
          if (errorMatch && errorMatch[1]) {
            const parsed = parseBlockchainError(errorMatch[1]);
            errorMessage = parsed || 'Transaction failed. Please check your inputs';
          } else {
            errorMessage = 'Transaction failed. Please verify gas settings and try again';
          }
        } else {
          // Try direct parsing
          const parsed = parseBlockchainError(message);
          if (parsed) {
            errorMessage = parsed;
          } else {
            // Clean up generic error messages
            const cleanMessage = message?.replace(/Error: /, '').split('\n')[0];
            if (cleanMessage && cleanMessage.length < 80) {
              errorMessage = cleanMessage;
            } else {
              errorMessage = 'Transaction failed. Please check your inputs and try again';
            }
          }
        }
      }
      
      setTxState({ status: 'error', message: errorMessage });
    }
  };

  const handleClose = () => {
    if (txState.status !== 'pending') {
      onClose();
    }
  };

  return (
    <div className="fixed inset-0 bg-black bg-opacity-50 flex items-center justify-center z-50">
      <div className="bg-white rounded-lg p-6 w-full max-w-md max-h-[90vh] overflow-y-auto">
        <h2 className="text-xl font-semibold text-gray-900 mb-4">Send Transaction</h2>
        
        <form onSubmit={handleSubmit}>
          <div className="space-y-4">
            <div>
              <label htmlFor="to-address" className="block text-sm font-medium text-gray-700 mb-1">
                Recipient Address
              </label>
              <input
                id="to-address"
                type="text"
                value={to}
                onChange={(e) => setTo(e.target.value)}
                className="w-full px-3 py-2 border border-gray-300 rounded-lg focus:outline-none focus:ring-2 focus:ring-primary-500"
                placeholder="0x..."
                disabled={txState.status === 'pending'}
              />
              {errors['to'] && <p className="mt-1 text-sm text-red-600">{errors['to']}</p>}
            </div>
            
            <div>
              <label htmlFor="amount" className="block text-sm font-medium text-gray-700 mb-1">
                Amount (ETH)
              </label>
              <input
                id="amount"
                type="number"
                step="0.000001"
                value={amount}
                onChange={(e) => setAmount(e.target.value)}
                className="w-full px-3 py-2 border border-gray-300 rounded-lg focus:outline-none focus:ring-2 focus:ring-primary-500"
                placeholder="0.0"
                disabled={txState.status === 'pending'}
              />
              <p className="mt-1 text-xs text-gray-500">Balance: {currentBalance} ETH</p>
              {errors['amount'] && <p className="mt-1 text-sm text-red-600">{errors['amount']}</p>}
            </div>
            
            <div>
              <label htmlFor="gas-limit" className="block text-sm font-medium text-gray-700 mb-1">
                Gas Limit (Optional)
              </label>
              <input
                id="gas-limit"
                type="number"
                value={gasLimit}
                onChange={(e) => setGasLimit(e.target.value)}
                className="w-full px-3 py-2 border border-gray-300 rounded-lg focus:outline-none focus:ring-2 focus:ring-primary-500"
                placeholder="21000"
                disabled={txState.status === 'pending'}
              />
              {errors['gasLimit'] && <p className="mt-1 text-sm text-red-600">{errors['gasLimit']}</p>}
            </div>
            
            <div>
              <label htmlFor="gas-price" className="block text-sm font-medium text-gray-700 mb-1">
                Gas Price in Gwei (Optional)
              </label>
              <input
                id="gas-price"
                type="number"
                step="0.1"
                value={gasPrice}
                onChange={(e) => setGasPrice(e.target.value)}
                className="w-full px-3 py-2 border border-gray-300 rounded-lg focus:outline-none focus:ring-2 focus:ring-primary-500"
                placeholder="20"
                disabled={txState.status === 'pending'}
              />
              {errors['gasPrice'] && <p className="mt-1 text-sm text-red-600">{errors['gasPrice']}</p>}
            </div>
          </div>
          
          {/* Transaction Status */}
          {txState.status !== 'idle' && (
            <div className={`mt-4 p-3 rounded-lg ${
              txState.status === 'pending' ? 'bg-blue-50 text-blue-700' :
              txState.status === 'success' ? 'bg-green-50 text-green-700' :
              'bg-red-50 text-red-700'
            }`}>
              <div className="flex items-center">
                {txState.status === 'pending' && (
                  <div className="animate-spin rounded-full h-4 w-4 border-2 border-blue-700 border-t-transparent mr-2"></div>
                )}
                <span className="text-sm font-medium">{txState.message}</span>
              </div>
              {txState.txHash && (
                <a 
                  href={`https://sepolia.etherscan.io/tx/${txState.txHash}`}
                  target="_blank"
                  rel="noopener noreferrer"
                  className="text-xs underline mt-1 block"
                >
                  View on Etherscan
                </a>
              )}
            </div>
          )}
          
          <div className="flex justify-end space-x-3 mt-6">
            <button
              type="button"
              onClick={handleClose}
              className="px-4 py-2 text-gray-700 bg-gray-100 rounded-lg hover:bg-gray-200 transition-colors disabled:opacity-50"
              disabled={txState.status === 'pending'}
            >
              {txState.status === 'success' ? 'Close' : 'Cancel'}
            </button>
            {txState.status !== 'success' && (
              <button
                type="submit"
                className="px-4 py-2 bg-primary-600 text-white rounded-lg hover:bg-primary-700 transition-colors disabled:opacity-50"
                disabled={txState.status === 'pending'}
              >
                {txState.status === 'pending' ? 'Sending...' : 
                 txState.status === 'error' ? 'Retry' : 'Send Transaction'}
              </button>
            )}
          </div>
        </form>
      </div>
    </div>
  );
};

export default SendTransactionModal;