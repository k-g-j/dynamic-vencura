/**
 * @swagger
 * /auth/login:
 *   post:
 *     summary: Authenticate with Dynamic token
 *     description: Exchange a Dynamic SDK JWT token for a VenCura API token
 *     tags: [Authentication]
 *     requestBody:
 *       required: true
 *       content:
 *         application/json:
 *           schema:
 *             type: object
 *             required:
 *               - token
 *             properties:
 *               token:
 *                 type: string
 *                 description: Dynamic SDK JWT token
 *                 example: "eyJhbGciOiJSUzI1NiIsInR5cCI6IkpXVCJ9..."
 *     responses:
 *       200:
 *         description: Authentication successful
 *         content:
 *           application/json:
 *             schema:
 *               type: object
 *               properties:
 *                 user:
 *                   $ref: '#/components/schemas/User'
 *                 token:
 *                   type: string
 *                   description: VenCura API JWT token
 *       401:
 *         description: Invalid Dynamic token
 *         content:
 *           application/json:
 *             schema:
 *               $ref: '#/components/schemas/Error'
 */

/**
 * @swagger
 * /auth/me:
 *   get:
 *     summary: Get current user
 *     description: Retrieve the authenticated user's profile
 *     tags: [Authentication]
 *     security:
 *       - bearerAuth: []
 *     parameters:
 *       - $ref: '#/components/parameters/correlationId'
 *     responses:
 *       200:
 *         description: User profile retrieved
 *         content:
 *           application/json:
 *             schema:
 *               $ref: '#/components/schemas/User'
 *       401:
 *         description: Unauthorized
 *         content:
 *           application/json:
 *             schema:
 *               $ref: '#/components/schemas/Error'
 */

/**
 * @swagger
 * /wallets:
 *   post:
 *     summary: Create a new wallet
 *     description: Create a new custodial Ethereum wallet with encrypted private key storage
 *     tags: [Wallets]
 *     security:
 *       - bearerAuth: []
 *     parameters:
 *       - $ref: '#/components/parameters/correlationId'
 *     requestBody:
 *       required: true
 *       content:
 *         application/json:
 *           schema:
 *             type: object
 *             required:
 *               - name
 *             properties:
 *               name:
 *                 type: string
 *                 minLength: 1
 *                 maxLength: 100
 *                 description: Display name for the wallet
 *                 example: "My Savings Wallet"
 *     responses:
 *       201:
 *         description: Wallet created successfully
 *         content:
 *           application/json:
 *             schema:
 *               $ref: '#/components/schemas/Wallet'
 *       400:
 *         description: Invalid request data
 *         content:
 *           application/json:
 *             schema:
 *               $ref: '#/components/schemas/Error'
 *       401:
 *         description: Unauthorized
 *         content:
 *           application/json:
 *             schema:
 *               $ref: '#/components/schemas/Error'
 *   get:
 *     summary: List user wallets
 *     description: Retrieve all wallets owned by the authenticated user
 *     tags: [Wallets]
 *     security:
 *       - bearerAuth: []
 *     parameters:
 *       - $ref: '#/components/parameters/correlationId'
 *     responses:
 *       200:
 *         description: List of user wallets
 *         content:
 *           application/json:
 *             schema:
 *               type: array
 *               items:
 *                 $ref: '#/components/schemas/Wallet'
 *       401:
 *         description: Unauthorized
 *         content:
 *           application/json:
 *             schema:
 *               $ref: '#/components/schemas/Error'
 */

/**
 * @swagger
 * /wallets/{walletId}/balance:
 *   get:
 *     summary: Get wallet balance
 *     description: Query the current balance of a wallet from the blockchain
 *     tags: [Wallets]
 *     security:
 *       - bearerAuth: []
 *     parameters:
 *       - $ref: '#/components/parameters/walletId'
 *       - $ref: '#/components/parameters/correlationId'
 *     responses:
 *       200:
 *         description: Wallet balance retrieved
 *         content:
 *           application/json:
 *             schema:
 *               type: object
 *               properties:
 *                 walletId:
 *                   type: string
 *                   format: uuid
 *                 address:
 *                   type: string
 *                   pattern: '^0x[a-fA-F0-9]{40}$'
 *                 balance:
 *                   type: string
 *                   description: Balance in wei
 *                   example: "1000000000000000000"
 *                 formattedBalance:
 *                   type: string
 *                   description: Human-readable balance in ETH
 *                   example: "1.0"
 *       404:
 *         description: Wallet not found
 *         content:
 *           application/json:
 *             schema:
 *               $ref: '#/components/schemas/Error'
 *       401:
 *         description: Unauthorized
 *         content:
 *           application/json:
 *             schema:
 *               $ref: '#/components/schemas/Error'
 */

/**
 * @swagger
 * /wallets/{walletId}/sign-message:
 *   post:
 *     summary: Sign a message
 *     description: |
 *       Sign a message with the wallet's private key using EIP-191 standard.
 *       This is useful for proving ownership of a wallet without revealing the private key.
 *     tags: [Signing]
 *     security:
 *       - bearerAuth: []
 *     parameters:
 *       - $ref: '#/components/parameters/walletId'
 *       - $ref: '#/components/parameters/correlationId'
 *     requestBody:
 *       required: true
 *       content:
 *         application/json:
 *           schema:
 *             type: object
 *             required:
 *               - message
 *             properties:
 *               message:
 *                 type: string
 *                 minLength: 1
 *                 description: Message to sign
 *                 example: "Authenticate with VenCura at 2024-01-15T10:30:00Z"
 *     responses:
 *       200:
 *         description: Message signed successfully
 *         content:
 *           application/json:
 *             schema:
 *               $ref: '#/components/schemas/SignedMessage'
 *       404:
 *         description: Wallet not found
 *         content:
 *           application/json:
 *             schema:
 *               $ref: '#/components/schemas/Error'
 *       401:
 *         description: Unauthorized
 *         content:
 *           application/json:
 *             schema:
 *               $ref: '#/components/schemas/Error'
 */

/**
 * @swagger
 * /wallets/{walletId}/send-transaction:
 *   post:
 *     summary: Send a transaction
 *     description: |
 *       Send an Ethereum transaction from the custodial wallet.
 *       
 *       **Gas Handling:**
 *       - If `gasLimit` is not provided, it will be automatically estimated
 *       - If `gasPrice` is not provided, current network gas price will be used
 *       - Transactions are retried with increased gas price on failure
 *       
 *       **Transaction Lifecycle:**
 *       1. Balance validation (including gas fees)
 *       2. Transaction preparation and signing
 *       3. Broadcasting to blockchain
 *       4. Immediate response with pending status
 *       5. Asynchronous confirmation tracking
 *       
 *       **Status Updates:**
 *       - Initial response has status: 'pending'
 *       - Updates available via WebSocket or polling transaction history
 *       - Final status will be 'confirmed' or 'failed'
 *     tags: [Transactions]
 *     security:
 *       - bearerAuth: []
 *     parameters:
 *       - $ref: '#/components/parameters/walletId'
 *       - $ref: '#/components/parameters/correlationId'
 *     requestBody:
 *       required: true
 *       content:
 *         application/json:
 *           schema:
 *             type: object
 *             required:
 *               - to
 *               - amount
 *             properties:
 *               to:
 *                 type: string
 *                 pattern: '^0x[a-fA-F0-9]{40}$'
 *                 description: Recipient Ethereum address
 *                 example: "0x742d35Cc6634C0532925a3b844Bc9e7595f0bEb4"
 *               amount:
 *                 type: string
 *                 description: Amount to send in ETH (not wei)
 *                 example: "0.1"
 *               gasLimit:
 *                 type: integer
 *                 minimum: 21000
 *                 description: Gas limit for transaction (optional, will be estimated if not provided)
 *                 example: 21000
 *               gasPrice:
 *                 type: string
 *                 description: Gas price in gwei (optional, will use current network price if not provided)
 *                 example: "20"
 *     responses:
 *       200:
 *         description: Transaction sent successfully
 *         content:
 *           application/json:
 *             schema:
 *               $ref: '#/components/schemas/Transaction'
 *             example:
 *               walletId: "123e4567-e89b-12d3-a456-426614174000"
 *               transactionHash: "0x9f86d081884c7d659a2feaa0c55ad015a3bf4f1b2b0b822cd15d6c15b0f00a08"
 *               from: "0x742d35Cc6634C0532925a3b844Bc9e7595f0bEb4"
 *               to: "0x5FbDB2315678afecb367f032d93F642f64180aa3"
 *               amount: "100000000000000000"
 *               status: "pending"
 *       400:
 *         description: Invalid request or insufficient balance
 *         content:
 *           application/json:
 *             schema:
 *               $ref: '#/components/schemas/Error'
 *             examples:
 *               insufficientBalance:
 *                 summary: Insufficient balance
 *                 value:
 *                   error: "INSUFFICIENT_BALANCE"
 *                   message: "Insufficient balance in wallet 0x742d35... Required: 1000000000000000000 wei, Available: 500000000000000000 wei"
 *                   statusCode: 400
 *               invalidAddress:
 *                 summary: Invalid recipient address
 *                 value:
 *                   error: "VALIDATION_ERROR"
 *                   message: "Invalid Ethereum address format"
 *                   statusCode: 400
 *       404:
 *         description: Wallet not found
 *         content:
 *           application/json:
 *             schema:
 *               $ref: '#/components/schemas/Error'
 *       429:
 *         description: Rate limit exceeded (max 5 transactions per minute)
 *         content:
 *           application/json:
 *             schema:
 *               $ref: '#/components/schemas/Error'
 *       502:
 *         description: Blockchain network error
 *         content:
 *           application/json:
 *             schema:
 *               $ref: '#/components/schemas/Error'
 */

/**
 * @swagger
 * /wallets/{walletId}/transactions:
 *   get:
 *     summary: Get transaction history
 *     description: |
 *       Retrieve the transaction history for a specific wallet.
 *       Transactions are returned in descending order by creation date (newest first).
 *     tags: [Transactions]
 *     security:
 *       - bearerAuth: []
 *     parameters:
 *       - $ref: '#/components/parameters/walletId'
 *       - $ref: '#/components/parameters/correlationId'
 *       - name: limit
 *         in: query
 *         required: false
 *         description: Maximum number of transactions to return
 *         schema:
 *           type: integer
 *           minimum: 1
 *           maximum: 100
 *           default: 50
 *       - name: offset
 *         in: query
 *         required: false
 *         description: Number of transactions to skip
 *         schema:
 *           type: integer
 *           minimum: 0
 *           default: 0
 *       - name: status
 *         in: query
 *         required: false
 *         description: Filter by transaction status
 *         schema:
 *           type: string
 *           enum: [pending, confirmed, failed]
 *     responses:
 *       200:
 *         description: Transaction history retrieved
 *         content:
 *           application/json:
 *             schema:
 *               type: array
 *               items:
 *                 $ref: '#/components/schemas/Transaction'
 *       404:
 *         description: Wallet not found
 *         content:
 *           application/json:
 *             schema:
 *               $ref: '#/components/schemas/Error'
 *       401:
 *         description: Unauthorized
 *         content:
 *           application/json:
 *             schema:
 *               $ref: '#/components/schemas/Error'
 */

/**
 * @swagger
 * /health:
 *   get:
 *     summary: Health check
 *     description: Check if the API is running and can connect to dependencies
 *     tags: [System]
 *     responses:
 *       200:
 *         description: Service is healthy
 *         content:
 *           application/json:
 *             schema:
 *               type: object
 *               properties:
 *                 status:
 *                   type: string
 *                   enum: [healthy]
 *                 timestamp:
 *                   type: string
 *                   format: date-time
 *                 version:
 *                   type: string
 *                 database:
 *                   type: string
 *                   enum: [connected, disconnected]
 *                 blockchain:
 *                   type: string
 *                   enum: [connected, disconnected]
 *       503:
 *         description: Service is unhealthy
 *         content:
 *           application/json:
 *             schema:
 *               type: object
 *               properties:
 *                 status:
 *                   type: string
 *                   enum: [unhealthy]
 *                 errors:
 *                   type: array
 *                   items:
 *                     type: string
 */

export {};