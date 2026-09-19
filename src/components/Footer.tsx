import React from 'react';
import { Link } from 'react-router-dom';
import { Phone, Mail, MapPin, User } from 'lucide-react';

/**
 * Site footer.
 *
 * The home page previously ended on the orange call-to-action with nothing after it.
 * This closes the page and carries the details a customer looks for last: who to ask
 * for, where the yard is, and how to reach them.
 */
const Footer: React.FC = () => (
  <footer data-testid="site-footer" className="bg-gray-900 text-gray-400">
    <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 py-12">
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
              <p className="text-lg font-bold leading-tight text-white">
                KBS <span className="text-amber-500">Harvesters</span>
              </p>
              <p className="text-xs font-semibold uppercase tracking-widest text-gray-500">
                Earthmovers and Harvester
              </p>
            </div>
          </div>
          <p className="mt-4 max-w-xs text-sm leading-relaxed">
            Harvester and earthmover rental across Pathur, Koradacheri and Thiruvarur.
          </p>
        </div>

        {/* Contact */}
        <div>
          <h2 className="text-xs font-semibold uppercase tracking-widest text-amber-500">
            Contact
          </h2>
          <ul className="mt-4 space-y-3 text-sm">
            <li className="flex items-center gap-3 text-white">
              <User className="h-4 w-4 shrink-0 text-amber-500" />
              <span className="font-semibold">BHASKARAN K</span>
            </li>
            <li>
              <a
                href="tel:9486532856"
                className="flex items-center gap-3 transition-colors duration-300 hover:text-white"
              >
                <Phone className="h-4 w-4 shrink-0 text-amber-500" />
                9486532856
              </a>
            </li>
            <li>
              <a
                href="tel:9943915881"
                className="flex items-center gap-3 transition-colors duration-300 hover:text-white"
              >
                <Phone className="h-4 w-4 shrink-0 text-amber-500" />
                9943915881
              </a>
            </li>
            <li>
              <a
                href="mailto:skmbhaskaran@gmail.com"
                className="flex items-center gap-3 break-all transition-colors duration-300 hover:text-white"
              >
                <Mail className="h-4 w-4 shrink-0 text-amber-500" />
                skmbhaskaran@gmail.com
              </a>
            </li>
            <li className="flex items-start gap-3">
              <MapPin className="mt-0.5 h-4 w-4 shrink-0 text-amber-500" />
              <span>2/559, North Street, Pathur, Koradacheri, Thiruvarur</span>
            </li>
          </ul>
        </div>

        {/* Navigation */}
        <div>
          <h2 className="text-xs font-semibold uppercase tracking-widest text-amber-500">
            Explore
          </h2>
          <ul className="mt-4 space-y-2.5 text-sm">
            {[
              { to: '/', label: 'Home' },
              { to: '/services', label: 'Services' },
              { to: '/contact', label: 'Contact' },
            ].map((item) => (
              <li key={item.to}>
                <Link
                  to={item.to}
                  className="transition-colors duration-300 hover:text-white"
                >
                  {item.label}
                </Link>
              </li>
            ))}
          </ul>
        </div>
      </div>

      <div className="mt-10 flex flex-col gap-2 border-t border-gray-800 pt-6 text-xs sm:flex-row sm:items-center sm:justify-between">
        <p>© {new Date().getFullYear()} KBS Earthmovers &amp; Harvesters. All rights reserved.</p>
        <p className="text-gray-500">Pathur · 613703</p>
      </div>
    </div>
  </footer>
);

export default Footer;
