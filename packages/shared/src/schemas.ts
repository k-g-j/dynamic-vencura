import { z } from 'zod';

export const ethereumAddressSchema = z.string().regex(/^0x[a-fA-F0-9]{40}$/);

export const createWalletSchema = z.object({
  name: z.string().min(1).max(100),
  userId: z.string().uuid(),
});

export const signMessageSchema = z.object({
  walletId: z.string().uuid(),
  message: z.string().min(1),
});

export const sendTransactionSchema = z.object({
  walletId: z.string().uuid(),
  to: ethereumAddressSchema,
  amount: z.union([z.string(), z.number()]).transform(val => String(val)),
  gasLimit: z.number().positive().optional(),
  gasPrice: z.string().optional(),
});

export const getBalanceSchema = z.object({
  walletId: z.string().uuid(),
});

export const walletResponseSchema = z.object({
  id: z.string().uuid(),
  address: ethereumAddressSchema,
  name: z.string(),
  userId: z.string().uuid(),
  createdAt: z.string().datetime(),
  updatedAt: z.string().datetime(),
});

export const balanceResponseSchema = z.object({
  walletId: z.string().uuid(),
  address: ethereumAddressSchema,
  balance: z.string(),
  formattedBalance: z.string(),
});

export const signedMessageResponseSchema = z.object({
  walletId: z.string().uuid(),
  message: z.string(),
  signature: z.string(),
});

export const transactionResponseSchema = z.object({
  walletId: z.string().uuid(),
  transactionHash: z.string(),
  from: ethereumAddressSchema,
  to: ethereumAddressSchema,
  amount: z.string(),
  status: z.enum(['pending', 'confirmed', 'failed']),
  gasUsed: z.string().optional(),
  blockNumber: z.number().optional(),
});

export const errorResponseSchema = z.object({
  error: z.string(),
  message: z.string(),
  statusCode: z.number(),
  timestamp: z.string().datetime(),
});