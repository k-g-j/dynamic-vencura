import { ethers, Wallet as EthersWallet } from 'ethers';
import { Repository } from 'typeorm';
import { AppDataSource } from '../config/database';
import { Wallet } from '../entities/Wallet';
import { Transaction } from '../entities/Transaction';
import { SignedMessage } from '../entities/SignedMessage';
import { encrypt, decrypt } from '../utils/crypto';
import { env } from '../config/env';
import type {
  CreateWalletRequest,
  SignMessageRequest,
  SendTransactionRequest,
  GetBalanceRequest,
  WalletResponse,
  BalanceResponse,
  SignedMessageResponse,
  TransactionResponse,
} from '@vencura/shared';

export class WalletService {
  private walletRepository: Repository<Wallet>;
  private transactionRepository: Repository<Transaction>;
  private signedMessageRepository: Repository<SignedMessage>;
  private provider: ethers.JsonRpcProvider;

  constructor() {
    this.walletRepository = AppDataSource.getRepository(Wallet);
    this.transactionRepository = AppDataSource.getRepository(Transaction);
    this.signedMessageRepository = AppDataSource.getRepository(SignedMessage);
    this.provider = new ethers.JsonRpcProvider(env.SEPOLIA_RPC_URL);
  }

  async createWallet(data: CreateWalletRequest): Promise<WalletResponse> {
    const ethersWallet = EthersWallet.createRandom();
    const encryptedPrivateKey = encrypt(ethersWallet.privateKey);

    const wallet = this.walletRepository.create({
      name: data.name,
      address: ethersWallet.address,
      encryptedPrivateKey,
      userId: data.userId,
    });

    const savedWallet = await this.walletRepository.save(wallet);

    return {
      id: savedWallet.id,
      address: savedWallet.address as `0x${string}`,
      name: savedWallet.name,
      userId: savedWallet.userId,
      createdAt: savedWallet.createdAt.toISOString(),
      updatedAt: savedWallet.updatedAt.toISOString(),
    };
  }

  async getWallet(walletId: string, userId: string): Promise<Wallet> {
    const wallet = await this.walletRepository.findOne({
      where: { id: walletId, userId },
    });

    if (!wallet) {
      throw new Error('Wallet not found or access denied');
    }

    return wallet;
  }

  async getUserWallets(userId: string): Promise<WalletResponse[]> {
    const wallets = await this.walletRepository.find({
      where: { userId },
      order: { createdAt: 'DESC' },
    });

    return wallets.map((wallet) => ({
      id: wallet.id,
      address: wallet.address as `0x${string}`,
      name: wallet.name,
      userId: wallet.userId,
      createdAt: wallet.createdAt.toISOString(),
      updatedAt: wallet.updatedAt.toISOString(),
    }));
  }

  async getBalance(data: GetBalanceRequest, userId: string): Promise<BalanceResponse> {
    const wallet = await this.getWallet(data.walletId, userId);
    const balance = await this.provider.getBalance(wallet.address);

    return {
      walletId: wallet.id,
      balance: balance.toString(),
      formattedBalance: ethers.formatEther(balance),
    };
  }

  async signMessage(data: SignMessageRequest, userId: string): Promise<SignedMessageResponse> {
    const wallet = await this.getWallet(data.walletId, userId);
    const privateKey = decrypt(wallet.encryptedPrivateKey);
    const ethersWallet = new EthersWallet(privateKey);
    
    const signature = await ethersWallet.signMessage(data.message);

    const signedMessage = this.signedMessageRepository.create({
      walletId: wallet.id,
      message: data.message,
      signature,
    });

    await this.signedMessageRepository.save(signedMessage);

    return {
      walletId: wallet.id,
      message: data.message,
      signature,
    };
  }

  async sendTransaction(data: SendTransactionRequest, userId: string): Promise<TransactionResponse> {
    const wallet = await this.getWallet(data.walletId, userId);
    const privateKey = decrypt(wallet.encryptedPrivateKey);
    const ethersWallet = new EthersWallet(privateKey, this.provider);

    const balance = await this.provider.getBalance(wallet.address);
    const amountWei = ethers.parseEther(data.amount.toString());

    if (balance < amountWei) {
      throw new Error('Insufficient balance');
    }

    const transactionRequest: ethers.TransactionRequest = {
      to: data.to,
      value: amountWei,
      gasLimit: data.gasLimit ?? null,
    };

    if (data.gasPrice) {
      transactionRequest.gasPrice = ethers.parseUnits(data.gasPrice, 'gwei');
    }

    const tx = await ethersWallet.sendTransaction(transactionRequest);

    const transactionData: any = {
      walletId: wallet.id,
      transactionHash: tx.hash,
      from: wallet.address,
      to: data.to,
      amount: amountWei.toString(),
      status: 'pending',
    };
    
    if (data.gasPrice) {
      transactionData.gasPrice = data.gasPrice;
    }
    
    const transaction = this.transactionRepository.create(transactionData);

    const savedTransaction = await this.transactionRepository.save(transaction) as unknown as Transaction;

    tx.wait().then(async (receipt) => {
      if (receipt) {
        savedTransaction.status = receipt.status === 1 ? 'confirmed' : 'failed';
        savedTransaction.blockNumber = receipt.blockNumber;
        savedTransaction.gasUsed = receipt.gasUsed.toString();
        await this.transactionRepository.save(savedTransaction);
      }
    }).catch(async (error) => {
      console.error('Transaction failed:', error);
      savedTransaction.status = 'failed';
      await this.transactionRepository.save(savedTransaction);
    });

    return {
      walletId: wallet.id,
      transactionHash: tx.hash,
      from: wallet.address as `0x${string}`,
      to: data.to,
      amount: amountWei.toString(),
      status: 'pending',
    };
  }

  async getTransactionHistory(walletId: string, userId: string): Promise<TransactionResponse[]> {
    const wallet = await this.getWallet(walletId, userId);
    
    const transactions = await this.transactionRepository.find({
      where: { walletId: wallet.id },
      order: { createdAt: 'DESC' },
    });

    return transactions.map((tx) => ({
      walletId: tx.walletId,
      transactionHash: tx.transactionHash,
      from: tx.from as `0x${string}`,
      to: tx.to as `0x${string}`,
      amount: tx.amount,
      status: tx.status,
      gasUsed: tx.gasUsed,
      blockNumber: tx.blockNumber,
    }));
  }
}