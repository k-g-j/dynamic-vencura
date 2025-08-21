# VenCura Architecture Summary

## Executive Overview

VenCura is a production-ready custodial wallet platform built with enterprise-grade security and scalability in mind. The architecture follows industry best practices for financial applications handling cryptocurrency transactions.

## Core Architecture Decisions

### 1. Custodial Wallet Model
- **Decision**: Server-side private key generation and management
- **Rationale**: Simplified user experience without compromising security
- **Implementation**: AES-256-GCM encryption with PBKDF2 key derivation

### 2. Security-First Design
- **Multiple Security Layers**: Defense-in-depth approach
- **Encryption**: Military-grade AES-256-GCM for private keys
- **Authentication**: JWT with Dynamic SDK integration
- **Rate Limiting**: Configurable limits for API and transactions
- **Audit Trail**: Comprehensive logging of all operations

### 3. Type-Safe Development
- **TypeScript**: Strict mode enabled across the stack
- **Shared Types**: Common type definitions between frontend and backend
- **Runtime Validation**: Zod schemas for input validation
- **Compile-Time Safety**: Catching errors before runtime

## Technical Implementation

### Backend Architecture
```
Client Request → Express Server → Middleware Layer → Controller → Service → Database/Blockchain
                      ↓
               Authentication → Rate Limiting → Validation → Logging
```

### Key Components

#### Service Layer
- **WalletService**: Core wallet operations (create, sign, send)
- **AuthService**: Dynamic SDK integration and JWT management
- **TransactionService**: Blockchain interaction and retry logic
- **CryptoService**: Encryption/decryption operations

#### Security Middleware
- **Authentication**: JWT verification for all protected routes
- **Rate Limiting**: Prevents abuse and DDoS attacks
- **Validation**: Zod schemas validate all inputs
- **Error Handling**: Structured error responses with correlation IDs

#### Database Design
- **Users**: Store authenticated user information
- **Wallets**: Encrypted private keys with user association
- **Transactions**: Complete transaction history with status tracking
- **SignedMessages**: Audit trail for message signing
- **AuditLogs**: Comprehensive operation logging

### Frontend Architecture
- **React**: Component-based UI with hooks
- **Dynamic SDK**: Web3 wallet authentication
- **TypeScript**: Type-safe development
- **Tailwind CSS**: Utility-first styling

## API Design

### RESTful Endpoints
```
POST   /api/auth/login              # Authenticate with Dynamic
GET    /api/auth/profile            # Get user profile
POST   /api/wallets                 # Create new wallet
GET    /api/wallets                 # List user wallets
GET    /api/wallets/:id/balance    # Get wallet balance
POST   /api/wallets/:id/sign-message # Sign message
POST   /api/wallets/:id/send-transaction # Send transaction
GET    /api/wallets/:id/transactions # Transaction history
```

### Response Format
```json
{
  "data": {},           // Success response
  "error": "string",    // Error type
  "message": "string",  // Human-readable message
  "correlationId": "uuid" // Request tracking
}
```

## Security Architecture

### Encryption Strategy
```
Private Key → PBKDF2 (100k iterations) → AES-256-GCM → Encrypted Storage
                  ↓
            Unique Salt + IV per encryption
```

### Authentication Flow
```
User → Dynamic SDK → Dynamic JWT → Backend Validation → VenCura JWT → API Access
```

### Transaction Security
1. User authentication check
2. Wallet ownership verification
3. Balance validation
4. Gas estimation
5. Rate limit check
6. Transaction signing
7. Blockchain submission
8. Status tracking

## Deployment Architecture

### Production Stack
- **Platform**: Fly.io (Global edge network)
- **Database**: PostgreSQL (ACID compliant)
- **Monitoring**: Health checks and metrics
- **Scaling**: Horizontal scaling ready

### Environment Configuration
- Development: SQLite for simplicity
- Production: PostgreSQL for reliability
- Test: In-memory database for speed

## Known Limitations & Trade-offs

### Current Limitations
1. **Single Chain**: Currently supports only Ethereum/Sepolia
2. **Custodial Only**: No self-custody option yet
3. **Regional**: Database in single region

### Trade-offs Made
1. **Custodial vs Non-Custodial**: Chose simplicity over full decentralization
2. **Synchronous Processing**: Simpler than queue-based but less scalable
3. **Monolithic Architecture**: Easier to develop and deploy initially

## Security Considerations

### Implemented Measures
- ✅ Encrypted private key storage
- ✅ Rate limiting on all endpoints
- ✅ Input validation and sanitization
- ✅ SQL injection prevention via ORM
- ✅ XSS protection via React
- ✅ CSRF protection via CORS
- ✅ Secure headers via Helmet.js
- ✅ JWT expiration and validation

### Recommended Enhancements
- Hardware Security Module (HSM) for key storage
- Multi-signature wallet support
- Two-factor authentication
- IP whitelisting for high-value operations
- Advanced threat detection
- Regular security audits

## Performance Optimizations

### Implemented
- Database indexing on frequently queried fields
- Connection pooling for database
- Lazy loading of balances
- Efficient pagination
- Request/response compression

### Future Optimizations
- Redis caching for balance queries
- CDN for static assets
- Database read replicas
- Message queue for transactions
- WebSocket for real-time updates

## Testing Strategy

### Coverage
- **Unit Tests**: Services, utilities, crypto operations
- **Integration Tests**: API endpoints, database operations
- **Security Tests**: Encryption, authentication, authorization
- **Error Tests**: Edge cases, invalid inputs, network failures

### Test Infrastructure
- Jest for test runner
- Mocked blockchain for deterministic tests
- In-memory database for fast tests
- 100% coverage of core functionality

## Monitoring & Observability

### Implemented
- Structured logging with correlation IDs
- Request/response logging
- Error tracking with stack traces
- Transaction status monitoring
- Rate limit metrics

### Recommended Additions
- APM (Application Performance Monitoring)
- Real-time alerting
- Dashboard for key metrics
- Blockchain event monitoring
- User behavior analytics

## Compliance & Regulatory

### Current State
- Audit trail for all operations
- User isolation and access control
- Encrypted sensitive data
- Configurable transaction limits

### Future Requirements
- KYC/AML integration
- Regulatory reporting
- Data retention policies
- GDPR compliance tools
- SOC 2 certification path

## Conclusion

VenCura's architecture prioritizes security, reliability, and user experience while maintaining flexibility for future enhancements. The modular design allows for incremental improvements without major refactoring, and the comprehensive testing ensures stability as the platform evolves.