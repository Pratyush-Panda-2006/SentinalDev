import { getUsers } from './userService';
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
  const reportId = `rpt-${Date.now()}`;
  const report = buildReport(reportId, payload);
  res.status(200).json({ report });
});

export { routes };
