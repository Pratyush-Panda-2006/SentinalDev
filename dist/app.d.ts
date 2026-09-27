/**
 * SentinelDev Dashboard Server
 *
 * Serves the static dashboard UI and exposes API endpoints for running the
 * pipeline in-memory, returning JSON reports to the browser.
 *
 * Uses only Node built-ins (http, fs, path) — no Express dependency needed.
 *
 * Start:
 *   npm run ui    → tsx src/app.ts           (production-like, single run)
 *   npm run dev   → tsx watch src/app.ts     (hot-reload on file changes)
 */
import * as http from 'http';
export declare function handleRequest(req: http.IncomingMessage, res: http.ServerResponse): Promise<void>;
declare const server: http.Server<typeof http.IncomingMessage, typeof http.ServerResponse>;
export default server;
//# sourceMappingURL=app.d.ts.map