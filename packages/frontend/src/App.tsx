/**
 * Main application component
 * Sets up routing and authentication context
 */

import React from 'react';
import { BrowserRouter as Router, Routes, Route, Navigate } from 'react-router-dom';
import { Toaster } from 'react-hot-toast';
import { useDynamicContext } from '@dynamic-labs/sdk-react-core';
import DynamicProvider from './providers/DynamicProvider';
import Layout from './components/Layout';
import LoginPage from './pages/Login';
import DashboardPage from './pages/Dashboard';
import WalletDetailPage from './pages/WalletDetail';

const AppContent: React.FC = () => {
  const { isAuthenticated } = useDynamicContext();

  return (
    <Router>
      <Routes>
        <Route path="/login" element={!isAuthenticated ? <LoginPage /> : <Navigate to="/dashboard" />} />
        <Route
          path="/"
          element={
            isAuthenticated ? (
              <Layout>
                <Routes>
                  <Route path="/dashboard" element={<DashboardPage />} />
                  <Route path="/wallet/:walletId" element={<WalletDetailPage />} />
                  <Route path="/" element={<Navigate to="/dashboard" />} />
                </Routes>
              </Layout>
            ) : (
              <Navigate to="/login" />
            )
          }
        />
      </Routes>
    </Router>
  );
};

const App: React.FC = () => {
  return (
    <DynamicProvider>
      <AppContent />
      <Toaster position="top-right" />
    </DynamicProvider>
  );
};

export default App;