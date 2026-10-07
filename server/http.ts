import type { NextFunction, Request, Response } from 'express';

/** Positive integer route id, or a 400 response and undefined. */
export function parseId(req: Request, res: Response): number | undefined {
  const id = Number(req.params.id);
  if (Number.isInteger(id) && id > 0) return id;
  res.status(400).json({ error: 'Invalid id' });
  return undefined;
}

/**
 * Body-parser errors carry a 4xx status (400 malformed JSON, 413 too large); keep it
 * so the client can tell "you sent something wrong" from "the server is broken".
 */
export function errorHandler(err: Error & { status?: number; type?: string }, _req: Request, res: Response, _next: NextFunction) {
  const status = typeof err.status === 'number' && err.status >= 400 && err.status < 500 ? err.status : 500;
  if (status === 500) console.error(err);
  const message =
    err.type === 'entity.parse.failed'
      ? 'Malformed JSON'
      : err.type === 'entity.too.large'
        ? 'Request is too large'
        : status === 500
          ? 'Internal server error'
          : err.message;
  res.status(status).json({ error: message });
}
