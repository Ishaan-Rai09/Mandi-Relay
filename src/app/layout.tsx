import type { Metadata, Viewport } from "next";

// Self-hosted variable fonts: no build-time network dependency, cached by the
// service worker, and correct Gurmukhi/Devanagari coverage for Punjabi and Hindi.
import "@fontsource-variable/inter";
import "@fontsource-variable/manrope";
import "@fontsource-variable/noto-sans-devanagari";
import "@fontsource-variable/noto-sans-gurmukhi";

import { ToastProvider } from "@/components/ui/toast";
import { ServiceWorkerRegistrar } from "@/components/pwa/service-worker";
import "./globals.css";

const siteUrl = process.env.NEXT_PUBLIC_SITE_URL ?? "http://localhost:3000";

export const metadata: Metadata = {
  metadataBase: new URL(siteUrl),
  title: {
    default: "Mandi Relay — Your Produce. Your Market. Your Voice.",
    template: "%s · Mandi Relay",
  },
  description:
    "Mandi Relay is a voice-first agricultural marketplace. Speak what you have harvested, and reach nearby buyers, offers and auctions without learning a complicated app.",
  applicationName: "Mandi Relay",
  manifest: "/manifest.webmanifest",
  appleWebApp: {
    capable: true,
    title: "Mandi Relay",
    statusBarStyle: "default",
  },
  icons: {
    icon: [
      { url: "/icons/icon-192.png", sizes: "192x192", type: "image/png" },
      { url: "/icons/icon-512.png", sizes: "512x512", type: "image/png" },
    ],
    apple: [{ url: "/icons/icon-192.png", sizes: "192x192" }],
  },
  openGraph: {
    title: "Mandi Relay — Your Produce. Your Market. Your Voice.",
    description:
      "Speak naturally. Discover buyers. Compare offers. Sell smarter. A voice-first agricultural marketplace for India.",
    type: "website",
    locale: "en_IN",
  },
  formatDetection: { telephone: false },
};

export const viewport: Viewport = {
  themeColor: "#183D2B",
  width: "device-width",
  initialScale: 1,
  maximumScale: 5,
  viewportFit: "cover",
};

export default function RootLayout({ children }: { children: React.ReactNode }) {
  return (
    <html lang="en-IN" suppressHydrationWarning>
      <body className="min-h-dvh bg-ivory font-sans text-charcoal antialiased">
        <a
          href="#main"
          className="sr-only focus:not-sr-only focus:fixed focus:left-4 focus:top-4 focus:z-[100] focus:rounded focus:bg-forest focus:px-4 focus:py-2 focus:text-sm focus:text-white"
        >
          Skip to content
        </a>
        <ToastProvider>{children}</ToastProvider>
        <ServiceWorkerRegistrar />
      </body>
    </html>
  );
}
