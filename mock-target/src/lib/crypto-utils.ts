/**
 * crypto-utils — mock library shim
 *
 * Simulates a vulnerable package at version 1.2.0 that exposes:
 *   - encryptMD5()  → DEPRECATED (CVE-2024-DEMO01): MD5 is cryptographically broken
 *   - encryptSHA256() → Safe replacement
 *
 * The CVE remediation pipeline will rewrite all `encryptMD5` call sites
 * to `encryptSHA256` across the project.
 */

import { createHash } from 'crypto';

/**
 * @deprecated Use encryptSHA256 instead. MD5 is not collision-resistant.
 * Vulnerable since crypto-utils@1.2.0 — see CVE-2024-DEMO01.
 */
export function encryptMD5(data: string): string {
  return createHash('md5').update(data).digest('hex');
}

/**
 * Safe replacement for encryptMD5.
 * Uses SHA-256 which is collision-resistant and suitable for data integrity checks.
 */
export function encryptSHA256(data: string): string {
  return createHash('sha256').update(data).digest('hex');
}
