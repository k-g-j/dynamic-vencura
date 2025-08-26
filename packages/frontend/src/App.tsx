/**
 * Main application component
 * Sets up routing and authentication context
 */

import React from 'react';
import { BrowserRouter as Router, Routes, Route, Navigate } from 'react-router-dom';
import { Toaster } from 'react-hot-toast';
import DynamicProvider from './providers/DynamicProvider';
import Layout from './components/Layout';
import HomePage from './pages/Home';
import LoginPage from './pages/Login';
import DashboardPage from './pages/Dashboard';
import WalletDetailPage from './pages/WalletDetail';

const AppContent: React.FC = () => {

  return (
    <Router>
      <Routes>
        <Route path="/" element={<HomePage />} />
        <Route path="/login" element={<LoginPage />} />
        <Route element={<Layout />}>
          <Route path="/dashboard" element={<DashboardPage />} />
          <Route path="/wallet/:walletId" element={<WalletDetailPage />} />
        </Route>
        <Route path="*" element={<Navigate to="/" />} />
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