# VenCura Project Requirements

## Overview
Build "VenCura" - The Venmo of wallets. An API platform (with a basic UI) to generate custodial wallets on the backend with support for basic actions.

## Core Requirements

### Authentication & User Management
- An authenticated user can create at least one account/wallet
- Use Dynamic SDK for the authentication layer (https://www.dynamic.xyz/docs/introduction/welcome)
- MUST fully utilize the Dynamic React SDK and Dynamic SDK

### Wallet Operations (Backend API)
All interactions with the custodial wallet must be done on the backend via an API:
- **getBalance()** → balance: number (get the current balance on the wallet)
- **signMessage(msg: string)** → signedMessage: string (The signed message with the private key)
- **sendTransaction(to: string, amount: number)** → transactionHash: string (sends a transaction on the blockchain)

### UI Requirements
- Basic UI to interact with the API
- Main focus is API/Backend experience
- UI should showcase the functionality built on the backend

## Technical Stack Requirements
- **MUST use TypeScript, Node.js, React**
- **Focus on strict type safety**
- **Backend engineering best practices implementation**
- **Use TypeScript with ethers.js v6** (https://docs.ethers.org/v6/)
- **Ethers Wallet class**: https://docs.ethers.org/v6/api/wallet/#about-wallets
- **Testing**: Code MUST be thoroughly tested using Jest

## Blockchain Configuration
- **Network**: Sepolia testnet (Ethereum)
- **RPC URL**: https://sepolia.infura.io/v3/63264d1583fd460d8aace681426f267c
- **API Key**: 63264d1583fd460d8aace681426f267c
- **Test Wallet Address**: 0xda1D3f95B7C67D9103D30C4437610437A137d891 (will be funded with Sepolia ETH)

## Focus Areas
1. **Code + API + Schema design and implementation**
2. **Security considerations** (could be in a writeup)
3. **Testing**

## Optional Features (Cool Ideas)
- Users can have many accounts
- Accounts from the same user can interact with each other (think saving/checking account)
- Invite users to share access to the same wallet
- Show transaction history (on/off-chain)
- Incorporate messaging platform (XMTP)
- Make it secured
- Make it non-custodial

## Deployment
- **Platform**: Fly.io (https://fly.io)
- **Note**: Fly CLI is installed and available for deployment
- **GitHub Repository**: git@github.com:k-g-j/dynamic-vencura.git

## Documentation Requirements
Create documentation that includes:
- Architecture decisions
- Schemas
- Weaknesses
- Any concerns with the implementation

## Additional Notes
- Never put Claude attribution in:
  - Commit messages for GitHub
  - Pull requests for GitHub
  - Issues for GitHub
  - READMEs for GitHub
  - Code for GitHub
- Write code comments without using personal pronouns (avoid "we", "we'd", "we'll", "you", "I", "your", "our", "my", etc.)
- Do what has been asked; nothing more, nothing less
- Never create files unless they're absolutely necessary for achieving the goal
- Always prefer editing an existing file to creating a new one
- Never proactively create documentation files (*.md) or README files unless explicitly requested

## Submission Requirements
- Link to GitHub repository
- Deployed environment (Fly.io)
- Notes about architecture decisions, weaknesses, and concerns

## Resources Provided
- **Dynamic Authentication**: https://www.dynamic.xyz/docs/introduction/welcome
- **Ethers.js Documentation**: https://docs.ethers.org/v6/
- **Sepolia Faucet**: https://sepoliafaucet.com/
- **Infura RPC**: https://app.infura.io/

## Interview Process (Post-Submission)
1. **Technical**:
   - Review implementation with the team
   - One more technical interview discussing a past project in detail
2. **Non-Technical**:
   - Interviews with Itai (CEO) and product
   - Optional: Talk to other team members