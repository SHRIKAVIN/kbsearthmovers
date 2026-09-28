export type Req = {
  method?: string;
  url?: string;
  headers?: Record<string, string | string[] | undefined>;
  body?: unknown;
  on?: (event: string, cb: (chunk?: never) => void) => void;
};

export type Res = {
  status: (code: number) => Res;
  json: (body: unknown) => void;
  setHeader: (name: string, value: string) => void;
  end: (body?: unknown) => void;
};

export function headerValue(
  headers: Record<string, string | string[] | undefined> | undefined,
  name: string
): string | undefined {
  const value = headers?.[name] ?? headers?.[name.toLowerCase()];
  return Array.isArray(value) ? value[0] : value;
}

/**
 * Vercel Cron sends User-Agent: vercel-cron/1.0 and x-vercel-cron-schedule.
 * Older docs also mentioned x-vercel-cron: 1 - accept both.
 */
export function isVercelCron(req: Req): boolean {
  const userAgent = headerValue(req.headers, 'user-agent') || '';
  if (userAgent.includes('vercel-cron')) return true;
  if (headerValue(req.headers, 'x-vercel-cron') === '1') return true;
  if (headerValue(req.headers, 'x-vercel-cron-schedule')) return true;
  return false;
}

/**
 * Read the request body as the exact bytes that arrived.
 *
 * This exists for webhook signature verification: Cashfree signs the raw payload,
 * and re-serialising parsed JSON changes key order, spacing and decimal formatting
 * (4500.00 becomes 4500), which breaks the HMAC. Any handler using this MUST also
 * export `config = { api: { bodyParser: false } }` or Vercel will have consumed the
 * stream before we get here.
 */
export function readRawBody(req: Req): Promise<string> {
  return new Promise((resolve, reject) => {
    const chunks: Buffer[] = [];
    const stream = req as unknown as NodeJS.EventEmitter;
    stream.on('data', (chunk: Buffer) => chunks.push(Buffer.from(chunk)));
    stream.on('end', () => resolve(Buffer.concat(chunks).toString('utf8')));
    stream.on('error', (err: unknown) => reject(err));
  });
}

/** Parse a JSON body that Vercel may or may not have already parsed for us. */
export async function readJsonBody<T = unknown>(req: Req): Promise<T> {
  if (req.body && typeof req.body === 'object') return req.body as T;
  if (typeof req.body === 'string' && req.body.length) return JSON.parse(req.body);
  const raw = await readRawBody(req);
  return raw ? JSON.parse(raw) : ({} as T);
}

export function methodNotAllowed(res: Res, allowed: string) {
  res.setHeader('Allow', allowed);
  return res.status(405).json({ error: 'Method not allowed' });
}

export function badRequest(res: Res, message: string, extra?: Record<string, unknown>) {
  return res.status(400).json({ error: message, ...extra });
}

export function serverError(res: Res, error: unknown) {
  const message = error instanceof Error ? error.message : 'Unknown error';
  console.error('[api] unhandled error:', error);
  return res.status(500).json({ error: 'Internal server error', message });
}
