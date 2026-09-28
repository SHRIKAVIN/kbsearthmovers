/** @type {import('tailwindcss').Config} */
export default {
  content: ['./index.html', './src/**/*.{js,ts,jsx,tsx}'],
  darkMode: 'class',
  theme: {
    extend: {
      fontFamily: {
        sans: ['"IBM Plex Sans"', 'system-ui', '-apple-system', 'Segoe UI', 'Roboto', 'sans-serif'],
        // Every numeral in the app: amounts, hours, references, table figures.
        mono: ['"IBM Plex Mono"', 'ui-monospace', 'SFMono-Regular', 'Menlo', 'monospace'],
      },
      colors: {
        // Instrument-panel palette. Extends the existing brand orange rather than
        // replacing it - the logo, stamp and printed invoice already live in it.
        rig: {
          ink: '#12151A',     // machine ground
          surface: '#1C2128', // raised panel
          line: '#2A313B',    // hairlines, wells
          accent: '#F26522',  // brand orange: action and money
          signal: '#FFB020',  // live / in-progress readouts
          bone: '#F7F5F2',    // the light ground for data entry
          muted: '#6B7480',   // labels
        },
        dark: {
          50: '#f8fafc',
          100: '#f1f5f9',
          200: '#e2e8f0',
          300: '#cbd5e1',
          400: '#94a3b8',
          500: '#64748b',
          600: '#475569',
          700: '#334155',
          800: '#1e293b',
          900: '#0f172a',
        }
      }
    },
  },
  plugins: [],
};