import { z } from 'zod';
import * as schemas from './schemas';

export type EthereumAddress = z.infer<typeof schemas.ethereumAddressSchema>;
export type CreateWalletRequest = z.infer<typeof schemas.createWalletSchema>;
export type SignMessageRequest = z.infer<typeof schemas.signMessageSchema>;
export type SendTransactionRequest = z.infer<typeof schemas.sendTransactionSchema>;
export type GetBalanceRequest = z.infer<typeof schemas.getBalanceSchema>;
export type WalletResponse = z.infer<typeof schemas.walletResponseSchema>;
export type BalanceResponse = z.infer<typeof schemas.balanceResponseSchema>;
export type SignedMessageResponse = z.infer<typeof schemas.signedMessageResponseSchema>;
export type TransactionResponse = z.infer<typeof schemas.transactionResponseSchema>;
export type ErrorResponse = z.infer<typeof schemas.errorResponseSchema>;

export interface User {
  id: string;
  email: string;
  dynamicUserId: string;
  createdAt: Date;
  updatedAt: Date;
}

export interface Wallet {
  id: string;
  address: EthereumAddress;
  encryptedPrivateKey: string;
  name: string;
  userId: string;
  user?: User;
  createdAt: Date;
  updatedAt: Date;
}

export interface Transaction {
  id: string;
  walletId: string;
  wallet?: Wallet;
  transactionHash: string;
  from: EthereumAddress;
  to: EthereumAddress;
  amount: string;
  gasUsed?: string;
  gasPrice?: string;
  blockNumber?: number;
  status: 'pending' | 'confirmed' | 'failed';
  createdAt: Date;
  updatedAt: Date;
}

export interface SignedMessage {
  id: string;
  walletId: string;
  wallet?: Wallet;
  message: string;
  signature: string;
  createdAt: Date;
}