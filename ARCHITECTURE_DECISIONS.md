# Architecture Decision Records

## Overview

This document captures the key architectural decisions made during the development of VenCura, including the rationale, trade-offs, and implications of each decision.

## Decision Log

### ADR-001: Monorepo Structure

**Status**: Accepted  
**Date**: 2024

**Context**  
The project requires both backend API and frontend application with shared types and schemas.

**Decision**  
Implement a monorepo structure using npm workspaces with three packages:
- `@vencura/backend` - Express API server
- `@vencura/frontend` - React application
- `@vencura/shared` - Shared types and schemas

**Rationale**
- **Type Safety**: Shared types ensure consistency between frontend and backend
- **Code Reuse**: Common validation schemas used by both applications
- **Simplified Development**: Single repository simplifies development workflow
- **Atomic Changes**: Related changes across packages can be committed together

**Consequences**
- Increased initial setup complexity
- Requires proper workspace configuration
- Build order dependencies must be managed

---

### ADR-002: TypeScript with Strict Configuration

**Status**: Accepted  
**Date**: 2024

**Context**  
Type safety is critical for financial applications handling cryptocurrency transactions.

**Decision**  
Enable all strict TypeScript compiler options including:
- `strict: true`
- `noUncheckedIndexedAccess: true`
- `exactOptionalPropertyTypes: true`
- `noImplicitReturns: true`

**Rationale**
- **Runtime Safety**: Catches potential errors at compile time
- **Maintainability**: Self-documenting code with explicit types
- **Refactoring Confidence**: Type system catches breaking changes
- **Developer Experience**: Better IDE support and autocomplete

**Consequences**
- Longer initial development time
- Requires explicit type definitions
- May require type assertions in some cases

---

### ADR-003: Custodial Wallet Architecture

**Status**: Accepted  
**Date**: 2024

**Context**  
The application needs to manage Ethereum wallets on behalf of users.

**Decision**  
Implement custodial wallet management where:
- Private keys are generated server-side
- Keys are encrypted using AES-256-GCM before storage
- All blockchain interactions happen through the backend API

**Rationale**
- **User Experience**: No need for users to manage private keys
- **Security Control**: Centralized security measures
- **Transaction Management**: Server can validate and rate-limit transactions
- **Recovery Options**: Potential for account recovery mechanisms

**Trade-offs**
- **Trust Requirement**: Users must trust the platform
- **Single Point of Failure**: Compromised server affects all wallets
- **Regulatory Considerations**: May require compliance with financial regulations

**Mitigations**
- Strong encryption for private key storage
- Rate limiting and transaction validation
- Comprehensive audit logging
- Future: HSM integration for production

---

### ADR-004: Database Choice - PostgreSQL with TypeORM

**Status**: Accepted  
**Date**: 2024

**Context**  
Need reliable data storage for users, wallets, and transaction history.

**Decision**  
Use PostgreSQL with TypeORM as the ORM layer.

**Rationale**
- **ACID Compliance**: Critical for financial data integrity
- **Relational Model**: Natural fit for user-wallet-transaction relationships
- **TypeORM Benefits**: TypeScript integration, migrations, decorators
- **Production Ready**: PostgreSQL is battle-tested for financial applications

**Alternatives Considered**
- **MongoDB**: Rejected due to lack of ACID guarantees
- **SQLite**: Rejected as not suitable for production scale
- **Prisma**: Considered but TypeORM decorators align better with architecture

**Consequences**
- Requires PostgreSQL installation and management
- TypeORM learning curve for decorators
- Schema migrations must be managed

---

### ADR-005: Authentication Strategy - Dynamic SDK

**Status**: Accepted  
**Date**: 2024

**Context**  
Need secure authentication that integrates with Web3 wallets.

**Decision**  
Use Dynamic SDK for authentication with JWT tokens for API access.

**Rationale**
- **Web3 Native**: Built for wallet-based authentication
- **User Experience**: Familiar wallet connection flow
- **Security**: Leverages existing wallet security
- **Flexibility**: Supports multiple wallet providers

**Implementation**
- Dynamic handles initial authentication
- Server validates Dynamic token and issues JWT
- JWT used for subsequent API requests

**Consequences**
- Dependency on Dynamic service
- Requires Dynamic account and configuration
- Additional token exchange step

---

### ADR-006: Blockchain Integration - Ethers.js v6

**Status**: Accepted  
**Date**: 2024

**Context**  
Need to interact with Ethereum blockchain for wallet operations.

**Decision**  
Use Ethers.js v6 for all blockchain interactions.

**Rationale**
- **Maturity**: Well-established library with extensive documentation
- **TypeScript Support**: First-class TypeScript support in v6
- **Feature Complete**: Supports all required operations
- **Community**: Large community and ecosystem

**Alternatives Considered**
- **Web3.js**: More complex API, larger bundle size
- **Viem**: Newer, less established
- **Direct RPC**: Too low-level, would require reimplementing features

---

### ADR-007: Security Architecture

**Status**: Accepted  
**Date**: 2024

**Context**  
Handling cryptocurrency requires maximum security considerations.

**Decision**  
Implement defense-in-depth security strategy:

1. **Encryption Layer**
   - AES-256-GCM for private keys
   - PBKDF2 for key derivation
   - Random salt and IV per encryption

2. **API Security**
   - JWT authentication
   - Rate limiting (general and transaction-specific)
   - Input validation with Zod
   - Helmet.js for headers

3. **Access Control**
   - User isolation (users access only their wallets)
   - Transaction validation
   - Amount limits (configurable)

**Rationale**
- **Defense in Depth**: Multiple security layers
- **Industry Standards**: Using proven cryptographic methods
- **Compliance Ready**: Foundation for regulatory compliance

**Future Enhancements**
- Hardware Security Module (HSM) integration
- Multi-signature support
- Two-factor authentication
- IP whitelisting

---

### ADR-008: Frontend Architecture - React with Vite

**Status**: Accepted  
**Date**: 2024

**Context**  
Need a modern, performant frontend for wallet management interface.

**Decision**  
Use React with Vite as the build tool and Tailwind CSS for styling.

**Rationale**
- **React**: Industry standard, large ecosystem, Dynamic SDK support
- **Vite**: Fast development experience, better than CRA
- **Tailwind**: Rapid UI development, consistent design system
- **TypeScript**: Maintains type safety across stack

**Consequences**
- Requires bundler configuration
- CSS framework learning curve
- Component architecture planning needed

---

### ADR-009: Testing Strategy

**Status**: Accepted  
**Date**: 2024

**Context**  
Financial applications require comprehensive testing.

**Decision**  
Implement multi-level testing strategy:
- Unit tests for services and utilities
- Integration tests for API endpoints
- Mocked blockchain interactions for testing

**Tools**
- Jest as test runner
- Supertest for API testing
- Mock implementations for external services

**Rationale**
- **Confidence**: Comprehensive test coverage
- **Refactoring Safety**: Tests catch regressions
- **Documentation**: Tests serve as usage examples

---

### ADR-010: Error Handling Strategy

**Status**: Accepted  
**Date**: 2024

**Context**  
Need consistent error handling across the application.

**Decision**  
Implement structured error handling:
- Zod for validation errors
- Custom error classes for business logic
- Centralized error middleware
- Structured error responses

**Error Response Format**
```json
{
  "error": "Error type",
  "message": "Human readable message",
  "statusCode": 400,
  "timestamp": "2024-01-01T00:00:00Z"
}
```

**Rationale**
- **Consistency**: Predictable error format
- **Debugging**: Detailed error information
- **Security**: Avoids leaking sensitive information

---

## Architectural Principles

### 1. Separation of Concerns
- Clear boundaries between layers
- Business logic isolated in services
- Controllers handle HTTP concerns only

### 2. Type Safety First
- Strict TypeScript configuration
- Runtime validation with Zod
- Shared types between frontend and backend

### 3. Security by Design
- Encryption at rest
- Authentication required for all operations
- Input validation at boundaries

### 4. Scalability Considerations
- Stateless API design
- Database indexing strategy
- Horizontal scaling ready

### 5. Developer Experience
- Consistent code structure
- Comprehensive documentation
- Automated testing

## Technology Choices Summary

| Category | Choice | Rationale |
|----------|--------|-----------|
| Language | TypeScript | Type safety, ecosystem |
| Backend Framework | Express | Simplicity, flexibility |
| Database | PostgreSQL | ACID compliance, reliability |
| ORM | TypeORM | TypeScript integration |
| Blockchain | Ethers.js v6 | Maturity, features |
| Authentication | Dynamic SDK | Web3 native |
| Frontend Framework | React | Ecosystem, Dynamic support |
| Build Tool | Vite | Performance, DX |
| CSS | Tailwind | Rapid development |
| Testing | Jest | Comprehensive, established |

## Future Considerations

### Scalability
- Implement caching layer (Redis)
- Message queue for transaction processing
- Database read replicas

### Security Enhancements
- Hardware Security Module (HSM)
- Multi-signature wallets
- Advanced threat detection

### Features
- Multi-chain support
- Non-custodial option
- Social recovery mechanisms
- Batch transactions

### Operations
- Comprehensive monitoring
- Automated backups
- Disaster recovery plan
- Compliance automation