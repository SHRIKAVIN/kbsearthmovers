import { createClient } from '@supabase/supabase-js';

export default async function handler(req: any, res: any) {
  // Only allow GET requests
  if (req.method !== 'GET') {
    return res.status(405).json({ error: 'Method not allowed' });
  }

  // Get Supabase credentials from environment variables
  // Vercel automatically exposes VITE_ prefixed env vars, but we'll check both
  const supabaseUrl = process.env.VITE_SUPABASE_URL || process.env.SUPABASE_URL;
  const supabaseAnonKey = process.env.VITE_SUPABASE_ANON_KEY || process.env.SUPABASE_ANON_KEY;

  if (!supabaseUrl || !supabaseAnonKey) {
    console.error('Missing Supabase environment variables');
    return res.status(500).json({ 
      error: 'Missing Supabase configuration',
      message: 'Supabase URL or Anon Key not found in environment variables'
    });
  }

  try {
    // Create Supabase client
    const supabase = createClient(supabaseUrl, supabaseAnonKey);

    // Make a simple query to keep the database active
    // This is a lightweight query that just checks if we can connect
    const { data, error } = await supabase
      .from('work_entries')
      .select('id')
      .limit(1);

    if (error) {
      console.error('Supabase keep-alive failed:', error);
      return res.status(500).json({ 
        error: 'Database connection failed',
        message: error.message 
      });
    }

    // Success - database is active
    const timestamp = new Date().toISOString();
    console.log(`✅ Keep-alive successful at ${timestamp}`);
    
    return res.status(200).json({ 
      success: true,
      message: 'Database keep-alive successful',
      timestamp,
      data: data ? 'Connection verified' : 'No data returned'
    });
  } catch (error: any) {
    console.error('Keep-alive error:', error);
    return res.status(500).json({ 
      error: 'Internal server error',
      message: error?.message || 'Unknown error occurred'
    });
  }
}
