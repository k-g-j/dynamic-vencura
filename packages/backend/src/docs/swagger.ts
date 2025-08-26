/**
 * OpenAPI/Swagger documentation configuration
 * 
 * Provides comprehensive API documentation with:
 * - Interactive API explorer
 * - Request/response schemas
 * - Authentication details
 * - Example payloads
 */

import swaggerJsdoc from 'swagger-jsdoc';
import { env } from '../config/env';

const swaggerDefinition = {
  openapi: '3.0.0',
  info: {
    title: 'VenCura API',
    version: '1.0.0',
    description: `
      VenCura is a secure custodial wallet management platform that provides an API-driven approach 
      to creating and managing Ethereum wallets. Built with enterprise-grade security and seamless 
      integration with Dynamic for authentication.
      
      ## Features
      - **Custodial Wallet Creation**: Generate secure Ethereum wallets with encrypted private key storage
      - **Balance Management**: Real-time balance checking on Sepolia testnet
      - **Message Signing**: Cryptographic message signing with wallet private keys
      - **Transaction Sending**: Secure transaction execution with customizable gas parameters
      - **Transaction History**: Complete audit trail of all wallet transactions
      
      ## Security
      - AES-256-GCM encryption for private keys
      - JWT authentication with Dynamic SDK
      - Rate limiting protection
      - Correlation IDs for request tracing
    `,
    contact: {
      name: 'VenCura Support',
      email: 'support@vencura.io',
    },
    license: {
      name: 'MIT',
      url: 'https://opensource.org/licenses/MIT',
    },
  },
  servers: [
    {
      url: env.NODE_ENV === 'production' 
        ? 'https://vencura.fly.dev/api'
        : `http://localhost:${env.PORT}/api`,
      description: env.NODE_ENV === 'production' ? 'Production' : 'Development',
    },
  ],
  components: {
    securitySchemes: {
      bearerAuth: {
        type: 'http',
        scheme: 'bearer',
        bearerFormat: 'JWT',
        description: 'JWT token obtained from /auth/login endpoint',
      },
      dynamicToken: {
        type: 'apiKey',
        in: 'header',
        name: 'X-Dynamic-Token',
        description: 'Dynamic SDK authentication token',
      },
    },
    schemas: {
      User: {
        type: 'object',
        properties: {
          id: {
            type: 'string',
            format: 'uuid',
            description: 'User unique identifier',
          },
          email: {
            type: 'string',
            format: 'email',
            description: 'User email address',
          },
          dynamicUserId: {
            type: 'string',
            description: 'Dynamic SDK user identifier',
          },
          createdAt: {
            type: 'string',
            format: 'date-time',
            description: 'User creation timestamp',
          },
          updatedAt: {
            type: 'string',
            format: 'date-time',
            description: 'Last update timestamp',
          },
        },
      },
      Wallet: {
        type: 'object',
        properties: {
          id: {
            type: 'string',
            format: 'uuid',
            description: 'Wallet unique identifier',
          },
          address: {
            type: 'string',
            pattern: '^0x[a-fA-F0-9]{40}$',
            description: 'Ethereum wallet address',
            example: '0x742d35Cc6634C0532925a3b844Bc9e7595f0bEb6',
          },
          name: {
            type: 'string',
            description: 'Wallet display name',
            example: 'My Savings Wallet',
          },
          userId: {
            type: 'string',
            format: 'uuid',
            description: 'Owner user ID',
          },
          createdAt: {
            type: 'string',
            format: 'date-time',
          },
          updatedAt: {
            type: 'string',
            format: 'date-time',
          },
        },
      },
      Balance: {
        type: 'object',
        properties: {
          walletId: {
            type: 'string',
            format: 'uuid',
          },
          balance: {
            type: 'string',
            description: 'Balance in wei',
            example: '1000000000000000000',
          },
          formattedBalance: {
            type: 'string',
            description: 'Human-readable balance in ETH',
            example: '1.0',
          },
        },
      },
      Transaction: {
        type: 'object',
        properties: {
          walletId: {
            type: 'string',
            format: 'uuid',
          },
          transactionHash: {
            type: 'string',
            description: 'Blockchain transaction hash',
            example: '0x123abc...',
          },
          from: {
            type: 'string',
            pattern: '^0x[a-fA-F0-9]{40}$',
            description: 'Sender address',
          },
          to: {
            type: 'string',
            pattern: '^0x[a-fA-F0-9]{40}$',
            description: 'Recipient address',
          },
          amount: {
            type: 'string',
            description: 'Transaction amount in wei',
          },
          status: {
            type: 'string',
            enum: ['pending', 'confirmed', 'failed'],
            description: 'Transaction status',
          },
          gasUsed: {
            type: 'string',
            description: 'Gas consumed by transaction',
          },
          blockNumber: {
            type: 'number',
            description: 'Block number where transaction was mined',
          },
        },
      },
      SignedMessage: {
        type: 'object',
        properties: {
          walletId: {
            type: 'string',
            format: 'uuid',
          },
          message: {
            type: 'string',
            description: 'Original message',
          },
          signature: {
            type: 'string',
            description: 'Cryptographic signature',
            example: '0xabc123...',
          },
        },
      },
      Error: {
        type: 'object',
        properties: {
          error: {
            type: 'string',
            description: 'Error code',
          },
          message: {
            type: 'string',
            description: 'Error message',
          },
          statusCode: {
            type: 'number',
            description: 'HTTP status code',
          },
          correlationId: {
            type: 'string',
            description: 'Request correlation ID for tracing',
          },
          details: {
            type: 'object',
            description: 'Additional error details (development only)',
          },
        },
      },
    },
    parameters: {
      walletId: {
        name: 'walletId',
        in: 'path',
        required: true,
        description: 'Wallet unique identifier',
        schema: {
          type: 'string',
          format: 'uuid',
        },
      },
      correlationId: {
        name: 'X-Correlation-ID',
        in: 'header',
        required: false,
        description: 'Request correlation ID for tracing',
        schema: {
          type: 'string',
          format: 'uuid',
        },
      },
    },
  },
  tags: [
    {
      name: 'Authentication',
      description: 'User authentication and session management',
    },
    {
      name: 'Wallets',
      description: 'Wallet creation and management',
    },
    {
      name: 'Transactions',
      description: 'Blockchain transactions and history',
    },
    {
      name: 'Signing',
      description: 'Message signing operations',
    },
  ],
};

const options = {
  definition: swaggerDefinition,
  apis: [
    './src/routes/*.ts',
    './src/controllers/*.ts',
    './dist/routes/*.js',
    './dist/controllers/*.js',
  ],
};

export const swaggerSpec = swaggerJsdoc(options);