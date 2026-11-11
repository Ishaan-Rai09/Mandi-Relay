import { SiteFooter, SiteHeader } from "@/components/marketing/site-chrome";
import { InstallPrompt } from "@/components/pwa/install-prompt";

export default function PublicLayout({ children }: { children: React.ReactNode }) {
  return (
    <div className="flex min-h-dvh flex-col bg-ivory">
      <SiteHeader />
      <main id="main" className="flex-1">
        {children}
      </main>
      <SiteFooter />
      <InstallPrompt />
    </div>
  );
}
