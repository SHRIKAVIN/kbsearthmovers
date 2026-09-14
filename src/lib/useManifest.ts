import { useEffect } from 'react';

/**
 * Point the page at a different web app manifest.
 *
 * Installing a PWA reads whichever manifest the page links at that moment, so the
 * driver screens swap in one scoped to /driver. The result is a separate home-screen
 * app called "KBS Driver" that opens straight to the driver login - not the public
 * site with the driver page buried inside it.
 *
 * The previous href is restored on unmount so navigating back to the public site
 * still offers the normal install.
 */
export function useManifest(href: string) {
  useEffect(() => {
    const link = document.querySelector<HTMLLinkElement>('link[rel="manifest"]');
    if (!link) return;

    const previous = link.getAttribute('href');
    link.setAttribute('href', href);

    return () => {
      if (previous) link.setAttribute('href', previous);
    };
  }, [href]);
}
