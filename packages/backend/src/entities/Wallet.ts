import {
  Entity,
  PrimaryGeneratedColumn,
  Column,
  CreateDateColumn,
  UpdateDateColumn,
  ManyToOne,
  OneToMany,
  Index,
  JoinColumn,
} from 'typeorm';
import { User } from './User';
import { Transaction } from './Transaction';
import { SignedMessage } from './SignedMessage';

@Entity('wallets')
export class Wallet {
  @PrimaryGeneratedColumn('uuid')
  id!: string;

  @Column({ unique: true })
  @Index()
  address!: string;

  @Column({ type: 'text' })
  encryptedPrivateKey!: string;

  @Column()
  name!: string;

  @Column()
  userId!: string;

  @ManyToOne(() => User, (user) => user.wallets)
  @JoinColumn({ name: 'userId' })
  user!: User;

  @OneToMany(() => Transaction, (transaction) => transaction.wallet)
  transactions!: Transaction[];

  @OneToMany(() => SignedMessage, (signedMessage) => signedMessage.wallet)
  signedMessages!: SignedMessage[];

  @CreateDateColumn()
  createdAt!: Date;

  @UpdateDateColumn()
  updatedAt!: Date;
}