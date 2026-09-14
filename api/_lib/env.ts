/**
 * Env values sometimes arrive wrapped in quotes depending on how they were pasted
 * into the Vercel dashboard, and with stray whitespace. Strip both.
 */
export function normalizeEnv(value?: string): string {
  if (!value) return '';
  return value.trim().replace(/^['"]|['"]$/g, '');
}

export function requireEnv(name: string, ...fallbacks: string[]): string {
  const names = [name, ...fallbacks];
  for (const key of names) {
    const value = normalizeEnv(process.env[key]);
    if (value) return value;
  }
  throw new Error(`Missing required environment variable: ${names.join(' or ')}`);
}

export function optionalEnv(name: string, ...fallbacks: string[]): string {
  try {
    return requireEnv(name, ...fallbacks);
  } catch {
    return '';
  }
}

/** Public origin used to build return_url / notify_url for Cashfree. */
export function publicBaseUrl(): string {
  const explicit = optionalEnv('PUBLIC_BASE_URL');
  if (explicit) return explicit.replace(/\/+$/, '');
  const vercelUrl = optionalEnv('VERCEL_PROJECT_PRODUCTION_URL', 'VERCEL_URL');
  if (vercelUrl) return `https://${vercelUrl.replace(/^https?:\/\//, '').replace(/\/+$/, '')}`;
  return 'https://kbsearthmovers.vercel.app';
}

/** Narrow an unknown catch value to a readable message. */
export function toErrorMessage(error: unknown): string {
  if (error instanceof Error) return error.message;
  if (typeof error === 'string') return error;
  return 'Unknown error';
}
