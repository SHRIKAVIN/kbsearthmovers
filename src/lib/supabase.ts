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
  driver_name: string;
  machine_type: 'JCB' | 'Tractor' | 'Harvester';
  hours_driven: number;
  total_amount: number;
  amount_received: number;
  advance_amount: number;
  date: string;
  time: string;
  entry_type: 'driver' | 'admin';
  created_at?: string;
  updated_at?: string;
};

export type AdminUser = {
  id?: string;
  username: string;
  password: string;
  created_at?: string;
};