import { createClient } from '@supabase/supabase-js';

function normalizeEnv(value?: string) {
  if (!value) return '';
  const trimmed = value.trim();
  return trimmed.replace(/^['"]|['"]$/g, '');
}

function isVercelCron(req: { headers?: Record<string, string | string[] | undefined> }) {
  const header = req.headers?.['x-vercel-cron'];
  const value = Array.isArray(header) ? header[0] : header;
  return value === '1';
}

async function notifyTeams(params: {
  success: boolean;
  timestamp: string;
  table?: string;
  keyType?: string;
  errorMessage?: string;
}) {
  const webhookUrl = normalizeEnv(process.env.TEAMS_WEBHOOK_URL);
  if (!webhookUrl) return { sent: false, reason: 'TEAMS_WEBHOOK_URL not set' };

  const logoUrl =
    'https://kbsearthmovers.vercel.app/Logo%20for%20KBS%20Earthmovers%20-%20Bold%20Industrial%20Design.png';
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

  const payload = {
    '@type': 'MessageCard',
    '@context': 'https://schema.org/extensions',
    summary: params.success ? 'Supabase keep-alive success' : 'Supabase keep-alive failure',
    themeColor: params.success ? '2EB886' : 'E81123',
    title: 'Supabase Keep-Alive Notification',
    sections: [
      {
        activityTitle: 'KBS Earthmovers & Harvesters',
        activitySubtitle: 'Vercel Cron keep-alive result',
        activityImage: logoUrl,
        facts,
        markdown: true,
      },
    ],
  };

  try {
    const response = await fetch(webhookUrl, {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify(payload),
    });
    if (!response.ok) {
      return { sent: false, reason: `Teams webhook returned ${response.status}` };
    }
    return { sent: true };
  } catch (error: any) {
    return { sent: false, reason: error?.message || 'Teams webhook request failed' };
  }
}

export default async function handler(req: any, res: any) {
  if (req.method !== 'GET') {
    return res.status(405).json({ error: 'Method not allowed' });
  }

  const shouldNotifyTeams = isVercelCron(req);
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
      ? await notifyTeams({ success: false, timestamp, errorMessage: 'Missing Supabase configuration' })
      : undefined;
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
        ? await notifyTeams({
            success: false,
            timestamp,
            table: tableName,
            keyType,
            errorMessage,
          })
        : undefined;
      return res.status(500).json({
        error: 'Database connection failed',
        message: errorMessage,
        table: tableName,
        keyType,
        teams,
      });
    }

    const teams = shouldNotifyTeams
      ? await notifyTeams({
          success: true,
          timestamp,
          table: tableName,
          keyType,
        })
      : undefined;

    return res.status(200).json({
      success: true,
      message: 'Database keep-alive successful',
      timestamp,
      table: tableName,
      keyType,
      teams,
    });
  } catch (error: any) {
    const errorMessage = error?.message || 'Unknown error occurred';
    const teams = shouldNotifyTeams
      ? await notifyTeams({ success: false, timestamp, errorMessage })
      : undefined;
    return res.status(500).json({
      error: 'Internal server error',
      message: errorMessage,
      teams,
    });
  }
}
