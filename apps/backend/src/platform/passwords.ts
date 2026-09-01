import bcrypt from 'bcrypt';
import { getBcryptRounds } from './secrets';

export async function hashPassword(plain: string): Promise<string> {
  return bcrypt.hash(plain, getBcryptRounds());
}

export async function verifyPassword(plain: string, hash: string): Promise<boolean> {
  return bcrypt.compare(plain, hash);
}
