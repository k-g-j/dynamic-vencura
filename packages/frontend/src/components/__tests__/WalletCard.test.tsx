import { render, screen } from '@testing-library/react';
import { BrowserRouter } from 'react-router-dom';
import '@testing-library/jest-dom';
import WalletCard from '../WalletCard';

// Mock the API service
jest.mock('../../services/api', () => ({
  api: {
    getBalance: jest.fn().mockResolvedValue({
      walletId: 'wallet-1',
      address: '0x742d35Cc6634C0532925a3b844Bc9e7595f0bEb4',
      balance: '1000000000000000000',
      formattedBalance: '1.0',
    }),
  },
}));

const mockWallet = {
  id: 'wallet-1',
  address: '0x742d35Cc6634C0532925a3b844Bc9e7595f0bEb4',
  name: 'Test Wallet',
  userId: 'user-1',
  createdAt: '2024-01-01T00:00:00Z',
  updatedAt: '2024-01-01T00:00:00Z',
};

describe('WalletCard', () => {
  it('should render wallet information', () => {
    render(
      <BrowserRouter>
        <WalletCard wallet={mockWallet} />
      </BrowserRouter>
    );

    expect(screen.getByText('Test Wallet')).toBeInTheDocument();
    expect(screen.getByText(/0x742d...bEb4/)).toBeInTheDocument();
  });

  it('should display with hover effect styling', () => {
    render(
      <BrowserRouter>
        <WalletCard wallet={mockWallet} />
      </BrowserRouter>
    );

    const card = screen.getByText('Test Wallet').closest('div')?.parentElement;
    expect(card).toHaveClass('hover:shadow-md', 'cursor-pointer');
  });
});