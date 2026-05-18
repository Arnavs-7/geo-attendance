"use client";

import { useEffect } from "react";

/**
 * Registers the PWA service worker on the client. Rendering this once in the
 * root layout makes the app installable ("Add to Home Screen") on Android and
 * iOS — no app store required.
 */
export default function ServiceWorkerRegister() {
  useEffect(() => {
    if (typeof window === "undefined" || !("serviceWorker" in navigator)) return;
    const register = () => {
      navigator.serviceWorker
        .register("/sw.js")
        .catch((err) => console.warn("Service worker registration failed:", err));
    };
    if (document.readyState === "complete") register();
    else window.addEventListener("load", register, { once: true });
  }, []);

  return null;
}
