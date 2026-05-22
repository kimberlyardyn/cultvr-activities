"use client";

import Script from "next/script";
import { usePathname, useSearchParams } from "next/navigation";
import { Suspense, useEffect } from "react";

/**
 * Google Analytics 4 (gtag.js) integration for the App Router.
 *
 * - Loads the gtag script once via next/script with `afterInteractive` strategy
 *   (recommended for analytics — non-blocking, runs after hydration).
 * - Tracks SPA route changes manually because gtag only auto-fires page_view
 *   on the initial HTML load; client-side navigations need an explicit
 *   `gtag("config", ID, { page_path })` call.
 *
 * Configured via the NEXT_PUBLIC_GA_ID env var. If unset, this component
 * renders nothing so dev environments stay clean.
 */
export function GoogleAnalytics() {
  const gaId = process.env.NEXT_PUBLIC_GA_ID;
  if (!gaId) return null;

  return (
    <>
      <Script
        async
        src={`https://www.googletagmanager.com/gtag/js?id=${gaId}`}
        strategy="afterInteractive"
      />
      <Script id="ga-init" strategy="afterInteractive">
        {`
          window.dataLayer = window.dataLayer || [];
          function gtag(){dataLayer.push(arguments);}
          gtag('js', new Date());
          gtag('config', '${gaId}', { send_page_view: false });
        `}
      </Script>
      <Suspense fallback={null}>
        <RouteChangeTracker gaId={gaId} />
      </Suspense>
    </>
  );
}

/**
 * Sends a `page_view` event to GA whenever the App Router pathname or query
 * string changes. Wrapped in Suspense by the parent because `useSearchParams`
 * suspends during streaming SSR.
 */
function RouteChangeTracker({ gaId }: { gaId: string }) {
  const pathname = usePathname();
  const searchParams = useSearchParams();

  useEffect(() => {
    if (typeof window === "undefined") return;
    const win = window as Window & {
      gtag?: (...args: unknown[]) => void;
    };
    if (typeof win.gtag !== "function") return;

    const query = searchParams?.toString();
    const pagePath = query ? `${pathname}?${query}` : pathname;

    win.gtag("event", "page_view", {
      page_path: pagePath,
      page_location: window.location.href,
      send_to: gaId,
    });
  }, [gaId, pathname, searchParams]);

  return null;
}
