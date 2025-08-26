/**
 * Login page component
 * Handles Dynamic wallet authentication
 */

import React, { useEffect, useState } from 'react';
import { useNavigate, Link } from 'react-router-dom';
import { useDynamicContext, DynamicWidget } from '@dynamic-labs/sdk-react-core';
import { apiService } from '../services/api';
import toast from 'react-hot-toast';

const LoginPage: React.FC = () => {
  const { isAuthenticated, authToken } = useDynamicContext();
  const navigate = useNavigate();
  const [isAuthenticating, setIsAuthenticating] = useState(false);
  const [authFailed, setAuthFailed] = useState(false);

  useEffect(() => {
    /** Handle authentication when Dynamic token is available */
    const handleAuth = async () => {
      if (isAuthenticated && authToken && !isAuthenticating && !authFailed) {
        setIsAuthenticating(true);
        try {
          await apiService.loginWithDynamic(authToken);
          toast.success('Successfully logged in!');
          navigate('/dashboard');
        } catch (error) {
          toast.error('Failed to authenticate with backend');
          setAuthFailed(true);
        } finally {
          setIsAuthenticating(false);
        }
      }
    };

    handleAuth();
  }, [isAuthenticated, authToken, navigate, isAuthenticating, authFailed]);

  const handleRetryAuth = async () => {
    if (isAuthenticated && authToken) {
      setAuthFailed(false);
      setIsAuthenticating(true);
      try {
        await apiService.loginWithDynamic(authToken);
        toast.success('Successfully logged in!');
        navigate('/dashboard');
      } catch (error) {
        toast.error('Failed to authenticate with backend');
        setAuthFailed(true);
      } finally {
        setIsAuthenticating(false);
      }
    }
  };

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
            {/* Show different content based on authentication state */}
            {isAuthenticated && !isAuthenticating && authFailed ? (
              <div className="text-center space-y-4">
                <div className="bg-yellow-50 border border-yellow-200 rounded-lg p-4">
                  <p className="text-sm text-yellow-800">
                    Your wallet is connected but backend authentication failed. 
                    You can try again or go directly to the dashboard.
                  </p>
                </div>
                <div className="space-y-3">
                  <button
                    onClick={handleRetryAuth}
                    className="w-full bg-primary-600 text-white py-3 px-4 rounded-lg hover:bg-primary-700 transition-colors font-medium"
                  >
                    Retry Authentication
                  </button>
                  <Link
                    to="/dashboard"
                    className="block w-full bg-gray-100 text-gray-700 py-3 px-4 rounded-lg hover:bg-gray-200 transition-colors font-medium text-center"
                  >
                    Go to Dashboard Anyway
                  </Link>
                </div>
              </div>
            ) : isAuthenticated && isAuthenticating ? (
              <div className="text-center space-y-4">
                <div className="animate-spin rounded-full h-12 w-12 border-b-2 border-primary-600 mx-auto"></div>
                <p className="text-sm text-gray-600">
                  Authenticating with backend...
                </p>
              </div>
            ) : isAuthenticated && !authFailed ? (
              <div className="text-center space-y-4">
                <div className="bg-green-50 border border-green-200 rounded-lg p-4">
                  <p className="text-sm text-green-800">
                    Your wallet is already connected!
                  </p>
                </div>
                <Link
                  to="/dashboard"
                  className="block w-full bg-primary-600 text-white py-3 px-4 rounded-lg hover:bg-primary-700 transition-colors font-medium text-center"
                >
                  Go to Dashboard
                </Link>
                <p className="text-xs text-gray-500">
                  Redirecting automatically...
                </p>
              </div>
            ) : (
              <>
                <div className="text-center">
                  <h2 className="text-xl font-semibold text-gray-800 mb-4">
                    Connect Your Wallet
                  </h2>
                  <p className="text-sm text-gray-600 mb-6">
                    Sign in with Dynamic to access your custodial wallets
                  </p>
                </div>
                
                <div className="flex justify-center">
                  <DynamicWidget />
                </div>
              </>
            )}
          </div>
        </div>
      </div>
    </div>
  );
};

export default LoginPage;