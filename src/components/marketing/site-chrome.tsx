import Link from "next/link";
import { ArrowRight } from "lucide-react";

import { Wordmark } from "@/components/layout/wordmark";
import { ButtonLink } from "@/components/ui/button";
import { getSessionUser } from "@/lib/auth";
import { ROLE_HOME } from "@/lib/domain";

export async function SiteHeader() {
  const user = await getSessionUser();

  return (
    <header className="sticky top-0 z-40 border-b border-ivory-300/80 bg-ivory/85 backdrop-blur-md">
      <div className="container-x flex h-16 items-center justify-between gap-4">
        <Link href="/" aria-label="Mandi Relay home">
          <Wordmark />
        </Link>

        <nav aria-label="Main" className="hidden items-center gap-7 text-[13px] font-medium text-charcoal-500 md:flex">
          <Link href="/#how-it-works" className="transition-colors hover:text-charcoal">How it works</Link>
          <Link href="/#voice" className="transition-colors hover:text-charcoal">Voice listing</Link>
          <Link href="/marketplace-preview" className="transition-colors hover:text-charcoal">Marketplace</Link>
          <Link href="/#auctions" className="transition-colors hover:text-charcoal">Auctions</Link>
          <Link href="/#trust" className="transition-colors hover:text-charcoal">Trust</Link>
        </nav>

        <div className="flex items-center gap-2">
          {user ? (
            <ButtonLink href={ROLE_HOME[user.role]} size="sm" variant="primary" icon={<ArrowRight className="size-3.5" />}>
              Open workspace
            </ButtonLink>
          ) : (
            <>
              <Link
                href="/auth"
                className="hidden rounded-[5px] px-2.5 py-1.5 text-[13px] font-medium text-charcoal-500 transition-colors hover:text-charcoal sm:block"
              >
                Sign in
              </Link>
              <ButtonLink href="/auth?mode=signup" size="sm">
                Start selling
              </ButtonLink>
            </>
          )}
        </div>
      </div>
    </header>
  );
}

export function SiteFooter() {
  return (
    <footer className="border-t border-forest-700 bg-forest-900 text-ivory">
      <div className="container-x grid gap-10 py-12 md:grid-cols-[1.4fr_1fr_1fr_1fr]">
        <div>
          <Wordmark tone="ivory" />
          <p className="mt-4 max-w-xs text-[13px] leading-relaxed text-ivory/60">
            A voice-first marketplace for Indian producers. Speak your harvest, reach
            buyers nearby, and decide with real numbers in front of you.
          </p>
          <p className="mt-4 text-[11.5px] leading-relaxed text-ivory/40">
            Prototype build. Demonstration listings and bids are labelled as such.
            Prices are indicative references, not quotations. No payments are processed.
          </p>
        </div>

        <FooterColumn
          title="Producers"
          links={[
            { href: "/auth?mode=signup&role=farmer", label: "Start selling" },
            { href: "/#voice", label: "Voice listing" },
            { href: "/#auctions", label: "Micro-auctions" },
            { href: "/farmer/dashboard", label: "Farmer dashboard" },
          ]}
        />
        <FooterColumn
          title="Buyers"
          links={[
            { href: "/marketplace-preview", label: "Browse marketplace" },
            { href: "/auth?mode=signup&role=buyer", label: "Register as a buyer" },
            { href: "/buyer/auctions", label: "Live auctions" },
            { href: "/buyer/orders", label: "Orders" },
          ]}
        />
        <FooterColumn
          title="Platform"
          links={[
            { href: "/#trust", label: "Trust & verification" },
            { href: "/#prices", label: "Price references" },
            { href: "/transporter/dashboard", label: "Transport partners" },
            { href: "/auth", label: "Sign in" },
          ]}
        />
      </div>
      <div className="border-t border-forest-700/70">
        <div className="container-x flex flex-col gap-2 py-5 text-[11.5px] text-ivory/40 sm:flex-row sm:items-center sm:justify-between">
          <p>© {new Date().getFullYear()} Mandi Relay. Built for producers in Punjab and the NCR corridor.</p>
          <p>Hindi · ਪੰਜਾਬੀ · English</p>
        </div>
      </div>
    </footer>
  );
}

function FooterColumn({ title, links }: { title: string; links: { href: string; label: string }[] }) {
  return (
    <div>
      <p className="text-[10.5px] font-semibold uppercase tracking-[0.14em] text-ivory/40">{title}</p>
      <ul className="mt-3.5 space-y-2.5">
        {links.map((link) => (
          <li key={link.href + link.label}>
            <Link href={link.href} className="text-[13px] text-ivory/75 transition-colors hover:text-ivory">
              {link.label}
            </Link>
          </li>
        ))}
      </ul>
    </div>
  );
}
