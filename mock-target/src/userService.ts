import { encryptMD5 } from './lib/crypto-utils';

export interface User {
  id: string;
  name: string;
  hashedId: string;
}

/**
 * Returns a stable hash for a given userId.
 * Currently uses encryptMD5 — flagged by CVE-2024-DEMO01.
 */
export function hashUserId(userId: string): string {
  return encryptMD5(userId);
}

/**
 * Fetches a mock list of users with hashed IDs.
 */
export function getUsers(): User[] {
  const rawUsers = [
    { id: 'u-001', name: 'Alice' },
    { id: 'u-002', name: 'Bob' },
    { id: 'u-003', name: 'Carol' },
  ];

  return rawUsers.map((u) => ({
    ...u,
    hashedId: hashUserId(u.id),
  }));
}
