import { render, screen, fireEvent } from '@testing-library/react';
import '@testing-library/jest-dom';
import CreateWalletModal from '../CreateWalletModal';

// Mock the API service
jest.mock('../../services/api', () => ({
  api: {
    createWallet: jest.fn(),
  },
}));

// Mock toast
jest.mock('react-hot-toast', () => ({
  __esModule: true,
  default: {
    success: jest.fn(),
    error: jest.fn(),
  },
}));

describe('CreateWalletModal', () => {
  const mockOnClose = jest.fn();
  const mockOnCreate = jest.fn();

  beforeEach(() => {
    jest.clearAllMocks();
  });

  it('should render modal', () => {
    render(
      <CreateWalletModal
        onClose={mockOnClose}
        onCreate={mockOnCreate}
      />
    );

    expect(screen.getByText('Create New Wallet')).toBeInTheDocument();
    expect(screen.getByLabelText('Wallet Name')).toBeInTheDocument();
    expect(screen.getByRole('button', { name: 'Create Wallet' })).toBeInTheDocument();
  });

  // Modal visibility is controlled by parent component, not by props

  it('should allow entering wallet name', () => {
    render(
      <CreateWalletModal
        onClose={mockOnClose}
        onCreate={mockOnCreate}
      />
    );

    const input = screen.getByLabelText('Wallet Name') as HTMLInputElement;
    fireEvent.change(input, { target: { value: 'My New Wallet' } });
    
    expect(input.value).toBe('My New Wallet');
  });

  it('should call onClose when cancel button is clicked', () => {
    render(
      <CreateWalletModal
        onClose={mockOnClose}
        onCreate={mockOnCreate}
      />
    );

    const cancelButton = screen.getByRole('button', { name: 'Cancel' });
    fireEvent.click(cancelButton);

    expect(mockOnClose).toHaveBeenCalled();
  });
});