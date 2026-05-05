import { createClient } from '@supabase/supabase-js';

function normalizeEnv(value?: string) {
  if (!value) return '';
  const trimmed = value.trim();
  return trimmed.replace(/^['"]|['"]$/g, '');
}

export default async function handler(req: any, res: any) {
  if (req.method !== 'GET') {
    return res.status(405).json({ error: 'Method not allowed' });
  }

  const supabaseUrl = normalizeEnv(process.env.SUPABASE_URL || process.env.VITE_SUPABASE_URL);
  const supabaseKey = normalizeEnv(
    process.env.SUPABASE_SERVICE_ROLE_KEY ||
      process.env.SUPABASE_ANON_KEY ||
      process.env.VITE_SUPABASE_ANON_KEY
  );
  const tableName = process.env.KEEP_ALIVE_TABLE || 'work_entries';
  const keyType = process.env.SUPABASE_SERVICE_ROLE_KEY ? 'service_role' : 'anon';

  if (!supabaseUrl || !supabaseKey) {
    return res.status(500).json({
      error: 'Missing Supabase configuration',
      message:
        'Set SUPABASE_URL and SUPABASE_SERVICE_ROLE_KEY (recommended) or anon key in deployment env',
    });
  }

  try {
    const supabase = createClient(supabaseUrl, supabaseKey);
    const { error } = await supabase.from(tableName).select('id').limit(1);

    if (error) {
      const errorMessage =
        error.message ||
        error.details ||
        error.hint ||
        (error.code ? `code=${error.code}` : '') ||
        'Unknown Supabase error';
      return res.status(500).json({
        error: 'Database connection failed',
        message: errorMessage,
        table: tableName,
        keyType,
      });
    }

    const timestamp = new Date().toISOString();
    return res.status(200).json({
      success: true,
      message: 'Database keep-alive successful',
      timestamp,
      table: tableName,
      keyType,
    });
  } catch (error: any) {
    return res.status(500).json({
      error: 'Internal server error',
      message: error?.message || 'Unknown error occurred',
    });
  }
}
