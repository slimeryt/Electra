/** Error with HTTP status and optional machine-readable code for JSON responses. */
export type AppError = Error & { status: number; code?: string };

export function httpError(message: string, status: number, code?: string): AppError {
  const e = new Error(message) as AppError;
  e.status = status;
  if (code) e.code = code;
  return e;
}
