import { normalizeEnv, toErrorMessage } from './env.js';

const LOGO_URL =
  'https://kbsearthmovers.vercel.app/Logo%20for%20KBS%20Earthmovers%20-%20Bold%20Industrial%20Design.png';

export type TeamsFact = { name: string; value: string };

export type TeamsCard = {
  title: string;
  summary: string;
  subtitle: string;
  success: boolean;
  facts: TeamsFact[];
  /** Optional "open this" button on the card. */
  action?: { name: string; url: string };
};

export type TeamsResult = { sent: boolean; reason?: string };

/**
 * Post a MessageCard to the Teams incoming webhook.
 *
 * Never throws: a notification failure must not roll back a payment we have already
 * settled, so callers get a result object and carry on.
 */
export async function sendTeamsCard(card: TeamsCard): Promise<TeamsResult> {
  const webhookUrl = normalizeEnv(process.env.TEAMS_WEBHOOK_URL);
  if (!webhookUrl) return { sent: false, reason: 'TEAMS_WEBHOOK_URL not set' };

  const payload: Record<string, unknown> = {
    '@type': 'MessageCard',
    '@context': 'https://schema.org/extensions',
    summary: card.summary,
    themeColor: card.success ? '2EB886' : 'E81123',
    title: card.title,
    sections: [
      {
        activityTitle: 'KBS Earthmovers & Harvesters',
        activitySubtitle: card.subtitle,
        activityImage: LOGO_URL,
        facts: card.facts,
        markdown: true,
      },
    ],
  };

  if (card.action) {
    payload.potentialAction = [
      {
        '@type': 'OpenUri',
        name: card.action.name,
        targets: [{ os: 'default', uri: card.action.url }],
      },
    ];
  }

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
  } catch (error: unknown) {
    return { sent: false, reason: toErrorMessage(error) };
  }
}

export function formatRupees(amount: number): string {
  return `Rs.${Number(amount).toLocaleString('en-IN')}`;
}
