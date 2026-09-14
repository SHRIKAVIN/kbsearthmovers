import React, { useState, useEffect } from 'react';
import { LogIn, AlertCircle, Loader2 } from 'lucide-react';
import { signIn, listDrivers, isConfigured, type Driver } from '../lib/driverAuth';

const DriverLogin: React.FC<{ onSignIn: (driver: Driver) => void }> = ({ onSignIn }) => {
  const [code, setCode] = useState('');
  const [password, setPassword] = useState('');
  const [error, setError] = useState('');
  const [busy, setBusy] = useState(false);

  const drivers = listDrivers();
  const configured = isConfigured();

  useEffect(() => {
    document.title = 'Driver sign in · KBS';
    if (drivers.length === 1) setCode(drivers[0].code);
    // Only on mount; the list comes from build-time config and cannot change.
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, []);

  const handleSubmit = (event: React.FormEvent) => {
    event.preventDefault();
    setError('');
    setBusy(true);

    const driver = signIn(code, password);
    if (!driver) {
      setError('That name and password do not match.');
      setBusy(false);
      return;
    }
    onSignIn(driver);
  };

  return (
    <div className="flex min-h-screen flex-col justify-center bg-rig-ink px-5 py-10">
      <div className="mx-auto w-full max-w-sm">
        <div className="text-center">
          <img
            src="/Logo for KBS Earthmovers - Bold Industrial Design.png"
            alt=""
            className="mx-auto h-16 w-16 rounded-2xl bg-white/5 p-1.5"
            onError={(e) => ((e.target as HTMLImageElement).style.display = 'none')}
          />
          <p className="rig-label mt-5 text-rig-signal">KBS Harvesters</p>
          <h1 className="mt-1.5 text-[28px] font-bold leading-tight text-white">Driver sign in</h1>
        </div>

        {!configured ? (
          <div className="mt-8 rounded-2xl border border-rig-line bg-rig-surface p-5 text-center">
            <AlertCircle className="mx-auto h-8 w-8 text-rig-signal" />
            <p className="mt-3 font-semibold text-white">No drivers set up yet</p>
            <p className="mt-1.5 text-sm text-gray-400">
              Add VITE_DRIVER_CREDENTIALS to the deployment settings, then redeploy.
            </p>
          </div>
        ) : (
          <form onSubmit={handleSubmit} className="mt-8 space-y-4">
            <div>
              <label className="rig-label mb-2 block" htmlFor="driver-code">
                Driver
              </label>
              {drivers.length > 1 ? (
                <select
                  id="driver-code"
                  value={code}
                  onChange={(e) => setCode(e.target.value)}
                  className="rig-field-dark"
                  required
                >
                  <option value="">Choose your name</option>
                  {drivers.map((driver) => (
                    <option key={driver.code} value={driver.code}>
                      {driver.name}
                    </option>
                  ))}
                </select>
              ) : (
                <input
                  id="driver-code"
                  value={code}
                  onChange={(e) => setCode(e.target.value)}
                  className="rig-field-dark"
                  placeholder="Your name"
                  autoComplete="username"
                  required
                />
              )}
            </div>

            <div>
              <label className="rig-label mb-2 block" htmlFor="driver-password">
                Password
              </label>
              <input
                id="driver-password"
                type="password"
                value={password}
                onChange={(e) => setPassword(e.target.value)}
                className="rig-field-dark"
                placeholder="••••••"
                autoComplete="current-password"
                required
              />
            </div>

            {error && (
              <p className="flex items-center gap-2 rounded-xl bg-rose-500/10 px-3.5 py-3 text-sm text-rose-300">
                <AlertCircle className="h-4 w-4 shrink-0" />
                {error}
              </p>
            )}

            <button type="submit" disabled={busy} className="rig-btn-primary !mt-6">
              {busy ? <Loader2 className="h-5 w-5 animate-spin" /> : <LogIn className="h-5 w-5" />}
              Sign in
            </button>
          </form>
        )}
      </div>
    </div>
  );
};

export default DriverLogin;
