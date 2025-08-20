/**
 * Modal component for creating new wallets
 */

import React, { useState } from 'react';

interface CreateWalletModalProps {
  onClose: () => void;
  onCreate: (name: string) => Promise<void>;
}

const CreateWalletModal: React.FC<CreateWalletModalProps> = ({ onClose, onCreate }) => {
  const [name, setName] = useState('');
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState('');

  /** Handle form submission */
  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    
    if (!name.trim()) {
      setError('Wallet name is required');
      return;
    }

    setLoading(true);
    setError('');
    
    try {
      await onCreate(name.trim());
    } catch (err) {
      setError('Failed to create wallet');
      setLoading(false);
    }
  };

  return (
    <div className="fixed inset-0 bg-black bg-opacity-50 flex items-center justify-center z-50">
      <div className="bg-white rounded-lg p-6 w-full max-w-md">
        <h2 className="text-xl font-semibold text-gray-900 mb-4">Create New Wallet</h2>
        
        <form onSubmit={handleSubmit}>
          <div className="mb-4">
            <label htmlFor="wallet-name" className="block text-sm font-medium text-gray-700 mb-2">
              Wallet Name
            </label>
            <input
              id="wallet-name"
              type="text"
              value={name}
              onChange={(e) => setName(e.target.value)}
              className="w-full px-3 py-2 border border-gray-300 rounded-lg focus:outline-none focus:ring-2 focus:ring-primary-500"
              placeholder="Enter wallet name"
              disabled={loading}
            />
            {error && <p className="mt-1 text-sm text-red-600">{error}</p>}
          </div>
          
          <div className="flex justify-end space-x-3">
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
              {loading ? 'Creating...' : 'Create Wallet'}
            </button>
          </div>
        </form>
      </div>
    </div>
  );
};

export default CreateWalletModal;