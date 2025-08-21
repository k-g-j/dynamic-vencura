/**
 * Wallet Management Routes
 * 
 * Defines REST API endpoints for custodial wallet operations including:
 * - Creating new wallets with secure key generation
 * - Querying wallet balances from blockchain
 * - Signing messages for authentication and proof of ownership
 * - Sending Ethereum transactions with gas optimization
 * - Retrieving transaction history with status tracking
 * 
 * Security Features:
 * - JWT authentication required for all endpoints
 * - Rate limiting on transaction endpoints to prevent abuse
 * - User isolation ensuring users can only access their own wallets
 * - Input validation using Zod schemas
 * - Comprehensive audit logging
 * 
 * @fileoverview Wallet REST API routes with authentication and rate limiting
 */

import { Router } from 'express';
import { WalletController } from '../controllers/WalletController';
import { authenticateUser } from '../middleware/auth';
import { transactionRateLimiter } from '../middleware/security';

// Initialize router and controller instances
const router = Router();
const walletController = new WalletController();

// Apply JWT authentication to all wallet routes
// All endpoints require valid Bearer token in Authorization header
router.use(authenticateUser);

/**
 * @route POST /api/wallets
 * @desc Create a new custodial wallet for the authenticated user
 * @access Private (JWT required)
 * @rateLimit Standard API rate limiting
 * @body {string} name - Human-readable wallet name
 * 
 * Creates a new Ethereum wallet with:
 * - Cryptographically secure private key generation
 * - AES-256-GCM encrypted private key storage
 * - Database persistence with user association
 * - Audit trail logging
 */
router.post('/', (req, res) => walletController.createWallet(req, res));

/**
 * @route GET /api/wallets
 * @desc Get all wallets belonging to the authenticated user
 * @access Private (JWT required)
 * @rateLimit Standard API rate limiting
 * 
 * Returns array of user's wallets ordered by creation date.
 * Private keys are never included in response.
 */
router.get('/', (req, res) => walletController.getUserWallets(req, res));

/**
 * @route GET /api/wallets/:walletId/balance
 * @desc Get current blockchain balance for specified wallet
 * @access Private (JWT required)
 * @rateLimit Standard API rate limiting
 * @param {string} walletId - UUID of the wallet to query
 * 
 * Queries Ethereum blockchain directly for real-time balance.
 * Returns balance in both wei (raw) and ETH (formatted) values.
 */
router.get('/:walletId/balance', (req, res) => walletController.getBalance(req, res));

/**
 * @route POST /api/wallets/:walletId/sign-message
 * @desc Sign a message using the wallet's private key
 * @access Private (JWT required)
 * @rateLimit Standard API rate limiting
 * @param {string} walletId - UUID of the wallet to use for signing
 * @body {string} message - Message text to sign
 * 
 * Creates EIP-191 compliant signature for authentication or proof of ownership.
 * Signing operation is logged and signature stored for audit trail.
 */
router.post('/:walletId/sign-message', (req, res) => walletController.signMessage(req, res));

/**
 * @route POST /api/wallets/:walletId/send-transaction
 * @desc Send an Ethereum transaction from the specified wallet
 * @access Private (JWT required)
 * @rateLimit 5 requests per 15 minutes (transaction rate limiting)
 * @param {string} walletId - UUID of the wallet to send from
 * @body {string} to - Recipient Ethereum address (0x format)
 * @body {string|number} amount - Amount to send in ETH
 * @body {number} [gasLimit] - Optional gas limit for transaction
 * @body {string} [gasPrice] - Optional gas price in gwei
 * 
 * Sends blockchain transaction with comprehensive validation:
 * - Balance sufficiency check
 * - Gas estimation and optimization
 * - Asynchronous status tracking
 * - WebSocket status updates
 * - Complete audit trail
 * 
 * Returns immediately with pending status. Final confirmation
 * status updated asynchronously via WebSocket or polling.
 */
router.post(
  '/:walletId/send-transaction',
  transactionRateLimiter, // Apply stricter rate limiting for transactions
  (req, res) => walletController.sendTransaction(req, res)
);

/**
 * @route GET /api/wallets/:walletId/transactions
 * @desc Get transaction history for specified wallet
 * @access Private (JWT required)
 * @rateLimit Standard API rate limiting
 * @param {string} walletId - UUID of the wallet to query
 * 
 * Returns all transactions associated with the wallet,
 * ordered by creation date (newest first). Includes:
 * - Transaction hashes for blockchain verification
 * - Current status (pending, confirmed, failed)
 * - Gas usage and block information
 * - Amount and recipient details
 */
router.get('/:walletId/transactions', (req, res) => 
  walletController.getTransactionHistory(req, res)
);

// Export configured router with all wallet endpoints
export default router;