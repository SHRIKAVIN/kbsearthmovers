import React, { useState, useEffect } from 'react';
import { ClipboardList, PlusCircle, LogOut } from 'lucide-react';
import JobForm from '../components/driver/JobForm';
import JobList from '../components/driver/JobList';
import PaymentQRModal from '../components/PaymentQRModal';
import type { Driver } from '../lib/driverAuth';

type Tab = 'new' | 'jobs';

/**
 * The driver's whole app: record a job, then chase or collect what it earned.
 *
 * Two tabs rather than a menu because there are exactly two things to do here, and a
 * thumb should reach either without a decision. The bar sits at the bottom for the
 * same reason - it is the only part of a phone screen a hand holding it can reach.
 */
const DriverApp: React.FC<{ driver: Driver; onSignOut: () => void }> = ({ driver, onSignOut }) => {
  const [tab, setTab] = useState<Tab>('new');
  const [collecting, setCollecting] = useState<{ id: string; balance: number } | null>(null);
  const [paidPending, setPaidPending] = useState(false);
  const [refreshKey, setRefreshKey] = useState(0);

  useEffect(() => {
    document.title = 'KBS Driver';
  }, []);

  return (
    <div className="min-h-screen bg-rig-bone">
      <header className="sticky top-0 z-30 border-b border-gray-200 bg-white/95 backdrop-blur">
        <div className="mx-auto flex max-w-lg items-center justify-between px-4 py-3">
          <div className="flex items-center gap-2.5">
            <img
              src="/Logo for KBS Earthmovers - Bold Industrial Design.png"
              alt=""
              className="h-9 w-9 rounded-lg"
              onError={(e) => ((e.target as HTMLImageElement).style.display = 'none')}
            />
            <div>
              <p className="rig-label !text-[10px]">Driver</p>
              <p className="text-[15px] font-bold leading-tight text-rig-ink">{driver.name}</p>
            </div>
          </div>
          <button
            onClick={onSignOut}
            className="rounded-xl border-2 border-gray-200 p-2.5 text-gray-500 transition active:scale-95"
            aria-label="Sign out"
          >
            <LogOut className="h-4 w-4" />
          </button>
        </div>
      </header>

      <main className="mx-auto max-w-lg px-4 py-4">
        {tab === 'new' ? (
          <JobForm
            driver={driver}
            onSaved={() => setRefreshKey((key) => key + 1)}
            onCollect={(entry) => setCollecting(entry)}
          />
        ) : (
          <JobList
            driver={driver}
            refreshKey={refreshKey}
            onCollect={(entry) => setCollecting(entry)}
          />
        )}
      </main>

      {/*
        Tab switcher floats above the form's sticky save button rather than being a
        second fixed bar, so the two never stack and the thumb reaches both.
      */}
      <div className="pointer-events-none fixed inset-x-0 z-50 flex justify-center"
           style={{ bottom: `calc(env(safe-area-inset-bottom, 0px) + ${tab === 'new' ? 88 : 20}px)` }}>
        <div className="pointer-events-auto flex gap-1 rounded-full border border-gray-200 bg-white p-1 shadow-lg">
          {([
            { id: 'new', label: 'New job', icon: PlusCircle },
            { id: 'jobs', label: 'My jobs', icon: ClipboardList },
          ] as const).map(({ id, label, icon: Icon }) => (
            <button
              key={id}
              onClick={() => setTab(id)}
              className={`flex items-center gap-1.5 rounded-full px-4 py-2.5 text-[14px] font-semibold transition ${
                tab === id ? 'bg-rig-ink text-white' : 'text-gray-500'
              }`}
            >
              <Icon className="h-4 w-4" />
              {label}
            </button>
          ))}
        </div>
      </div>

      {collecting && (
        <PaymentQRModal
          workEntryId={collecting.id}
          onPaid={() => setPaidPending(true)}
          onClose={() => {
            setCollecting(null);
            if (paidPending) {
              setPaidPending(false);
              setRefreshKey((key) => key + 1);
            }
          }}
        />
      )}
    </div>
  );
};

export default DriverApp;
