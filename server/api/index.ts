// Vercel serverless entry — wraps the NestJS app with @vendia/serverless-express
// so a single function serves every API route. The bootstrapped Nest app is
// cached in module scope so warm invocations skip the ~1-2s init cost.
//
// IMPORTANT: This handler is only used in production (Vercel). Local dev still
// uses `nest start --watch` against the long-running Express server in main.ts.

import express from 'express';
import serverlessExpress from '@vendia/serverless-express';
import type { VercelRequest, VercelResponse } from '@vercel/node';
import { createApp } from '../src/main';

let cachedHandler: ReturnType<typeof serverlessExpress> | null = null;

async function bootstrapServerless(): Promise<ReturnType<typeof serverlessExpress>> {
  const expressApp = express();
  const app = await createApp(expressApp);
  await app.init();
  return serverlessExpress({ app: expressApp });
}

export default async function handler(req: VercelRequest, res: VercelResponse): Promise<void> {
  if (!cachedHandler) {
    cachedHandler = await bootstrapServerless();
  }
  return cachedHandler(req, res);
}
