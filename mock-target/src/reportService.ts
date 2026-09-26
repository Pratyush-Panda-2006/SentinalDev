import { encryptMD5 } from './lib/crypto-utils';

export interface Report {
  reportId: string;
  payload: string;
  signature: string;
}

/**
 * Generates a cryptographic signature for a report payload.
 * Currently uses encryptMD5 — flagged by CVE-2024-DEMO01.
 */
export function signReport(payload: string): string {
  return encryptMD5(payload);
}

/**
 * Builds and signs a report object.
 */
export function buildReport(reportId: string, payload: string): Report {
  return {
    reportId,
    payload,
    signature: signReport(payload),
  };
}
