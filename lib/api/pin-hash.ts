import 'server-only';
import bcrypt from 'bcryptjs';
const SALT_ROUNDS = 10;
export async function hashPin(pin: string): Promise<string> {
  return bcrypt.hash(pin, SALT_ROUNDS);
}
export function isBcryptHash(value: string): boolean {
  return /^\$2[aby]\$\d{2}\$/.test(value);
}
export async function verifyPin(submittedPin: string, storedPin: string): Promise<boolean> {
  if (!storedPin) return false;
  if (isBcryptHash(storedPin)) {
    return bcrypt.compare(submittedPin, storedPin);
  }
  return submittedPin === storedPin;
}
