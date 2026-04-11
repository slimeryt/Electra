import { Request, Response, NextFunction } from 'express';

export function errorHandler(err: Error & { status?: number; code?: string }, _req: Request, res: Response, _next: NextFunction) {
  console.error(err.stack);
  const status = err.status || 500;
  const body: { error: string; code?: string } = {
    error: err.message || 'Internal server error',
  };
  if (typeof err.code === 'string' && err.code.length > 0) {
    body.code = err.code;
  }
  res.status(status).json(body);
}
