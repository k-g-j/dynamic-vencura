/**
 * Login page component
 * Handles Dynamic wallet authentication
 */

import React, { useEffect } from 'react';
import { useNavigate } from 'react-router-dom';
import { useDynamicContext, DynamicWidget } from '@dynamic-labs/sdk-react-core';
import { apiService } from '../services/api';
import toast from 'react-hot-toast';

const LoginPage: React.FC = () => {
  const { isAuthenticated, authToken } = useDynamicContext();
  const navigate = useNavigate();

  useEffect(() => {
    /** Handle authentication when Dynamic token is available */
    const handleAuth = async () => {
      if (isAuthenticated && authToken) {
        try {
          await apiService.loginWithDynamic(authToken);
          toast.success('Successfully logged in!');
          navigate('/dashboard');
        } catch (error) {
          console.error('Backend auth error:', error);
          toast.error('Failed to authenticate with backend');
        }
      }
    };

    handleAuth();
  }, [isAuthenticated, authToken, navigate]);

  return (
    <div className="min-h-screen flex items-center justify-center bg-gradient-to-br from-primary-50 to-primary-100">
      <div className="max-w-md w-full">
        <div className="bg-white shadow-xl rounded-lg px-8 py-10">
          <div className="text-center mb-8">
            <h1 className="text-3xl font-bold text-gray-900">VenCura</h1>
            <p className="mt-2 text-sm text-gray-600">
              The Venmo of wallets - Secure custodial wallet management
            </p>
          </div>
          
          <div className="space-y-6">
            <div className="text-center">
              <h2 className="text-xl font-semibold text-gray-800 mb-4">
                Connect Your Wallet
              </h2>
              <p className="text-sm text-gray-600 mb-6">
                Sign in with Dynamic to access your custodial wallets
              </p>
            </div>
            
            <DynamicWidget />
          </div>
        </div>
      </div>
    </div>
  );
};

export default LoginPage;