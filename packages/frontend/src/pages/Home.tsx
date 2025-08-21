/**
 * Home page component
 * Landing page that shows different content based on authentication status
 */

import React from 'react';
import { Link } from 'react-router-dom';
import { useDynamicContext, DynamicWidget } from '@dynamic-labs/sdk-react-core';

const HomePage: React.FC = () => {
  const { isAuthenticated, user } = useDynamicContext();

  return (
    <div className="min-h-screen bg-gradient-to-br from-primary-50 to-primary-100">
      {/* Header */}
      <header className="bg-white shadow-sm">
        <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8">
          <div className="flex justify-between items-center h-16">
            <div className="flex items-center">
              <h1 className="text-2xl font-bold text-primary-600">VenCura</h1>
            </div>
            <div className="flex items-center space-x-4">
              {isAuthenticated && user ? (
                <>
                  <span className="text-sm text-gray-600">
                    Welcome, {user.email || user.alias || 'User'}
                  </span>
                  <Link
                    to="/dashboard"
                    className="bg-primary-600 text-white px-4 py-2 rounded-lg hover:bg-primary-700 transition-colors text-sm font-medium"
                  >
                    Go to Dashboard
                  </Link>
                </>
              ) : null}
            </div>
          </div>
        </div>
      </header>

      {/* Main Content */}
      <main className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 py-12">
        <div className="text-center">
          <h2 className="text-4xl font-bold text-gray-900 sm:text-5xl md:text-6xl">
            The Venmo of Wallets
          </h2>
          <p className="mt-4 text-xl text-gray-600 max-w-3xl mx-auto">
            Secure custodial wallet management for seamless blockchain transactions
          </p>
        </div>

        {/* Authentication Section */}
        <div className="mt-12 max-w-md mx-auto">
          {isAuthenticated && user ? (
            // Logged in state
            <div className="bg-white shadow-xl rounded-lg px-8 py-10">
              <div className="text-center space-y-6">
                <div className="bg-green-50 border border-green-200 rounded-lg p-6">
                  <div className="flex justify-center mb-4">
                    <svg className="w-12 h-12 text-green-600" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                      <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M9 12l2 2 4-4m6 2a9 9 0 11-18 0 9 9 0 0118 0z" />
                    </svg>
                  </div>
                  <h3 className="text-lg font-semibold text-green-800 mb-2">
                    You're Logged In!
                  </h3>
                  <p className="text-sm text-green-700">
                    {user.email || user.alias || 'Your wallet'} is connected
                  </p>
                </div>
                
                <div className="space-y-3">
                  <Link
                    to="/dashboard"
                    className="block w-full bg-primary-600 text-white py-3 px-4 rounded-lg hover:bg-primary-700 transition-colors font-medium"
                  >
                    Open Dashboard
                  </Link>
                  <p className="text-xs text-gray-500">
                    Manage your wallets, send transactions, and more
                  </p>
                </div>
              </div>
            </div>
          ) : (
            // Not logged in state
            <div className="bg-white shadow-xl rounded-lg px-8 py-10">
              <div className="text-center mb-6">
                <h3 className="text-xl font-semibold text-gray-800 mb-2">
                  Get Started
                </h3>
                <p className="text-sm text-gray-600">
                  Connect your wallet to access VenCura
                </p>
              </div>
              
              <div className="flex justify-center">
                <DynamicWidget />
              </div>
              
              <div className="mt-6 text-center">
                <p className="text-xs text-gray-500">
                  By connecting, you agree to our terms and conditions
                </p>
              </div>
            </div>
          )}
        </div>

        {/* Features Section */}
        <div className="mt-16 grid grid-cols-1 md:grid-cols-3 gap-8 max-w-5xl mx-auto">
          <div className="text-center">
            <div className="bg-primary-100 rounded-full w-16 h-16 flex items-center justify-center mx-auto mb-4">
              <svg className="w-8 h-8 text-primary-600" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M12 15v2m-6 4h12a2 2 0 002-2v-6a2 2 0 00-2-2H6a2 2 0 00-2 2v6a2 2 0 002 2zm10-10V7a4 4 0 00-8 0v4h8z" />
              </svg>
            </div>
            <h3 className="text-lg font-semibold text-gray-900 mb-2">Secure Storage</h3>
            <p className="text-sm text-gray-600">
              Private keys encrypted with AES-256-GCM encryption
            </p>
          </div>
          
          <div className="text-center">
            <div className="bg-primary-100 rounded-full w-16 h-16 flex items-center justify-center mx-auto mb-4">
              <svg className="w-8 h-8 text-primary-600" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M13 10V3L4 14h7v7l9-11h-7z" />
              </svg>
            </div>
            <h3 className="text-lg font-semibold text-gray-900 mb-2">Fast Transactions</h3>
            <p className="text-sm text-gray-600">
              Send ETH on Sepolia testnet with real-time status updates
            </p>
          </div>
          
          <div className="text-center">
            <div className="bg-primary-100 rounded-full w-16 h-16 flex items-center justify-center mx-auto mb-4">
              <svg className="w-8 h-8 text-primary-600" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M9 12h6m-6 4h6m2 5H7a2 2 0 01-2-2V5a2 2 0 012-2h5.586a1 1 0 01.707.293l5.414 5.414a1 1 0 01.293.707V19a2 2 0 01-2 2z" />
              </svg>
            </div>
            <h3 className="text-lg font-semibold text-gray-900 mb-2">Message Signing</h3>
            <p className="text-sm text-gray-600">
              Sign messages with your wallet for verification
            </p>
          </div>
        </div>
      </main>
    </div>
  );
};

export default HomePage;