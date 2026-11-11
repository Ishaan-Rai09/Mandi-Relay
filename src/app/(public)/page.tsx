import Link from "next/link";
import {
  ArrowRight,
  ArrowUpRight,
  BadgeCheck,
  Bell,
  ClipboardCheck,
  FileSearch,
  Gavel,
  Handshake,
  Languages,
  MapPin,
  Mic,
  ShieldCheck,
  Sparkles,
  Store,
  TrendingUp,
  Truck,
  Users,
  Wallet,
} from "lucide-react";

import { HeroVoiceDemo } from "@/components/marketing/hero-voice-demo";
import { VoicePlayground } from "@/components/marketing/voice-playground";
import { ListingCard } from "@/components/marketplace/listing-card";
import { Countdown, LiveDot } from "@/components/marketplace/countdown";
import { ButtonLink } from "@/components/ui/button";
import { Panel } from "@/components/ui/panel";
import { CheckRow, Reveal, Stat } from "@/components/ui/misc";
import { db } from "@/lib/db";
import { searchListings } from "@/lib/queries/listings";
import { formatINR, formatNumber, parseJsonArray, timeAgo } from "@/lib/utils";
import { BUSINESS_TYPE_LABEL, type BusinessType } from "@/lib/domain";
import { highestBids } from "@/lib/services/auctions";

export const dynamic = "force-dynamic";

async function loadLandingData() {
  const [market, auction, refs, buyers, categories] = await Promise.all([
    searchListings({ limit: 6, sort: "newest" }),
    db.auction.findFirst({
      where: { status: "LIVE" },
      orderBy: { endsAt: "asc" },
      include: {
        listing: { include: { category: true, farmer: true } },
        bids: { orderBy: { amount: "desc" }, take: 1, include: { buyer: true } },
        _count: { select: { bids: true } },
      },
    }),
    db.priceReference.findMany({
      where: { reportDate: { gte: new Date(Date.now() - 36 * 60 * 60 * 1000) } },
      orderBy: [{ commodity: "asc" }, { reportDate: "desc" }],
      take: 40,
    }),
    db.businessProfile.findMany({ take: 3, include: { user: true } }),
    db.category.findMany({ orderBy: { sortOrder: "asc" } }),
  ]);

  // Keep the newest row per commodity for the reference table.
  const seen = new Set<string>();
  const latestRefs = refs.filter((ref) => {
    if (seen.has(ref.commodity)) return false;
    seen.add(ref.commodity);
    return true;
  });

  const highest = auction ? await highestBids([auction.id]) : new Map();

  return { market, auction, latestRefs, buyers, categories, highest };
}

export default async function LandingPage() {
  const { market, auction, latestRefs, buyers, categories, highest } = await loadLandingData();
  const leader = auction ? highest.get(auction.id) : null;

  return (
    <>
      {/* ─────────────────────────── Hero ─────────────────────────── */}
      <section className="relative overflow-hidden border-b border-ivory-300">
        <div className="paper pointer-events-none absolute inset-0 opacity-60" aria-hidden />
        <div
          className="pointer-events-none absolute inset-y-0 right-0 hidden w-[46%] border-l border-ivory-300 bg-ivory-200/40 lg:block"
          aria-hidden
        />
        <div className="container-x relative grid gap-10 py-12 lg:grid-cols-[1.02fr_0.98fr] lg:items-center lg:gap-12 lg:py-20">
          <div>
            <Reveal>
              <p className="inline-flex items-center gap-2 rounded-full border border-forest/20 bg-white/70 px-3 py-1 text-[11px] font-medium text-forest-700">
                <span className="size-1.5 rounded-full bg-gold" aria-hidden />
                Voice-first agricultural marketplace · Punjab &amp; NCR corridor
              </p>
            </Reveal>

            <Reveal delay={0.06}>
              <h1 className="mt-5 font-display text-hero font-extrabold text-forest-900">
                Your Produce
                <br />
                Deserves a
                <br />
                <span className="relative inline-block">
                  Better Market.
                  <svg
                    viewBox="0 0 320 12"
                    className="absolute -bottom-1.5 left-0 w-full text-gold"
                    aria-hidden
                    preserveAspectRatio="none"
                  >
                    <path d="M2 8c60-6 140-7 316-3" fill="none" stroke="currentColor" strokeWidth="3.5" strokeLinecap="round" />
                  </svg>
                </span>
              </h1>
            </Reveal>

            <Reveal delay={0.12}>
              <p className="mt-5 max-w-lg text-[15.5px] leading-relaxed text-charcoal-500">
                Speak naturally. Discover buyers. Compare offers. Sell smarter.
                Mandi Relay turns one spoken sentence into a live listing, then puts every
                nearby offer in front of you — with the transport cost worked out.
              </p>
            </Reveal>

            <Reveal delay={0.18}>
              <div className="mt-7 flex flex-wrap items-center gap-3">
                <ButtonLink href="/auth?mode=signup&role=farmer" size="lg" icon={<Mic className="size-4" />}>
                  Start selling
                </ButtonLink>
                <ButtonLink href="/marketplace-preview" size="lg" variant="outline" icon={<Store className="size-4" />}>
                  Explore marketplace
                </ButtonLink>
              </div>
            </Reveal>

            <Reveal delay={0.24}>
              <div className="mt-6 flex flex-wrap items-center gap-x-5 gap-y-2 text-[11.5px] text-charcoal-400">
                <span className="inline-flex items-center gap-1.5">
                  <Languages className="size-3.5 text-forest-600" aria-hidden />
                  हिन्दी · ਪੰਜਾਬੀ · English
                </span>
                <span className="inline-flex items-center gap-1.5">
                  <ShieldCheck className="size-3.5 text-forest-600" aria-hidden />
                  Phone numbers never public
                </span>
                <span className="inline-flex items-center gap-1.5">
                  <ClipboardCheck className="size-3.5 text-forest-600" aria-hidden />
                  No payment is taken in this build
                </span>
              </div>
            </Reveal>
          </div>

          <Reveal delay={0.1} y={24}>
            <HeroVoiceDemo />
          </Reveal>
        </div>

        {/* Audience strip */}
        <div className="relative border-t border-ivory-300 bg-white/60">
          <div className="container-x flex flex-wrap items-center gap-x-8 gap-y-3 py-3.5">
            <p className="text-[10.5px] font-semibold uppercase tracking-[0.14em] text-sage">
              Built for
            </p>
            {[
              { icon: Sparkles, label: "Farmers & producers" },
              { icon: Store, label: "Vegetable & fruit retailers" },
              { icon: Users, label: "Restaurants & kitchens" },
              { icon: Truck, label: "Wholesalers & transporters" },
            ].map(({ icon: Icon, label }) => (
              <span key={label} className="inline-flex items-center gap-1.5 text-[12px] font-medium text-charcoal-500">
                <Icon className="size-3.5 text-forest-500" strokeWidth={1.8} aria-hidden />
                {label}
              </span>
            ))}
          </div>
        </div>
      </section>

      {/* ─────────────────────── How it works ─────────────────────── */}
      <section id="how-it-works" className="border-b border-ivory-300">
        <div className="container-x py-14 sm:py-18">
          <div className="grid gap-8 lg:grid-cols-[0.85fr_1.15fr]">
            <Reveal>
              <div>
                <p className="eyebrow">How Mandi Relay works</p>
                <h2 className="mt-3 font-display text-display font-bold text-charcoal">
                  Three steps between the field and a fair price.
                </h2>
                <p className="mt-4 max-w-md text-[14px] leading-relaxed text-charcoal-500">
                  No forms to learn. No commission agent to decode. The farmer stays in control of
                  every decision, and nothing is committed without an explicit confirmation.
                </p>
              </div>
            </Reveal>

            <div className="grid gap-px overflow-hidden rounded-[8px] border border-ivory-300 bg-ivory-300 sm:grid-cols-3">
              {[
                {
                  n: "01",
                  title: "Speak your harvest",
                  body: "Say what you have, how much, where and when. The parser extracts a structured listing and asks only for what is genuinely missing.",
                  icon: Mic,
                },
                {
                  n: "02",
                  title: "Buyers respond",
                  body: "Nearby retailers, restaurants and wholesalers see the lot and send real, persistent offers — not enquiries that vanish.",
                  icon: Handshake,
                },
                {
                  n: "03",
                  title: "Compare and close",
                  body: "See each offer against the mandi reference price and the transport cost, then accept, counter or run a micro-auction.",
                  icon: Gavel,
                },
              ].map((step, index) => (
                <Reveal key={step.n} delay={index * 0.07} className="bg-white">
                  <div className="flex h-full flex-col p-5">
                    <div className="flex items-center justify-between">
                      <span className="font-display text-[11px] font-bold tracking-[0.12em] text-sage">
                        {step.n}
                      </span>
                      <step.icon className="size-4 text-forest-600" strokeWidth={1.8} aria-hidden />
                    </div>
                    <h3 className="mt-6 font-display text-[15px] font-bold text-charcoal">{step.title}</h3>
                    <p className="mt-2 text-[12.5px] leading-relaxed text-charcoal-500">{step.body}</p>
                  </div>
                </Reveal>
              ))}
            </div>
          </div>
        </div>
      </section>

      {/* ─────────────────────── Voice listing ─────────────────────── */}
      <section id="voice" className="border-b border-ivory-300 bg-white">
        <div className="container-x py-14 sm:py-18">
          <div className="grid gap-10 lg:grid-cols-[0.8fr_1.2fr] lg:items-start lg:gap-14">
            <Reveal>
              <div className="lg:sticky lg:top-24">
                <p className="eyebrow">Voice-powered listing</p>
                <h2 className="mt-3 font-display text-display font-bold text-charcoal">
                  Say it once. The listing writes itself.
                </h2>
                <p className="mt-4 text-[14px] leading-relaxed text-charcoal-500">
                  Speech is transcribed in the language it is spoken, then mapped onto the fields a
                  marketplace actually needs. If the quantity, date or location is not in the
                  sentence, you are asked — never guessed at.
                </p>
                <ul className="mt-5 space-y-2.5">
                  <CheckRow>Hinglish, Hindi, Punjabi and English sentences</CheckRow>
                  <CheckRow>Quintals and tonnes converted to kilograms automatically</CheckRow>
                  <CheckRow>“₹20 se achha” understood as a minimum, not a fixed price</CheckRow>
                  <CheckRow>Every field editable before the listing is published</CheckRow>
                  <CheckRow>Full keyboard and text fallback for every voice action</CheckRow>
                </ul>
                <p className="mt-5 text-[11.5px] leading-relaxed text-charcoal-400">
                  Microphone access needs HTTPS (or localhost) and your permission. Speech
                  recognition uses your browser&apos;s engine and needs a network connection.
                </p>
              </div>
            </Reveal>

            <Reveal delay={0.08}>
              <VoicePlayground />
            </Reveal>
          </div>
        </div>
      </section>

      {/* ──────────────────── Live marketplace preview ──────────────────── */}
      <section id="marketplace" className="border-b border-ivory-300">
        <div className="container-x py-14 sm:py-18">
          <div className="flex flex-wrap items-end justify-between gap-4">
            <div>
              <p className="eyebrow">Live marketplace</p>
              <h2 className="mt-3 font-display text-display font-bold text-charcoal">
                {market.total > 0 ? `${market.total} produce lots open right now.` : "The marketplace opens with the first lot."}
              </h2>
              <p className="mt-3 max-w-xl text-[14px] leading-relaxed text-charcoal-500">
                Every card below is a real database record. Records created by the demo seed
                are marked <span className="font-semibold text-sage">Demo</span> so nothing is
                mistaken for live market activity.
              </p>
            </div>
            <ButtonLink href="/marketplace-preview" variant="outline" size="sm" icon={<ArrowRight className="size-3.5" />}>
              Browse all
            </ButtonLink>
          </div>

          {market.items.length > 0 ? (
            <div className="mt-7 grid gap-4 sm:grid-cols-2 lg:grid-cols-3">
              {market.items.map((listing, index) => (
                <Reveal key={listing.id} delay={index * 0.04} y={12}>
                  <ListingCard listing={listing} href={`/marketplace-preview/${listing.id}`} />
                </Reveal>
              ))}
            </div>
          ) : (
            <Panel className="mt-7 p-8 text-center">
              <p className="text-[13px] text-charcoal-500">
                No active lots yet. Sign in as a farmer to publish the first one.
              </p>
            </Panel>
          )}

          <div className="mt-6 grid gap-4 sm:grid-cols-2 lg:grid-cols-3">
            {categories.slice(0, 6).map((category) => {
              const count = market.items.filter((l) => l.categorySlug === category.slug).length;
              return (
                <Link
                  key={category.slug}
                  href={`/marketplace-preview?category=${category.slug}`}
                  className="flex items-center justify-between rounded-[6px] border border-ivory-300 bg-white px-3.5 py-2.5 transition-colors hover:border-forest/25"
                >
                  <span className="text-[12.5px] font-medium text-charcoal">
                    {category.name} <span className="text-charcoal-400">· {category.nameHi}</span>
                  </span>
                  <span className="text-[11px] text-charcoal-400 tabular">
                    {count > 0 ? `${count} shown` : "Browse"}
                  </span>
                </Link>
              );
            })}
          </div>
        </div>
      </section>

      {/* ──────────────────── Buyer discovery ──────────────────── */}
      <section className="border-b border-ivory-300 bg-white">
        <div className="container-x grid gap-10 py-14 lg:grid-cols-[1fr_1fr] lg:items-center sm:py-18">
          <Reveal>
            <div>
              <p className="eyebrow">Buyer discovery</p>
              <h2 className="mt-3 font-display text-display font-bold text-charcoal">
                The lot finds the shop that needs it.
              </h2>
              <p className="mt-4 max-w-lg text-[14px] leading-relaxed text-charcoal-500">
                Buyers register what they usually purchase — commodity, typical quantity and
                delivery area. When a matching lot is published, Mandi Relay surfaces it in their
                dashboard and ranks the match by distance, category and business type.
              </p>
              <ul className="mt-5 space-y-2.5">
                <CheckRow>Buyers bid on lots; farmers never chase unknown numbers</CheckRow>
                <CheckRow>Distance and transport estimates shown before acceptance</CheckRow>
                <CheckRow>Contact details stay masked until an order is confirmed</CheckRow>
              </ul>
              <ButtonLink href="/auth?mode=signup&role=buyer" size="sm" variant="outline" className="mt-6" icon={<ArrowUpRight className="size-3.5" />}>
                Register as a buyer
              </ButtonLink>
            </div>
          </Reveal>

          <Reveal delay={0.08}>
            <Panel className="overflow-hidden">
              <div className="flex items-center justify-between border-b border-ivory-200 bg-ivory px-4 py-2.5">
                <p className="text-[11px] font-semibold uppercase tracking-[0.1em] text-charcoal-500">
                  Registered buyer requirements
                </p>
                <span className="text-[10.5px] text-charcoal-400">Demonstration accounts</span>
              </div>
              <ul className="divide-y divide-ivory-200">
                {buyers.length === 0 ? (
                  <li className="px-4 py-6 text-center text-[12.5px] text-charcoal-400">
                    No buyer profiles registered yet.
                  </li>
                ) : (
                  buyers.map((buyer) => {
                    const commodities = parseJsonArray(buyer.preferredCommodities);
                    return (
                      <li key={buyer.id} className="flex items-start gap-3 px-4 py-3.5">
                        <span className="grid size-8 shrink-0 place-items-center rounded-full bg-forest-100 text-[10px] font-bold text-forest-700">
                          {buyer.businessName.slice(0, 2).toUpperCase()}
                        </span>
                        <div className="min-w-0 flex-1">
                          <p className="truncate text-[13px] font-semibold text-charcoal">
                            {buyer.businessName}
                          </p>
                          <p className="mt-0.5 text-[11.5px] text-charcoal-400">
                            {BUSINESS_TYPE_LABEL[buyer.businessType as BusinessType]} ·{" "}
                            {buyer.user.district ?? "Location pending"}
                          </p>
                          <div className="mt-1.5 flex flex-wrap gap-1">
                            {commodities.slice(0, 4).map((commodity) => (
                              <span
                                key={commodity}
                                className="rounded-[3px] border border-ivory-300 bg-ivory px-1.5 py-0.5 text-[10.5px] text-charcoal-500"
                              >
                                {commodity}
                              </span>
                            ))}
                          </div>
                        </div>
                        <span className="shrink-0 text-[10.5px] text-charcoal-400">
                          {buyer.typicalQuantityKg ? `~${formatNumber(buyer.typicalQuantityKg)} kg` : "—"}
                        </span>
                      </li>
                    );
                  })
                )}
              </ul>
            </Panel>
          </Reveal>
        </div>
      </section>

      {/* ──────────────────── Auctions ──────────────────── */}
      <section id="auctions" className="border-b border-ivory-300">
        <div className="container-x py-14 sm:py-18">
          <div className="grid gap-10 lg:grid-cols-[0.9fr_1.1fr] lg:items-center">
            <Reveal>
              <div>
                <p className="eyebrow">Micro-auctions</p>
                <h2 className="mt-3 font-display text-display font-bold text-charcoal">
                  Let nearby buyers bid against each other.
                </h2>
                <p className="mt-4 max-w-lg text-[14px] leading-relaxed text-charcoal-500">
                  When several buyers want the same lot, a short timed auction finds the price the
                  market will actually pay. Bids are validated on the server, the increment rule is
                  enforced, and the farmer still decides whether to award the lot at the end.
                </p>
                <ul className="mt-5 space-y-2.5">
                  <CheckRow>Start price, minimum increment and closing time set by the farmer</CheckRow>
                  <CheckRow>No bids accepted after the clock runs out</CheckRow>
                  <CheckRow>Awarding a bid creates the order; closing alone does not</CheckRow>
                  <CheckRow>Competing bids in this build come from labelled demo accounts</CheckRow>
                </ul>
              </div>
            </Reveal>

            <Reveal delay={0.08}>
              {auction ? (
                <Panel className="overflow-hidden border-gold/40">
                  <div className="flex items-center justify-between gap-3 border-b border-ivory-200 bg-gold-50 px-4 py-2.5">
                    <div className="flex items-center gap-2">
                      <LiveDot />
                      <span className="text-[11px] font-semibold uppercase tracking-[0.08em] text-gold-700">
                        Micro-auction
                      </span>
                    </div>
                    <span className="text-[10.5px] text-charcoal-400">
                      {auction._count.bids} bid{auction._count.bids === 1 ? "" : "s"}
                    </span>
                  </div>

                  <div className="p-4 sm:p-5">
                    <div className="flex flex-wrap items-start justify-between gap-4">
                      <div>
                        <h3 className="font-display text-[18px] font-bold text-charcoal">
                          {auction.listing.commodity}
                        </h3>
                        <p className="mt-0.5 text-[12px] text-charcoal-500">
                          {formatNumber(auction.quantity)} kg lot · {auction.listing.location}
                        </p>
                      </div>
                      <div className="text-right">
                        <p className="text-[10.5px] uppercase tracking-[0.08em] text-sage">
                          {leader ? "Highest bid" : "Starting price"}
                        </p>
                        <p className="font-display text-[24px] font-bold leading-none text-gold-700 tabular">
                          {formatINR(leader?.amount ?? auction.startingPrice)}
                          <span className="text-[12px] font-medium text-charcoal-400"> /kg</span>
                        </p>
                      </div>
                    </div>

                    <div className="mt-4 flex flex-wrap items-center justify-between gap-4 border-t border-ivory-200 pt-4">
                      <div>
                        <p className="text-[10.5px] uppercase tracking-[0.08em] text-sage">Closes in</p>
                        <Countdown endsAt={auction.endsAt.toISOString()} className="mt-1.5" />
                      </div>
                      <div className="text-right">
                        <p className="text-[10.5px] uppercase tracking-[0.08em] text-sage">Lot value at bid</p>
                        <p className="font-display text-[17px] font-bold text-charcoal tabular">
                          {formatINR((leader?.amount ?? auction.startingPrice) * auction.quantity)}
                        </p>
                      </div>
                    </div>

                    {leader ? (
                      <p className="mt-3 rounded-[4px] bg-ivory px-2.5 py-1.5 text-[11.5px] text-charcoal-500">
                        Leading: <span className="font-semibold text-charcoal">{leader.buyer?.name ?? "A buyer"}</span>
                        {" "}· bid placed {timeAgo(leader.createdAt)}
                      </p>
                    ) : null}

                    <div className="mt-4 flex flex-wrap items-center gap-2">
                      <ButtonLink href="/buyer/auctions" size="sm" variant="gold">
                        View and bid
                      </ButtonLink>
                      <span className="text-[10.5px] text-charcoal-400">
                        Sign in required · demo bids are labelled
                      </span>
                    </div>
                  </div>
                </Panel>
              ) : (
                <Panel className="p-8">
                  <p className="text-[13px] text-charcoal-500">
                    No live auction at the moment. Farmers can convert any active lot into a
                    timed auction from the produce screen.
                  </p>
                </Panel>
              )}
            </Reveal>
          </div>
        </div>
      </section>

      {/* ──────────────────── Price references ──────────────────── */}
      <section id="prices" className="border-b border-ivory-300 bg-white">
        <div className="container-x py-14 sm:py-18">
          <div className="grid gap-10 lg:grid-cols-[0.8fr_1.2fr]">
            <Reveal>
              <div>
                <p className="eyebrow">Price intelligence</p>
                <h2 className="mt-3 font-display text-display font-bold text-charcoal">
                  A reference point, not a promise.
                </h2>
                <p className="mt-4 text-[14px] leading-relaxed text-charcoal-500">
                  Mandi Relay shows the most recent published mandi reference price next to the
                  farmer&apos;s ask, so a decision is made with a number in view rather than a guess.
                </p>
                <div className="mt-5 rounded-[6px] border border-warning/25 bg-warning-soft px-3.5 py-3">
                  <p className="text-[11px] font-semibold uppercase tracking-[0.08em] text-warning">
                    About this data
                  </p>
                  <p className="mt-1 text-[12px] leading-relaxed text-charcoal-500">
                    The rows below are clearly labelled sample reference data in Agmarknet format.
                    They are not official quotations and not live transaction prices. A production
                    deployment points the same table at an official feed and keeps the date and
                    source on every row.
                  </p>
                </div>
              </div>
            </Reveal>

            <Reveal delay={0.06}>
              <Panel className="overflow-hidden">
                <div className="overflow-x-auto">
                  <table className="w-full min-w-[480px] border-collapse text-left">
                    <thead>
                      <tr className="border-b border-ivory-300 bg-ivory">
                        {["Commodity", "Market", "Min", "Max", "Modal", "Reported"].map((header) => (
                          <th
                            key={header}
                            scope="col"
                            className="px-3 py-2 text-[10.5px] font-semibold uppercase tracking-[0.08em] text-sage"
                          >
                            {header}
                          </th>
                        ))}
                      </tr>
                    </thead>
                    <tbody className="divide-y divide-ivory-200">
                      {latestRefs.slice(0, 6).map((ref) => (
                        <tr key={ref.id} className="text-[12px]">
                          <td className="px-3 py-2 font-semibold text-charcoal">{ref.commodity}</td>
                          <td className="px-3 py-2 text-charcoal-500">{ref.market}</td>
                          <td className="px-3 py-2 text-charcoal-500 tabular">{formatINR(ref.minPrice)}</td>
                          <td className="px-3 py-2 text-charcoal-500 tabular">{formatINR(ref.maxPrice)}</td>
                          <td className="px-3 py-2 font-semibold text-forest-700 tabular">
                            {formatINR(ref.modalPrice)}
                          </td>
                          <td className="px-3 py-2 text-charcoal-400">
                            {new Intl.DateTimeFormat("en-IN", { day: "numeric", month: "short" }).format(ref.reportDate)}
                          </td>
                        </tr>
                      ))}
                      {latestRefs.length === 0 ? (
                        <tr>
                          <td colSpan={6} className="px-3 py-8 text-center text-[12.5px] text-charcoal-400">
                            No reference data loaded. Run the seed script.
                          </td>
                        </tr>
                      ) : null}
                    </tbody>
                  </table>
                </div>
                <div className="border-t border-ivory-200 bg-ivory px-3 py-2 text-[10.5px] text-charcoal-400">
                  Prices per quintal · Source: sample reference data (Agmarknet format) · Not an official quotation
                </div>
              </Panel>
            </Reveal>
          </div>
        </div>
      </section>

      {/* ──────────────────── Benefits ──────────────────── */}
      <section className="border-b border-ivory-300">
        <div className="container-x py-14 sm:py-18">
          <div className="grid gap-10 lg:grid-cols-2 lg:gap-14">
            <Reveal>
              <div>
                <p className="eyebrow">For farmers</p>
                <h2 className="mt-3 font-display text-title font-bold text-charcoal">
                  Fewer middle hands, more information.
                </h2>
                <ul className="mt-5 space-y-3">
                  <CheckRow>List a harvest in one sentence instead of a form</CheckRow>
                  <CheckRow>See every offer ranked by what actually reaches you</CheckRow>
                  <CheckRow>Transport cost estimated before you accept</CheckRow>
                  <CheckRow>Your phone number stays private until an order exists</CheckRow>
                  <CheckRow>Keep full control: accept, counter, auction or hold</CheckRow>
                </ul>
                <div className="mt-6 grid grid-cols-3 gap-3 border-t border-ivory-300 pt-5">
                  <Stat label="Per-offer view" value="Net" sub="after fee and freight" tone="forest" />
                  <Stat label="Languages" value="3" sub="Hindi, Punjabi, English" />
                  <Stat label="Commitment" value="Opt-in" sub="nothing auto-accepted" />
                </div>
              </div>
            </Reveal>

            <Reveal delay={0.08}>
              <div>
                <p className="eyebrow">For buyers</p>
                <h2 className="mt-3 font-display text-title font-bold text-charcoal">
                  Fresher sourcing without the phone calls.
                </h2>
                <ul className="mt-5 space-y-3">
                  <CheckRow>Filter by commodity, distance, price and availability</CheckRow>
                  <CheckRow>Search by voice: “200 kg onions within 30 km of Mohali”</CheckRow>
                  <CheckRow>Send a binding offer with quantity, price and pickup terms</CheckRow>
                  <CheckRow>Counter directly with the farmer, in one thread</CheckRow>
                  <CheckRow>Bid on timed auctions through the server-validated engine</CheckRow>
                </ul>
                <div className="mt-6 grid grid-cols-3 gap-3 border-t border-ivory-300 pt-5">
                  <Stat label="Listing freshness" value="Live" sub="shown per card" />
                  <Stat label="Search" value="Voice" sub="plus full filters" />
                  <Stat label="Offers" value="Tracked" sub="persisted in the database" />
                </div>
              </div>
            </Reveal>
          </div>
        </div>
      </section>

      {/* ──────────────────── Trust ──────────────────── */}
      <section id="trust" className="border-b border-ivory-300 bg-forest-900 text-ivory">
        <div className="container-x py-14 sm:py-18">
          <div className="grid gap-10 lg:grid-cols-[0.85fr_1.15fr]">
            <Reveal>
              <div>
                <p className="text-[10.5px] font-semibold uppercase tracking-[0.14em] text-ivory/50">
                  Trust and verification
                </p>
                <h2 className="mt-3 font-display text-display font-bold text-ivory">
                  Honest by construction.
                </h2>
                <p className="mt-4 max-w-md text-[14px] leading-relaxed text-ivory/65">
                  This build does not invent testimonials, partnerships or transaction volumes.
                  Sample data is labelled, quality grades are attributed to the seller unless
                  independently checked, and no money moves through the prototype.
                </p>
              </div>
            </Reveal>

            <div className="grid gap-px overflow-hidden rounded-[8px] border border-ivory/15 bg-ivory/15 sm:grid-cols-2">
              {[
                {
                  icon: BadgeCheck,
                  title: "Verification status is visible",
                  body: "Every seller and buyer shows Verified or Unverified. Unverified accounts cannot represent themselves as checked.",
                },
                {
                  icon: ShieldCheck,
                  title: "Row-level access rules",
                  body: "The Postgres schema ships with Row Level Security so a user can only read their own offers, orders and private records.",
                },
                {
                  icon: FileSearch,
                  title: "Moderation and audit trail",
                  body: "Listings carry a moderation state and privileged actions are written to an audit log with actor and metadata.",
                },
                {
                  icon: Bell,
                  title: "Explicit confirmations",
                  body: "Offers, acceptances and bids are never submitted on the user's behalf. Each carries a confirm step and a notification.",
                },
              ].map((item, index) => (
                <Reveal key={item.title} delay={index * 0.05} className="bg-forest-900">
                  <div className="p-5">
                    <item.icon className="size-4 text-gold" strokeWidth={1.8} aria-hidden />
                    <h3 className="mt-4 font-display text-[14px] font-bold text-ivory">{item.title}</h3>
                    <p className="mt-1.5 text-[12px] leading-relaxed text-ivory/60">{item.body}</p>
                  </div>
                </Reveal>
              ))}
            </div>
          </div>
        </div>
      </section>

      {/* ──────────────────── Final CTA ──────────────────── */}
      <section className="relative overflow-hidden">
        <div className="paper pointer-events-none absolute inset-0 opacity-70" aria-hidden />
        <div className="container-x relative py-16 sm:py-20">
          <div className="mx-auto max-w-2xl text-center">
            <Reveal>
              <TrendingUp className="mx-auto size-6 text-forest-600" strokeWidth={1.6} aria-hidden />
              <h2 className="mt-4 font-display text-display font-bold text-charcoal">
                A farmer should not need a course to sell a harvest.
              </h2>
              <p className="mt-4 text-[14.5px] leading-relaxed text-charcoal-500">
                Speak what you have. See who needs it. Make the call with the numbers in front of
                you. That is the whole product.
              </p>
              <div className="mt-7 flex flex-wrap items-center justify-center gap-3">
                <ButtonLink href="/auth?mode=signup&role=farmer" size="lg" icon={<Mic className="size-4" />}>
                  Start selling
                </ButtonLink>
                <ButtonLink href="/marketplace-preview" size="lg" variant="outline" icon={<Store className="size-4" />}>
                  Explore marketplace
                </ButtonLink>
              </div>
              <p className="mt-5 flex flex-wrap items-center justify-center gap-x-4 gap-y-1 text-[11px] text-charcoal-400">
                <span className="inline-flex items-center gap-1">
                  <Wallet className="size-3" aria-hidden /> No payment taken in this build
                </span>
                <span className="inline-flex items-center gap-1">
                  <MapPin className="size-3" aria-hidden /> Mohali · Banur · Kharar · Zirakpur
                </span>
              </p>
            </Reveal>
          </div>
        </div>
      </section>
    </>
  );
}
