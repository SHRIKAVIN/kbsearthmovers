import React from 'react';
import { Link } from 'react-router-dom';
import { Phone, Mail, MapPin, User } from 'lucide-react';

/**
 * Site footer.
 *
 * The page previously just stopped after the orange call-to-action. This closes it
 * and gives the details a customer looks for last: who to ask for, where the yard is,
 * and how to reach them.
 */
const Footer: React.FC = () => (
  <footer data-testid="site-footer" className="bg-rig-ink text-gray-400">
    <div className="mx-auto max-w-7xl px-4 py-12 sm:px-6 lg:px-8">
      <div className="grid gap-10 md:grid-cols-3">
        {/* Identity */}
        <div>
          <div className="flex items-center gap-3">
            <img
              src="/Logo for KBS Earthmovers - Bold Industrial Design.png"
              alt=""
              className="h-11 w-11 rounded-lg"
              onError={(e) => ((e.target as HTMLImageElement).style.display = 'none')}
            />
            <div>
              <p className="text-[17px] font-bold leading-tight text-white">
                KBS <span className="text-rig-accent">Harvesters</span>
              </p>
              <p className="text-[11px] font-semibold uppercase tracking-[0.14em] text-gray-500">
                Earthmovers and Harvester
              </p>
            </div>
          </div>
          <p className="mt-4 max-w-xs text-[14px] leading-relaxed">
            Harvester and earthmover rental across Pathur, Koradacheri and Thiruvarur.
          </p>
        </div>

        {/* Contact */}
        <div>
          <h2 className="text-[11px] font-semibold uppercase tracking-[0.14em] text-rig-signal">
            Contact
          </h2>
          <ul className="mt-4 space-y-3 text-[15px]">
            <li className="flex items-center gap-3 text-white">
              <User className="h-4 w-4 shrink-0 text-rig-accent" />
              <span className="font-semibold">BASKARAN ROHINI</span>
            </li>
            <li>
              <a
                href="tel:9965278945"
                className="flex items-center gap-3 transition-colors hover:text-white"
              >
                <Phone className="h-4 w-4 shrink-0 text-rig-accent" />
                9965278945
              </a>
            </li>
            <li>
              <a
                href="mailto:shrikavinkbs@gmail.com"
                className="flex items-center gap-3 break-all transition-colors hover:text-white"
              >
                <Mail className="h-4 w-4 shrink-0 text-rig-accent" />
                shrikavinkbs@gmail.com
              </a>
            </li>
            <li className="flex items-start gap-3">
              <MapPin className="mt-0.5 h-4 w-4 shrink-0 text-rig-accent" />
              <span>2/559, North Street, Pathur, Koradacheri, Thiruvarur</span>
            </li>
          </ul>
        </div>

        {/* Navigation */}
        <div>
          <h2 className="text-[11px] font-semibold uppercase tracking-[0.14em] text-rig-signal">
            Explore
          </h2>
          <ul className="mt-4 space-y-2.5 text-[15px]">
            {[
              { to: '/', label: 'Home' },
              { to: '/services', label: 'Services' },
              { to: '/contact', label: 'Contact' },
              { to: '/pay', label: 'Pay your bill' },
            ].map((item) => (
              <li key={item.to}>
                <Link to={item.to} className="transition-colors hover:text-white">
                  {item.label}
                </Link>
              </li>
            ))}
          </ul>
        </div>
      </div>

      <div className="mt-10 flex flex-col gap-2 border-t border-rig-line pt-6 text-[13px] sm:flex-row sm:items-center sm:justify-between">
        <p>© {new Date().getFullYear()} KBS Earthmovers &amp; Harvesters. All rights reserved.</p>
        <p className="text-gray-500">Pathur · 613703</p>
      </div>
    </div>
  </footer>
);

export default Footer;
