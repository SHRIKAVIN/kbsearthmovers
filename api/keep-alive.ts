import { createClient } from '@supabase/supabase-js';
import { normalizeEnv, toErrorMessage } from './_lib/env.js';
import { isVercelCron, type Req, type Res } from './_lib/http.js';
import { sendTeamsCard, type TeamsResult } from './_lib/teams.js';

async function notifyKeepAlive(params: {
  success: boolean;
  timestamp: string;
  table?: string;
  keyType?: string;
  errorMessage?: string;
}): Promise<TeamsResult> {
  const facts = [
    { name: 'Project Name', value: 'KBS Earthmovers & Harvesters' },
    { name: 'Job Status', value: params.success ? 'Success ✅' : 'Failed ❌' },
    { name: 'Timestamp', value: params.timestamp },
    { name: 'Source', value: 'Vercel Cron' },
    { name: 'Endpoint', value: '/api/keep-alive' },
  ];

  if (params.table) facts.push({ name: 'Table', value: params.table });
  if (params.keyType) facts.push({ name: 'Key Type', value: params.keyType });
  if (params.errorMessage) facts.push({ name: 'Error', value: params.errorMessage });

  return sendTeamsCard({
    title: 'Supabase Keep-Alive Notification',
    summary: params.success ? 'Supabase keep-alive success' : 'Supabase keep-alive failure',
    subtitle: 'Vercel Cron keep-alive result',
    success: params.success,
    facts,
  });
}

export default async function handler(req: Req, res: Res) {
  if (req.method !== 'GET') {
    return res.status(405).json({ error: 'Method not allowed' });
  }

  const shouldNotifyTeams = isVercelCron(req);
  const teamsSkipped = shouldNotifyTeams
    ? undefined
    : { sent: false, reason: 'Not a Vercel Cron request; Teams notify skipped' };
  const supabaseUrl = normalizeEnv(process.env.SUPABASE_URL || process.env.VITE_SUPABASE_URL);
  const supabaseKey = normalizeEnv(
    process.env.SUPABASE_SERVICE_ROLE_KEY ||
      process.env.SUPABASE_ANON_KEY ||
      process.env.VITE_SUPABASE_ANON_KEY
  );
  const tableName = process.env.KEEP_ALIVE_TABLE || 'work_entries';
  const keyType = process.env.SUPABASE_SERVICE_ROLE_KEY ? 'service_role' : 'anon';
  const timestamp = new Date().toISOString();

  if (!supabaseUrl || !supabaseKey) {
    const errorMessage =
      'Set SUPABASE_URL and SUPABASE_SERVICE_ROLE_KEY (recommended) or anon key in deployment env';
    const teams = shouldNotifyTeams
      ? await notifyKeepAlive({ success: false, timestamp, errorMessage: 'Missing Supabase configuration' })
      : teamsSkipped;
    return res.status(500).json({
      error: 'Missing Supabase configuration',
      message: errorMessage,
      teams,
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
      const teams = shouldNotifyTeams
        ? await notifyKeepAlive({
            success: false,
            timestamp,
            table: tableName,
            keyType,
            errorMessage,
          })
        : teamsSkipped;
      return res.status(500).json({
        error: 'Database connection failed',
        message: errorMessage,
        table: tableName,
        keyType,
        teams,
      });
    }

    const teams = shouldNotifyTeams
      ? await notifyKeepAlive({ success: true, timestamp, table: tableName, keyType })
      : teamsSkipped;

    return res.status(200).json({
      success: true,
      message: 'Database keep-alive successful',
      timestamp,
      table: tableName,
      keyType,
      teams,
    });
  } catch (error: unknown) {
    const errorMessage = toErrorMessage(error);
    const teams = shouldNotifyTeams
      ? await notifyKeepAlive({ success: false, timestamp, errorMessage })
      : teamsSkipped;
    return res.status(500).json({
      error: 'Internal server error',
      message: errorMessage,
      teams,
    });
  }
}
