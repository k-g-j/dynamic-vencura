/**
 * API service for interacting with the VenCura backend
 * Handles authentication and wallet operations
 */

import axios, { AxiosInstance } from 'axios';
import type {
  WalletResponse,
  BalanceResponse,
  SignedMessageResponse,
  TransactionResponse,
} from '@vencura/shared';

class ApiService {
  private client: AxiosInstance;
  private token: string | null = null;

  constructor() {
    this.client = axios.create({
      baseURL: '/api',
      headers: {
        'Content-Type': 'application/json',
      },
    });

    /** Request interceptor to add authentication token */
    this.client.interceptors.request.use(
      (config) => {
        const token = this.getToken();
        if (token) {
          config.headers.Authorization = `Bearer ${token}`;
        }
        return config;
      },
      (error) => Promise.reject(error)
    );

    /** Response interceptor for error handling */
    this.client.interceptors.response.use(
      (response) => response,
      (error) => {
        if (error.response?.status === 401) {
          // Only redirect if not already on the login page
          if (!window.location.pathname.includes('/login')) {
            this.clearToken();
            window.location.href = '/login';
          }
        }
        return Promise.reject(error);
      }
    );
  }

  /** Store authentication token */
  setToken(token: string): void {
    this.token = token;
    localStorage.setItem('auth_token', token);
  }

  /** Retrieve authentication token */
  getToken(): string | null {
    if (!this.token) {
      this.token = localStorage.getItem('auth_token');
    }
    return this.token;
  }

  /** Clear authentication token */
  clearToken(): void {
    this.token = null;
    localStorage.removeItem('auth_token');
  }

  /** Authenticate with Dynamic token */
  async loginWithDynamic(dynamicToken: string): Promise<{ user: { id: string; email: string; name?: string }; token: string }> {
    const response = await this.client.post('/auth/login', { token: dynamicToken });
    this.setToken(response.data.token);
    return response.data;
  }

  /** Get user profile */
  async getProfile(): Promise<{ id: string; email: string; name?: string }> {
    const response = await this.client.get('/auth/profile');
    return response.data;
  }

  /** Create new wallet */
  async createWallet(name: string): Promise<WalletResponse> {
    const response = await this.client.post('/wallets', { name });
    return response.data;
  }

  /** Get all user wallets */
  async getWallets(): Promise<WalletResponse[]> {
    const response = await this.client.get('/wallets');
    return response.data;
  }

  /** Get wallet balance */
  async getBalance(walletId: string): Promise<BalanceResponse> {
    const response = await this.client.get(`/wallets/${walletId}/balance`);
    return response.data;
  }

  /** Sign message with wallet */
  async signMessage(walletId: string, message: string): Promise<SignedMessageResponse> {
    const response = await this.client.post(`/wallets/${walletId}/sign-message`, { message });
    return response.data;
  }

  /** Send transaction from wallet */
  async sendTransaction(
    walletId: string,
    to: string,
    amount: number,
    gasLimit?: number,
    gasPrice?: string
  ): Promise<TransactionResponse> {
    const response = await this.client.post(`/wallets/${walletId}/send-transaction`, {
      to,
      amount,
      gasLimit,
      gasPrice,
    });
    return response.data;
  }

  /** Get transaction history for wallet */
  async getTransactionHistory(walletId: string): Promise<TransactionResponse[]> {
    const response = await this.client.get(`/wallets/${walletId}/transactions`);
    return response.data;
  }
}

export const apiService = new ApiService();