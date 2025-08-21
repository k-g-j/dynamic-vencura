/**
 * Wallet card component
 * Displays wallet information in a card format
 */

import React, { useState, useEffect } from 'react';
import { WalletResponse, BalanceResponse } from '@vencura/shared';
import { apiService } from '../services/api';

interface WalletCardProps {
  wallet: WalletResponse;
}

const WalletCard: React.FC<WalletCardProps> = ({ wallet }) => {
  const [balance, setBalance] = useState<BalanceResponse | null>(null);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    /** Fetch wallet balance */
    const loadBalance = async () => {
      try {
        const data = await apiService.getBalance(wallet.id);
        setBalance(data);
      } catch (error) {
        // Silently handle balance loading errors
      } finally {
        setLoading(false);
      }
    };

    loadBalance();
  }, [wallet.id]);

  /** Format address for display */
  const formatAddress = (address: string) => {
    return `${address.slice(0, 6)}...${address.slice(-4)}`;
  };

  return (
    <div className="bg-white rounded-lg shadow-sm border border-gray-200 p-6 hover:shadow-md transition-shadow cursor-pointer">
      <div className="flex justify-between items-start mb-4">
        <h3 className="text-lg font-semibold text-gray-900">{wallet.name}</h3>
        <span className="text-xs text-gray-500">
          {new Date(wallet.createdAt).toLocaleDateString()}
        </span>
      </div>
      
      <div className="space-y-2">
        <div>
          <p className="text-xs text-gray-500">Address</p>
          <p className="text-sm font-mono text-gray-700">{formatAddress(wallet.address)}</p>
        </div>
        
        <div>
          <p className="text-xs text-gray-500">Balance</p>
          {loading ? (
            <p className="text-sm text-gray-700">Loading...</p>
          ) : (
            <p className="text-lg font-semibold text-gray-900">
              {balance?.formattedBalance || '0'} ETH
            </p>
          )}
        </div>
      </div>
    </div>
  );
};

export default WalletCard;