import type { IncomingMessage, ServerResponse } from 'http';
import handler, { config } from './index';

export { config };
export default async function catchAll(req: IncomingMessage, res: ServerResponse): Promise<void> {
  return handler(req, res);
}
