import { createClient, type SupabaseClient } from '@supabase/supabase-js';
import { requireEnv } from './env.js';

let cached: SupabaseClient | null = null;

/**
 * Service-role Supabase client. Bypasses RLS, so it is the only thing that can read
 * or write the payments tables - never expose this key or its results wholesale to
 * the browser.
 */
export function serviceClient(): SupabaseClient {
  if (cached) return cached;

  const url = requireEnv('SUPABASE_URL', 'VITE_SUPABASE_URL');
  const key = requireEnv('SUPABASE_SERVICE_ROLE_KEY');

  cached = createClient(url, key, {
    auth: { persistSession: false, autoRefreshToken: false },
  });
  return cached;
}

export type OutstandingEntry = {
  id: string;
  entry_date: string;
  machine_type: string;
  balance: number;
};

/** What this phone number still owes, oldest job first. */
export async function outstandingForPhone(phone: string): Promise<OutstandingEntry[]> {
  const { data, error } = await serviceClient().rpc('outstanding_for_phone', {
    p_phone: phone,
  });
  if (error) throw new Error(`outstanding_for_phone failed: ${error.message}`);
  return (data || []).map((row: Record<string, unknown>) => ({
    id: String(row.id),
    entry_date: String(row.entry_date),
    machine_type: String(row.machine_type),
    balance: Number(row.balance),
  }));
}

export function sumBalances(entries: OutstandingEntry[]): number {
  return entries.reduce((total, entry) => total + entry.balance, 0);
}
