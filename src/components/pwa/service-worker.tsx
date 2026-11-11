"use client";

import { useEffect } from "react";

/**
 * Registers the service worker. Registration is skipped in development so that
 * a stale cache never hides a local change, and it is skipped entirely on
 * browsers without support rather than throwing.
 */
export function ServiceWorkerRegistrar() {
  useEffect(() => {
    if (typeof window === "undefined") return;
    if (!("serviceWorker" in navigator)) return;
    if (process.env.NODE_ENV !== "production") return;

    const register = () => {
      navigator.serviceWorker.register("/sw.js").catch(() => {
        /* Installation is progressive — a failed registration must not break the app. */
      });
    };

    if (document.readyState === "complete") register();
    else window.addEventListener("load", register, { once: true });
  }, []);

  return null;
}
