import { Repository } from 'typeorm';
import { AppDataSource } from '../config/database';
import { User } from '../entities/User';
import { generateToken } from '../middleware/auth';

interface DynamicUser {
  userId: string;
  email: string;
  verifiedCredentials?: Array<{
    address: string;
    chain: string;
  }>;
}

export class AuthService {
  private userRepository: Repository<User>;

  constructor() {
    this.userRepository = AppDataSource.getRepository(User);
  }

  async authenticateWithDynamic(dynamicUser: DynamicUser): Promise<{ user: User; token: string }> {
    let user = await this.userRepository.findOne({
      where: { dynamicUserId: dynamicUser.userId },
    });

    if (!user) {
      user = this.userRepository.create({
        email: dynamicUser.email,
        dynamicUserId: dynamicUser.userId,
      });
      user = await this.userRepository.save(user);
    }

    const token = generateToken(user);

    return { user, token };
  }

  async verifyDynamicToken(token: string): Promise<DynamicUser | null> {
    try {
      const response = await fetch('https://app.dynamic.xyz/api/v0/users/verify', {
        method: 'POST',
        headers: {
          'Authorization': `Bearer ${token}`,
          'Content-Type': 'application/json',
        },
      });

      if (!response.ok) {
        return null;
      }

      const data = await response.json() as DynamicUser;
      return data;
    } catch (error) {
      console.error('Error verifying Dynamic token:', error);
      return null;
    }
  }

  async getUserById(userId: string): Promise<User | null> {
    return this.userRepository.findOne({
      where: { id: userId },
    });
  }
}