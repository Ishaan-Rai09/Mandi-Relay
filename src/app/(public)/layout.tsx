import { SiteFooter, SiteHeader } from "@/components/marketing/site-chrome";
import { InstallPrompt } from "@/components/pwa/install-prompt";

export default function PublicLayout({ children }: { children: React.ReactNode }) {
  return (
    // Installed apps show the bottom tab bar, so the footer needs room above it.
    <div className="flex min-h-dvh flex-col bg-ivory max-md:standalone:pb-[calc(3.75rem+env(safe-area-inset-bottom))]">
      <SiteHeader />
      <main id="main" className="flex-1">
        {children}
      </main>
      <SiteFooter />
      <InstallPrompt />
    </div>
  );
}
