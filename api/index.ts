import type { IncomingMessage, ServerResponse } from 'http';
import { handleRequest } from '../src/app';

export const config = {
  api: {
    bodyParser: false,
  },
  maxDuration: 60,
};

export default async function handler(req: IncomingMessage, res: ServerResponse): Promise<void> {
  return handleRequest(req, res);
}
