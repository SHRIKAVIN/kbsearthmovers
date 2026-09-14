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

/**
 * Append Vercel's automation-bypass secret to a URL when one is configured.
 *
 * Preview deployments sit behind Vercel Authentication, which answers 401 to anything
 * without a Vercel session - including Cashfree's webhook servers. Without this a test
 * payment succeeds at Cashfree but never settles here, and the QR screen spins forever.
 *
 * Setting VERCEL_AUTOMATION_BYPASS_SECRET lets the webhook through while the preview
 * stays private to humans. Production ignores this (the secret is simply not set there).
 */
export function withProtectionBypass(url: string): string {
  const secret = optionalEnv('VERCEL_AUTOMATION_BYPASS_SECRET');
  if (!secret) return url;
  const separator = url.includes('?') ? '&' : '?';
  return `${url}${separator}x-vercel-protection-bypass=${encodeURIComponent(secret)}`;
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
