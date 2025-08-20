/**
 * Modal component for sending transactions
 */

import React, { useState } from 'react';
import { ethereumAddressSchema } from '@vencura/shared';

interface SendTransactionModalProps {
  onClose: () => void;
  onSend: (to: string, amount: number, gasLimit?: number, gasPrice?: string) => Promise<void>;
  currentBalance: string;
}

const SendTransactionModal: React.FC<SendTransactionModalProps> = ({ onClose, onSend, currentBalance }) => {
  const [to, setTo] = useState('');
  const [amount, setAmount] = useState('');
  const [gasLimit, setGasLimit] = useState('');
  const [gasPrice, setGasPrice] = useState('');
  const [loading, setLoading] = useState(false);
  const [errors, setErrors] = useState<Record<string, string>>({});

  /** Validate form inputs */
  const validateForm = (): boolean => {
    const newErrors: Record<string, string> = {};
    
    try {
      ethereumAddressSchema.parse(to);
    } catch {
      newErrors.to = 'Invalid Ethereum address';
    }
    
    const amountNum = parseFloat(amount);
    if (!amount || isNaN(amountNum) || amountNum <= 0) {
      newErrors.amount = 'Amount must be greater than 0';
    }
    
    const balanceNum = parseFloat(currentBalance);
    if (amountNum > balanceNum) {
      newErrors.amount = 'Insufficient balance';
    }
    
    if (gasLimit && (isNaN(parseInt(gasLimit)) || parseInt(gasLimit) <= 0)) {
      newErrors.gasLimit = 'Gas limit must be a positive number';
    }
    
    if (gasPrice && (isNaN(parseFloat(gasPrice)) || parseFloat(gasPrice) <= 0)) {
      newErrors.gasPrice = 'Gas price must be a positive number';
    }
    
    setErrors(newErrors);
    return Object.keys(newErrors).length === 0;
  };

  /** Handle form submission */
  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    
    if (!validateForm()) return;
    
    setLoading(true);
    try {
      await onSend(
        to,
        parseFloat(amount),
        gasLimit ? parseInt(gasLimit) : undefined,
        gasPrice || undefined
      );
    } catch (err) {
      setLoading(false);
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
                disabled={loading}
              />
              {errors.to && <p className="mt-1 text-sm text-red-600">{errors.to}</p>}
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
                disabled={loading}
              />
              <p className="mt-1 text-xs text-gray-500">Balance: {currentBalance} ETH</p>
              {errors.amount && <p className="mt-1 text-sm text-red-600">{errors.amount}</p>}
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
                disabled={loading}
              />
              {errors.gasLimit && <p className="mt-1 text-sm text-red-600">{errors.gasLimit}</p>}
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
                disabled={loading}
              />
              {errors.gasPrice && <p className="mt-1 text-sm text-red-600">{errors.gasPrice}</p>}
            </div>
          </div>
          
          <div className="flex justify-end space-x-3 mt-6">
            <button
              type="button"
              onClick={onClose}
              className="px-4 py-2 text-gray-700 bg-gray-100 rounded-lg hover:bg-gray-200 transition-colors"
              disabled={loading}
            >
              Cancel
            </button>
            <button
              type="submit"
              className="px-4 py-2 bg-primary-600 text-white rounded-lg hover:bg-primary-700 transition-colors disabled:opacity-50"
              disabled={loading}
            >
              {loading ? 'Sending...' : 'Send Transaction'}
            </button>
          </div>
        </form>
      </div>
    </div>
  );
};

export default SendTransactionModal;