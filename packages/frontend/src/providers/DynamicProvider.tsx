/**
 * Dynamic SDK provider configuration
 * Handles wallet authentication and connection
 */

import React from 'react';
import { DynamicContextProvider } from '@dynamic-labs/sdk-react-core';
import { EthereumWalletConnectors } from '@dynamic-labs/ethereum';

interface DynamicProviderProps {
  children: React.ReactNode;
}

const DynamicProvider: React.FC<DynamicProviderProps> = ({ children }) => {
  return (
    <DynamicContextProvider
      settings={{
        environmentId: import.meta.env['VITE_DYNAMIC_ENVIRONMENT_ID'] || '',
        walletConnectors: [EthereumWalletConnectors],
        events: {
          onAuthSuccess: async () => {
            // Auth success handled in Login component
          },
          onLogout: async () => {
            // Logout handled in Layout component
          },
        },
      }}
    >
      {children}
    </DynamicContextProvider>
  );
};

export default DynamicProvider;