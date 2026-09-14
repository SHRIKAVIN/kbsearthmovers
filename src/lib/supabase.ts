import { createClient } from '@supabase/supabase-js';

const supabaseUrl = import.meta.env.VITE_SUPABASE_URL;
const supabaseAnonKey = import.meta.env.VITE_SUPABASE_ANON_KEY;

if (!supabaseUrl || !supabaseAnonKey) {
  console.error('Missing Supabase environment variables');
  console.log('VITE_SUPABASE_URL:', supabaseUrl);
  console.log('VITE_SUPABASE_ANON_KEY:', supabaseAnonKey ? 'Present' : 'Missing');
  throw new Error('Missing Supabase environment variables. Please check your .env file.');
}

export const supabase = createClient(supabaseUrl, supabaseAnonKey, {
  auth: {
    persistSession: false
  }
});

// Test connection function
export const testConnection = async () => {
  try {
    const { data, error } = await supabase.from('work_entries').select('count', { count: 'exact', head: true });
    if (error) {
      console.error('Supabase connection test failed:', error);
      return false;
    }
    console.log('Supabase connection successful. Total entries:', data);
    return true;
  } catch (error) {
    console.error('Supabase connection error:', error);
    return false;
  }
};

export type WorkEntry = {
  id?: string;
  rental_person_name: string;
  /** E.164 (+919486532856). The key both payment flows look the customer up by. */
  customer_phone?: string | null;
  driver_name: string;
  broker?: string;
  machine_type: 'JCB' | 'Tractor' | 'Harvester';
  /** H.MM base-60: 4.30 means 4h 30m, not 4.5 hours. */
  hours_driven: number;
  /** The rate this job was charged at, from the KBS rate chart. Null on older rows. */
  hourly_rate?: number | null;
  total_amount: number;
  amount_received: number;
  advance_amount: number;
  date: string;
  time: string;
  entry_type: 'driver' | 'admin';
  owner: 'Rohini' | 'Laxmi';
  created_at?: string;
  updated_at?: string;
};

export type BrokerEntry = {
  id?: string;
  broker_name: string;
  total_hours: string;
  total_amount: number;
  amount_received: number;
  date: string;
  time: string;
  owner: 'Rohini' | 'Laxmi';
  created_at?: string;
  updated_at?: string;
};

export type AdminUser = {
  id?: string;
  username: string;
  password: string;
  created_at?: string;
};