import { randomBytes, scrypt, timingSafeEqual } from 'crypto';
import { promisify } from 'util';

const scryptAsync = promisify(scrypt);

const SALT_BYTES = 16;
const KEY_LEN = 64;

// * 비밀번호 해시 생성
export const hashPassword = async (password: string): Promise<string> => {
  const salt = randomBytes(SALT_BYTES).toString('hex');
  const derivedKey = (await scryptAsync(password, salt, KEY_LEN)) as Buffer;
  return `${salt}:${derivedKey.toString('hex')}`;
};

// * 비밀번호 검증
export const verifyPassword = async (
  password: string,
  hash: string,
): Promise<boolean> => {
  const [salt, key] = hash.split(':');
  const keyBuffer = Buffer.from(key, 'hex');
  const derivedKey = (await scryptAsync(password, salt, KEY_LEN)) as Buffer;
  return timingSafeEqual(keyBuffer, derivedKey);
};
