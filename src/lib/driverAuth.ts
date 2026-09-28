/**
 * Driver sign-in.
 *
 * Matches the existing admin pattern by request: credentials are checked in the
 * browser and the session is a localStorage key.
 *
 * Be clear-eyed about what that is. VITE_* values are inlined into the JavaScript
 * bundle at build time, so anyone who opens the deployed site can read these
 * passwords. This keeps the wrong person from wandering into the driver screen; it
 * is not a security boundary, and the data behind it is only as protected as the
 * database itself.
 */

const SESSION_KEY = 'kbs_driver';

export type Driver = {
  /** Stored on every entry this driver records. */
  code: string;
  name: string;
};

/**
 * VITE_DRIVER_CREDENTIALS = "sakthi:Sakthi:pass123,manoj:Manoj:pass456"
 *                            code  :name  :password
 */
function credentials(): Array<Driver & { password: string }> {
  const raw = import.meta.env.VITE_DRIVER_CREDENTIALS || '';
  return String(raw)
    .split(',')
    .map((entry) => entry.trim())
    .filter(Boolean)
    .map((entry) => {
      const [code, name, password] = entry.split(':').map((part) => part?.trim());
      return { code, name: name || code, password };
    })
    .filter((driver) => driver.code && driver.password);
}

export function listDrivers(): Driver[] {
  return credentials().map(({ code, name }) => ({ code, name }));
}

export function signIn(code: string, password: string): Driver | null {
  const match = credentials().find(
    (driver) => driver.code.toLowerCase() === code.trim().toLowerCase()
  );
  if (!match || !password || match.password !== password) return null;
  return { code: match.code, name: match.name };
}

export function loadSession(): Driver | null {
  try {
    const raw = localStorage.getItem(SESSION_KEY);
    if (!raw) return null;
    const parsed = JSON.parse(raw);
    return parsed?.code ? { code: parsed.code, name: parsed.name || parsed.code } : null;
  } catch {
    return null;
  }
}

export function saveSession(driver: Driver) {
  try {
    localStorage.setItem(SESSION_KEY, JSON.stringify(driver));
  } catch {
    // A private-mode browser refusing storage should not block the shift.
  }
}

export function clearSession() {
  try {
    localStorage.removeItem(SESSION_KEY);
  } catch {
    /* nothing to do */
  }
}

/** True when no credentials are configured at all, so the login can say so. */
export function isConfigured(): boolean {
  return credentials().length > 0;
}
