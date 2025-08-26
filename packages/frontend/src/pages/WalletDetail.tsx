/**
 * Wallet detail page component
 * Provides interface for wallet operations: balance, sign message, send transaction
 */

import React, { useState, useEffect, useRef } from 'react';
import { useParams, useNavigate } from 'react-router-dom';
import { apiService } from '../services/api';
import { WalletResponse, BalanceResponse, TransactionResponse } from '@vencura/shared';
import toast from 'react-hot-toast';
import SendTransactionModal from '../components/SendTransactionModal';
import SignMessageModal from '../components/SignMessageModal';
import TransactionHistory from '../components/TransactionHistory';

const WalletDetailPage: React.FC = () => {
  const { walletId } = useParams<{ walletId: string }>();
  const navigate = useNavigate();
  
  const [wallet, setWallet] = useState<WalletResponse | null>(null);
  const [balance, setBalance] = useState<BalanceResponse | null>(null);
  const [transactions, setTransactions] = useState<TransactionResponse[]>([]);
  const [loading, setLoading] = useState(true);
  const [refreshing, setRefreshing] = useState(false);
  
  const [showSendModal, setShowSendModal] = useState(false);
  const [showSignModal, setShowSignModal] = useState(false);
  
  // Polling references
  const pollingIntervals = useRef<Map<string, NodeJS.Timeout>>(new Map());

  useEffect(() => {
    if (walletId) {
      loadWalletData();
    }
    
    // Cleanup polling intervals on unmount
    return () => {
      pollingIntervals.current.forEach(interval => clearInterval(interval));
      pollingIntervals.current.clear();
    };
  }, [walletId]);

  /** Load wallet data including balance and transactions */
  const loadWalletData = async () => {
    if (!walletId) return;
    
    try {
      setLoading(true);
      const [wallets, balanceData, txHistory] = await Promise.all([
        apiService.getWallets(),
        apiService.getBalance(walletId),
        apiService.getTransactionHistory(walletId),
      ]);
      
      const currentWallet = wallets.find(w => w.id === walletId);
      if (!currentWallet) {
        toast.error('Wallet not found');
        navigate('/dashboard');
        return;
      }
      
      setWallet(currentWallet);
      setBalance(balanceData);
      setTransactions(txHistory);
      
      // Start polling for any pending transactions
      txHistory.forEach(tx => {
        if (tx.status === 'pending') {
          startTransactionPolling(tx.transactionHash);
        }
      });
    } catch (error) {
      toast.error('Failed to load wallet data');
    } finally {
      setLoading(false);
    }
  };

  /** Refresh balance */
  const refreshBalance = async () => {
    if (!walletId) return;
    
    try {
      setRefreshing(true);
      const balanceData = await apiService.getBalance(walletId);
      setBalance(balanceData);
      toast.success('Balance refreshed');
    } catch (error) {
      toast.error('Failed to refresh balance');
    } finally {
      setRefreshing(false);
    }
  };

  /** Start polling for transaction status updates */
  const startTransactionPolling = (transactionHash: string) => {
    // Clear existing polling for this transaction if any
    const existingInterval = pollingIntervals.current.get(transactionHash);
    if (existingInterval) {
      clearInterval(existingInterval);
    }
    
    // Poll every 3 seconds for transaction status
    const interval = setInterval(async () => {
      if (!walletId) return;
      
      try {
        const updatedTransactions = await apiService.getTransactionHistory(walletId);
        const updatedTx = updatedTransactions.find(t => t.transactionHash === transactionHash);
        
        if (updatedTx) {
          // Update only the specific transaction in state
          setTransactions(prevTxs => 
            prevTxs.map(tx => tx.transactionHash === transactionHash ? updatedTx : tx)
          );
          
          // Stop polling if transaction is confirmed or failed
          if (updatedTx.status === 'confirmed') {
            clearInterval(interval);
            pollingIntervals.current.delete(transactionHash);
            toast.success(`Transaction confirmed! Block: ${updatedTx.blockNumber}`);
            refreshBalance();
          } else if (updatedTx.status === 'failed') {
            clearInterval(interval);
            pollingIntervals.current.delete(transactionHash);
            toast.error('Transaction failed');
          }
        }
      } catch (error) {
        // Silently handle polling errors
      }
    }, 3000);
    
    pollingIntervals.current.set(transactionHash, interval);
    
    // Stop polling after 5 minutes to prevent infinite polling
    setTimeout(() => {
      if (pollingIntervals.current.has(transactionHash)) {
        clearInterval(interval);
        pollingIntervals.current.delete(transactionHash);
      }
    }, 5 * 60 * 1000);
  };

  /** Handle transaction submission */
  const handleSendTransaction = async (to: string, amount: number, gasLimit?: number, gasPrice?: string) => {
    if (!walletId) throw new Error('No wallet selected');
    
    const tx = await apiService.sendTransaction(walletId, to, amount, gasLimit, gasPrice);
    toast.success('Transaction sent successfully!');
    setTransactions([tx, ...transactions]);
    setShowSendModal(false);
    
    // Start polling for transaction status updates
    startTransactionPolling(tx.transactionHash);
    
    // Refresh balance after a delay to account for blockchain confirmation
    setTimeout(() => refreshBalance(), 5000);
    
    return tx;
  };

  /** Handle message signing */
  const handleSignMessage = async (message: string): Promise<string> => {
    if (!walletId) throw new Error('No wallet ID');
    
    try {
      const result = await apiService.signMessage(walletId, message);
      toast.success('Message signed successfully!');
      return result.signature;
    } catch (error) {
      toast.error('Failed to sign message');
      throw error;
    }
  };

  /** Copy address to clipboard */
  const copyAddress = () => {
    if (wallet) {
      navigator.clipboard.writeText(wallet.address);
      toast.success('Address copied to clipboard');
    }
  };

  if (loading) {
    return (
      <div className="flex justify-center items-center h-64">
        <div className="animate-spin rounded-full h-12 w-12 border-b-2 border-primary-600"></div>
      </div>
    );
  }

  if (!wallet) {
    return <div>Wallet not found</div>;
  }

  return (
    <div className="px-4 py-8">
      <div className="mb-8">
        <button
          onClick={() => navigate('/dashboard')}
          className="text-primary-600 hover:text-primary-700 mb-4 inline-flex items-center"
        >
          ← Back to Dashboard
        </button>
        
        <h1 className="text-3xl font-bold text-gray-900">{wallet.name}</h1>
        <div className="flex items-center mt-2 space-x-2">
          <p className="text-gray-600 font-mono text-sm">{wallet.address}</p>
          <button
            onClick={copyAddress}
            className="text-primary-600 hover:text-primary-700 text-sm"
          >
            Copy
          </button>
        </div>
      </div>

      {/** Balance Section */}
      <div className="bg-white rounded-lg shadow-sm border border-gray-200 p-6 mb-6">
        <div className="flex justify-between items-center">
          <div>
            <h2 className="text-lg font-semibold text-gray-900 mb-2">Balance</h2>
            <p className="text-3xl font-bold text-gray-900">
              {balance?.formattedBalance || '0'} ETH
            </p>
            <p className="text-sm text-gray-500">
              {balance?.balance || '0'} wei
            </p>
          </div>
          <button
            onClick={refreshBalance}
            disabled={refreshing}
            className="text-primary-600 hover:text-primary-700 disabled:opacity-50"
          >
            {refreshing ? 'Refreshing...' : 'Refresh'}
          </button>
        </div>
      </div>

      {/** Actions Section */}
      <div className="grid grid-cols-1 md:grid-cols-2 gap-4 mb-8">
        <button
          onClick={() => setShowSendModal(true)}
          className="bg-primary-600 text-white px-6 py-3 rounded-lg hover:bg-primary-700 transition-colors"
        >
          Send Transaction
        </button>
        <button
          onClick={() => setShowSignModal(true)}
          className="bg-white text-primary-600 border border-primary-600 px-6 py-3 rounded-lg hover:bg-primary-50 transition-colors"
        >
          Sign Message
        </button>
      </div>

      {/** Transaction History */}
      <TransactionHistory transactions={transactions} />

      {/** Modals */}
      {showSendModal && (
        <SendTransactionModal
          onClose={() => setShowSendModal(false)}
          onSend={handleSendTransaction}
          currentBalance={balance?.formattedBalance || '0'}
        />
      )}
      
      {showSignModal && (
        <SignMessageModal
          onClose={() => setShowSignModal(false)}
          onSign={handleSignMessage}
        />
      )}
    </div>
  );
};

export default WalletDetailPage;