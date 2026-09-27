"use strict";
var __createBinding = (this && this.__createBinding) || (Object.create ? (function(o, m, k, k2) {
    if (k2 === undefined) k2 = k;
    var desc = Object.getOwnPropertyDescriptor(m, k);
    if (!desc || ("get" in desc ? !m.__esModule : desc.writable || desc.configurable)) {
      desc = { enumerable: true, get: function() { return m[k]; } };
    }
    Object.defineProperty(o, k2, desc);
}) : (function(o, m, k, k2) {
    if (k2 === undefined) k2 = k;
    o[k2] = m[k];
}));
var __setModuleDefault = (this && this.__setModuleDefault) || (Object.create ? (function(o, v) {
    Object.defineProperty(o, "default", { enumerable: true, value: v });
}) : function(o, v) {
    o["default"] = v;
});
var __importStar = (this && this.__importStar) || (function () {
    var ownKeys = function(o) {
        ownKeys = Object.getOwnPropertyNames || function (o) {
            var ar = [];
            for (var k in o) if (Object.prototype.hasOwnProperty.call(o, k)) ar[ar.length] = k;
            return ar;
        };
        return ownKeys(o);
    };
    return function (mod) {
        if (mod && mod.__esModule) return mod;
        var result = {};
        if (mod != null) for (var k = ownKeys(mod), i = 0; i < k.length; i++) if (k[i] !== "default") __createBinding(result, mod, k[i]);
        __setModuleDefault(result, mod);
        return result;
    };
})();
Object.defineProperty(exports, "__esModule", { value: true });
exports.seedMockTarget = seedMockTarget;
const fs = __importStar(require("fs"));
const path = __importStar(require("path"));
/**
 * Seeds mock-target/ back to its original state before each demo run.
 *
 * This ensures `npm run demo` is fully idempotent — the pipeline can be
 * re-run an unlimited number of times without a manual `git checkout`.
 *
 * Strategy: canonical source files are stored as inline constants here and
 * written to disk before the pipeline executes.
 */
const MOCK_TARGET_ROOT = path.resolve(__dirname, '..', 'mock-target');
const SEED_FILES = {
    'src/lib/crypto-utils.ts': `/**
 * crypto-utils — mock library shim
 *
 * Simulates a vulnerable package at version 1.2.0 that exposes:
 *   - encryptMD5()  → DEPRECATED (CVE-2024-DEMO01): MD5 is cryptographically broken
 *   - encryptSHA256() → Safe replacement
 *
 * The CVE remediation pipeline will rewrite all \`encryptMD5\` call sites
 * to \`encryptSHA256\` across the project.
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
`,
    'src/userService.ts': `import { encryptMD5 } from './lib/crypto-utils';

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
`,
    'src/reportService.ts': `import { encryptMD5 } from './lib/crypto-utils';

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
`,
    'src/api.ts': `import { getUsers } from './userService';
import { buildReport } from './reportService';

/**
 * Mock Express-style router.
 *
 * Routes:
 *   GET  /users   → returns all users with hashed IDs
 *   POST /report  → builds and signs a report
 *
 * NOTE: openapi.yaml currently only documents GET /users.
 * DocuSync will detect and reconcile the missing POST /report endpoint.
 */

// Simulate a minimal router interface
interface MockRequest {
  body?: Record<string, unknown>;
  query?: Record<string, string>;
}

interface MockResponse {
  status: (code: number) => MockResponse;
  json: (data: unknown) => void;
}

type Handler = (req: MockRequest, res: MockResponse) => void;

const routes: Array<{ method: string; path: string; handler: Handler }> = [];

function get(path: string, handler: Handler): void {
  routes.push({ method: 'GET', path, handler });
}

function post(path: string, handler: Handler): void {
  routes.push({ method: 'POST', path, handler });
}

// ─── Route Definitions ───────────────────────────────────────────────────────

get('/users', (_req, res) => {
  const users = getUsers();
  res.status(200).json({ users });
});

post('/report', (req, res) => {
  const payload = String(req.body?.payload ?? 'default-payload');
  const reportId = \`rpt-\${Date.now()}\`;
  const report = buildReport(reportId, payload);
  res.status(200).json({ report });
});

export { routes };
`,
    'openapi.yaml': `openapi: "3.0.3"
info:
  title: SentinelDev Mock API
  version: "1.0.0"
  description: >
    Mock API for the SentinelDev demo testbed.
    NOTE: POST /report is intentionally absent — DocuSync will detect and add it.

servers:
  - url: http://localhost:3000
    description: Local development server

paths:
  /users:
    get:
      summary: List all users
      operationId: getUsers
      tags:
        - Users
      responses:
        "200":
          description: A list of users with hashed IDs
          content:
            application/json:
              schema:
                type: object
                properties:
                  users:
                    type: array
                    items:
                      type: object
                      properties:
                        id:
                          type: string
                          example: u-001
                        name:
                          type: string
                          example: Alice
                        hashedId:
                          type: string
                          example: "5f4dcc3b5aa765d61d8327de..."
`,
};
/**
 * Writes all seed files to mock-target/, resetting any mutations the
 * remediation pipeline may have made on a previous run.
 */
function seedMockTarget() {
    console.log('[Seed] Resetting mock-target/ to clean state...');
    for (const [relPath, content] of Object.entries(SEED_FILES)) {
        const absPath = path.join(MOCK_TARGET_ROOT, relPath);
        const dir = path.dirname(absPath);
        if (!fs.existsSync(dir)) {
            fs.mkdirSync(dir, { recursive: true });
        }
        fs.writeFileSync(absPath, content, 'utf-8');
    }
    console.log(`[Seed] Restored ${Object.keys(SEED_FILES).length} file(s) in mock-target/\n`);
}
//# sourceMappingURL=seed.js.map