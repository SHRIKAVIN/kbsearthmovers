import React from 'react';

/**
 * The amount readout used everywhere money appears.
 *
 * The rupee mark is set small and raised so the figure itself carries the weight,
 * and the digits are tabular so a column of amounts lines up on the decimal. This is
 * the one element repeated across the driver app, the payment terminal and the admin
 * table; it is what makes them read as one instrument.
 */

type Props = {
  value: number;
  size?: 'sm' | 'md' | 'lg' | 'xl' | 'hero';
  tone?: 'ink' | 'muted' | 'accent' | 'positive' | 'onDark';
  className?: string;
};

const SIZES: Record<NonNullable<Props['size']>, { figure: string; mark: string }> = {
  sm: { figure: 'text-[13px]', mark: 'text-[9px]' },
  md: { figure: 'text-[17px]', mark: 'text-[11px]' },
  lg: { figure: 'text-[26px]', mark: 'text-[15px]' },
  xl: { figure: 'text-[38px]', mark: 'text-[20px]' },
  hero: { figure: 'text-[56px] leading-none', mark: 'text-[26px]' },
};

const TONES: Record<NonNullable<Props['tone']>, string> = {
  ink: 'text-rig-ink',
  muted: 'text-rig-muted',
  accent: 'text-rig-accent',
  positive: 'text-emerald-600',
  onDark: 'text-white',
};

const Amount: React.FC<Props> = ({ value, size = 'md', tone = 'ink', className = '' }) => {
  const { figure, mark } = SIZES[size];
  return (
    <span className={`rig-amount inline-flex items-baseline font-bold ${TONES[tone]} ${className}`}>
      <span className={`${mark} mr-[0.15em] font-semibold opacity-60`}>₹</span>
      <span className={figure}>{Math.round(Number(value) || 0).toLocaleString('en-IN')}</span>
    </span>
  );
};

export default Amount;
