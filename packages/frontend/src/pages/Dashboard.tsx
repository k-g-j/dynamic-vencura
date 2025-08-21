/**
 * Dashboard page component
 * Displays user wallets and allows creation of new wallets
 */

import React, { useState, useEffect } from 'react';
import { Link, useNavigate } from 'react-router-dom';
import { useDynamicContext } from '@dynamic-labs/sdk-react-core';
import { apiService } from '../services/api';
import { WalletResponse } from '@vencura/shared';
import toast from 'react-hot-toast';
import CreateWalletModal from '../components/CreateWalletModal';
import WalletCard from '../components/WalletCard';

const DashboardPage: React.FC = () => {
  const [wallets, setWallets] = useState<WalletResponse[]>([]);
  const [loading, setLoading] = useState(true);
  const [showCreateModal, setShowCreateModal] = useState(false);
  const { isAuthenticated, authToken } = useDynamicContext();
  const navigate = useNavigate();

  /** Load user wallets on component mount */
  useEffect(() => {
    // First ensure we have proper authentication
    const initAuth = async () => {
      if (!isAuthenticated) {
        navigate('/login');
        return;
      }

      // If we have Dynamic auth but no backend token, authenticate with backend
      if (authToken && !apiService.getToken()) {
        try {
          await apiService.loginWithDynamic(authToken);
        } catch (error) {
          toast.error('Authentication failed. Please login again.');
          navigate('/login');
          return;
        }
      }

      // Now load wallets
      await loadWallets();
    };

    initAuth();
  }, [isAuthenticated, authToken, navigate]);

  /** Fetch wallets from API */
  const loadWallets = async () => {
    try {
      setLoading(true);
      const data = await apiService.getWallets();
      setWallets(data);
    } catch (error: any) {
      // Don't show error toast if it's an auth error (will redirect)
      if (error.response?.status !== 401) {
        toast.error('Failed to load wallets');
      }
    } finally {
      setLoading(false);
    }
  };

  /** Handle wallet creation */
  const handleCreateWallet = async (name: string) => {
    try {
      const newWallet = await apiService.createWallet(name);
      setWallets([...wallets, newWallet]);
      toast.success('Wallet created successfully!');
      setShowCreateModal(false);
    } catch (error) {
      toast.error('Failed to create wallet');
    }
  };

  if (loading) {
    return (
      <div className="flex justify-center items-center h-64">
        <div className="animate-spin rounded-full h-12 w-12 border-b-2 border-primary-600"></div>
      </div>
    );
  }

  return (
    <div className="px-4 py-8">
      <div className="mb-8">
        <h1 className="text-3xl font-bold text-gray-900">Your Wallets</h1>
        <p className="mt-2 text-gray-600">Manage your custodial wallets</p>
      </div>

      <div className="mb-6">
        <button
          onClick={() => setShowCreateModal(true)}
          className="bg-primary-600 text-white px-4 py-2 rounded-lg hover:bg-primary-700 transition-colors"
        >
          Create New Wallet
        </button>
      </div>

      {wallets.length === 0 ? (
        <div className="bg-white rounded-lg shadow-sm border border-gray-200 p-12 text-center">
          <h3 className="text-lg font-medium text-gray-900 mb-2">No wallets yet</h3>
          <p className="text-gray-600 mb-4">Create your first wallet to get started</p>
          <button
            onClick={() => setShowCreateModal(true)}
            className="bg-primary-600 text-white px-4 py-2 rounded-lg hover:bg-primary-700 transition-colors"
          >
            Create Wallet
          </button>
        </div>
      ) : (
        <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-6">
          {wallets.map((wallet) => (
            <Link key={wallet.id} to={`/wallet/${wallet.id}`}>
              <WalletCard wallet={wallet} />
            </Link>
          ))}
        </div>
      )}

      {showCreateModal && (
        <CreateWalletModal
          onClose={() => setShowCreateModal(false)}
          onCreate={handleCreateWallet}
        />
      )}
    </div>
  );
};

export default DashboardPage;