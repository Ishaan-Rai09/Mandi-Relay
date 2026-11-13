import Link from "next/link";
import type { Metadata } from "next";
import {
  ArrowRight,
  ArrowUpRight,
  ClipboardList,
  Handshake,
  Mic,
  Package,
  Sparkles,
  TrendingUp,
  Users,
  Wallet,
} from "lucide-react";

import { OfferCard } from "@/components/farmer/offer-card";
import { ButtonLink } from "@/components/ui/button";
import { Panel, PanelHeader, Pill, VerifiedBadge } from "@/components/ui/panel";
import { EmptyState, PageHeader, Stat } from "@/components/ui/misc";
import { requireRole } from "@/lib/auth";
import { loadFarmerDashboard } from "@/lib/queries/farmer";
import { formatDate, formatINR, formatNumber, timeAgo } from "@/lib/utils";
import { LISTING_STATUS_LABEL, type ListingStatus } from "@/lib/domain";

export const metadata: Metadata = { title: "Farmer dashboard" };
export const dynamic = "force-dynamic";

function greeting() {
  const hour = new Date().getHours();
  if (hour < 12) return "Good morning";
  if (hour < 17) return "Good afternoon";
  return "Good evening";
}

export default async function FarmerDashboard() {
  const user = await requireRole("FARMER");
  const data = await loadFarmerDashboard(user.id);

  const firstName = user.name.split(" ")[0];
  const topListing = data.activeListings[0];

  return (
    <div className="mx-auto w-full max-w-6xl space-y-5">
      <PageHeader
        eyebrow={new Intl.DateTimeFormat("en-IN", {
          weekday: "long",
          day: "numeric",
          month: "long",
        }).format(new Date())}
        title={`${greeting()}, ${firstName}.`}
        description={
          data.farm?.farmName
            ? `${data.farm.farmName} · ${user.village ?? "Location pending"}, ${user.district ?? ""}`
            : "Set up your farm profile to help buyers find you."
        }
        action={
          <ButtonLink href="/farmer/voice-listing" icon={<Mic className="size-4" />}>
            List produce by voice
          </ButtonLink>
        }
      />

      {/* KPI strip */}
      <Panel className="grid grid-cols-2 divide-ivory-200 sm:grid-cols-4 sm:divide-x">
        <div className="p-4">
          <Stat
            label="Open lots"
            value={data.stats.activeCount}
            sub={`${formatNumber(data.stats.availableKg)} kg available`}
          />
        </div>
        <div className="border-l border-ivory-200 p-4 sm:border-l-0">
          <Stat
            label="Offers waiting"
            value={data.stats.pendingOffers}
            sub={data.stats.pendingOffers > 0 ? `${formatINR(data.stats.pipelineValue)} on the table` : "No live offers"}
            tone={data.stats.pendingOffers > 0 ? "gold" : "default"}
          />
        </div>
        <div className="border-t border-ivory-200 p-4 sm:border-t-0">
          <Stat
            label="Confirmed orders"
            value={data.stats.orderCount}
            sub={`${formatINR(data.stats.grossConfirmed)} gross`}
          />
        </div>
        <div className="border-l border-t border-ivory-200 p-4 sm:border-l-0 sm:border-t-0">
          <Stat
            label="Net received"
            value={formatINR(data.stats.netConfirmed)}
            sub="after fee and freight"
            tone="forest"
          />
        </div>
      </Panel>

      <div className="grid gap-5 lg:grid-cols-[1.5fr_1fr]">
        {/* Left column */}
        <div className="space-y-5">
          {/* Voice CTA */}
          <Panel className="relative overflow-hidden border-forest/25 bg-forest-900 text-ivory">
            <div className="paper pointer-events-none absolute inset-0 opacity-[0.08]" aria-hidden />
            <div className="relative flex flex-wrap items-center justify-between gap-4 p-4 sm:p-5">
              <div className="min-w-0">
                <p className="flex items-center gap-1.5 text-[10.5px] font-semibold uppercase tracking-[0.12em] text-gold">
                  <Sparkles className="size-3" aria-hidden /> Voice listing
                </p>
                <h2 className="mt-1.5 font-display text-[19px] font-bold leading-tight text-ivory">
                  Speak what you have harvested.
                </h2>
                <p className="mt-1 max-w-sm text-[12.5px] leading-relaxed text-ivory/65">
                  Say the produce, quantity, place and date in Hindi, Punjabi or English. Review the
                  extracted listing before it goes live.
                </p>
              </div>
              <ButtonLink
                href="/farmer/voice-listing"
                variant="gold"
                size="md"
                icon={<Mic className="size-4" />}
                className="shrink-0"
              >
                Start speaking
              </ButtonLink>
            </div>
          </Panel>

          {/* Offers */}
          <Panel>
            <PanelHeader
              title="Incoming offers"
              description={
                data.offers.length > 0
                  ? "Ranked by estimated net proceeds, not headline price."
                  : undefined
              }
              action={
                <Link
                  href="/farmer/offers"
                  className="inline-flex items-center gap-1 text-[12px] font-medium text-forest-700 hover:underline"
                >
                  All offers <ArrowRight className="size-3" aria-hidden />
                </Link>
              }
            />
            {data.offers.length === 0 ? (
              <EmptyState
                compact
                icon={<Handshake className="size-4" />}
                title="No offers yet"
                description="Once buyers see your lots, their offers land here with the numbers already worked out."
                action={
                  <ButtonLink href="/farmer/listings" size="sm" variant="outline">
                    Review my lots
                  </ButtonLink>
                }
              />
            ) : (
              <div className="space-y-2.5 p-3">
                {data.offers.slice(0, 3).map((offer) => (
                  <OfferCard key={offer.id} offer={offer} viewer="FARMER" />
                ))}
                {data.offers.length > 3 ? (
                  <Link
                    href="/farmer/offers"
                    className="block rounded-[5px] border border-dashed border-ivory-300 py-2 text-center text-[11.5px] font-medium text-charcoal-500 hover:border-forest/30 hover:text-forest-700"
                  >
                    {data.offers.length - 3} more offer{data.offers.length - 3 === 1 ? "" : "s"}
                  </Link>
                ) : null}
              </div>
            )}
          </Panel>

          {/* Listings table */}
          <Panel>
            <PanelHeader
              title="My produce"
              action={
                <Link
                  href="/farmer/listings"
                  className="inline-flex items-center gap-1 text-[12px] font-medium text-forest-700 hover:underline"
                >
                  Manage <ArrowRight className="size-3" aria-hidden />
                </Link>
              }
            />
            {data.listings.length === 0 ? (
              <EmptyState
                compact
                icon={<Package className="size-4" />}
                title="Nothing listed yet"
                description="Your first listing takes about thirty seconds by voice."
                action={
                  <ButtonLink href="/farmer/voice-listing" size="sm" icon={<Mic className="size-3.5" />}>
                    List by voice
                  </ButtonLink>
                }
              />
            ) : (
              <div className="overflow-x-auto">
                <table className="w-full min-w-[520px] text-left">
                  <thead>
                    <tr className="border-b border-ivory-200">
                      {["Produce", "Available", "Ask", "Status", "Added"].map((header) => (
                        <th
                          key={header}
                          scope="col"
                          className="px-3.5 py-2 text-[10px] font-semibold uppercase tracking-[0.08em] text-sage"
                        >
                          {header}
                        </th>
                      ))}
                    </tr>
                  </thead>
                  <tbody className="divide-y divide-ivory-100">
                    {data.listings.slice(0, 6).map((listing) => (
                      <tr key={listing.id} className="text-[12.5px] hover:bg-ivory/60">
                        <td className="px-3.5 py-2.5">
                          <Link href={`/farmer/listings/${listing.id}`} className="font-semibold text-charcoal hover:text-forest-700">
                            {listing.commodity}
                          </Link>
                          <span className="ml-1.5 text-[10.5px] text-charcoal-400">
                            {listing.location}
                          </span>
                          
                        </td>
                        <td className="px-3.5 py-2.5 text-charcoal-500 tabular">
                          {formatNumber(listing.availableQuantity)} / {formatNumber(listing.quantity)} kg
                        </td>
                        <td className="px-3.5 py-2.5 font-medium text-charcoal tabular">
                          {formatINR(listing.askingPrice)}/kg
                        </td>
                        <td className="px-3.5 py-2.5">
                          <Pill
                            tone={
                              listing.status === "ACTIVE"
                                ? "success"
                                : listing.status === "RESERVED"
                                  ? "gold"
                                  : "neutral"
                            }
                          >
                            {listing.auction?.status === "LIVE"
                              ? "In auction"
                              : LISTING_STATUS_LABEL[listing.status as ListingStatus]}
                          </Pill>
                        </td>
                        <td className="px-3.5 py-2.5 text-[11px] text-charcoal-400">
                          {timeAgo(listing.createdAt)}
                        </td>
                      </tr>
                    ))}
                  </tbody>
                </table>
              </div>
            )}
          </Panel>

          {/* Orders */}
          <Panel>
            <PanelHeader
              title="Recent transactions"
              action={
                <Link href="/farmer/orders" className="inline-flex items-center gap-1 text-[12px] font-medium text-forest-700 hover:underline">
                  All orders <ArrowRight className="size-3" aria-hidden />
                </Link>
              }
            />
            {data.orders.length === 0 ? (
              <EmptyState
                compact
                icon={<ClipboardList className="size-4" />}
                title="No confirmed orders"
                description="When you accept an offer, the order and its net proceeds appear here."
              />
            ) : (
              <ul className="divide-y divide-ivory-100">
                {data.orders.slice(0, 4).map((order) => (
                  <li key={order.id} className="flex flex-wrap items-center justify-between gap-2 px-3.5 py-2.5">
                    <div className="min-w-0">
                      <p className="flex items-center gap-1.5 text-[12.5px] font-medium text-charcoal">
                        {order.listing.commodity}
                        <span className="text-[10.5px] font-normal text-charcoal-400">
                          {formatNumber(order.quantity)} kg
                        </span>
                        
                      </p>
                      <p className="text-[10.5px] text-charcoal-400">
                        {order.orderNo} · {order.buyer.name} · {formatDate(order.createdAt)}
                      </p>
                    </div>
                    <div className="text-right">
                      <p className="text-[12.5px] font-semibold text-forest-800 tabular">
                        {formatINR(order.netToFarmer)}
                      </p>
                      <p className="text-[10px] text-charcoal-400">{order.status.replace("_", " ").toLowerCase()}</p>
                    </div>
                  </li>
                ))}
              </ul>
            )}
          </Panel>
        </div>

        {/* Right column */}
        <div className="space-y-5">
          {/* Market reference */}
          <Panel>
            <PanelHeader
              title="Market reference"
              description="Latest published reference, per kg"
            />
            {data.latestRefs.length === 0 ? (
              <p className="px-4 py-5 text-[12px] leading-relaxed text-charcoal-400">
                No reference price loaded for your commodities yet.
              </p>
            ) : (
              <ul className="divide-y divide-ivory-100">
                {data.latestRefs.map((ref) => {
                  const listing = data.listings.find((l) => l.commodity === ref.commodity);
                  const modalKg = ref.modalPrice / 100;
                  const diff = listing ? ((listing.askingPrice - modalKg) / modalKg) * 100 : null;
                  return (
                    <li key={ref.id} className="px-4 py-2.5">
                      <div className="flex items-center justify-between gap-2">
                        <p className="text-[12.5px] font-medium text-charcoal">{ref.commodity}</p>
                        <p className="text-[12.5px] font-semibold text-forest-700 tabular">
                          {formatINR(modalKg, true)}
                        </p>
                      </div>
                      <div className="mt-0.5 flex items-center justify-between gap-2">
                        <p className="text-[10.5px] text-charcoal-400">{ref.market}</p>
                        {diff != null ? (
                          <span
                            className={`text-[10.5px] ${diff > 2 ? "text-warning" : diff < -2 ? "text-success" : "text-charcoal-400"}`}
                          >
                            your ask {diff > 0 ? "+" : ""}
                            {diff.toFixed(0)}%
                          </span>
                        ) : null}
                      </div>
                    </li>
                  );
                })}
              </ul>
            )}
            <div className="border-t border-ivory-200 bg-ivory px-3.5 py-2">
              <p className="flex items-start gap-1 text-[10px] leading-relaxed text-charcoal-400">
                <TrendingUp className="mt-0.5 size-3 shrink-0" aria-hidden />
                Official Agmarknet feed (Directorate of Marketing &amp; Inspection), reported{" "}
                {data.latestRefs[0] ? formatDate(data.latestRefs[0].reportDate) : "—"}. Wholesale
                reference prices, not a live transaction price.
              </p>
            </div>
          </Panel>

          {/* Nearby buyers */}
          <Panel>
            <PanelHeader title="Buyer activity nearby" description={`Buyers registered in ${topListing?.district ?? user.district ?? "your district"}`} />
            {data.matchedBuyers.length === 0 ? (
              <EmptyState
                compact
                icon={<Users className="size-4" />}
                title="No buyers registered here yet"
                description="Buyers appear once they register in your district."
              />
            ) : (
              <ul className="divide-y divide-ivory-100">
                {data.matchedBuyers.map((buyer) => (
                  <li key={buyer.id} className="flex items-center gap-2.5 px-4 py-2.5">
                    <span className="grid size-7 shrink-0 place-items-center rounded-full bg-ivory-200 text-[9.5px] font-bold text-charcoal-500">
                      {(buyer.business?.businessName ?? buyer.name).slice(0, 2).toUpperCase()}
                    </span>
                    <div className="min-w-0 flex-1">
                      <p className="truncate text-[12px] font-medium text-charcoal">
                        {buyer.business?.businessName ?? buyer.name}
                      </p>
                      <p className="truncate text-[10.5px] text-charcoal-400">
                        {buyer.village ?? buyer.district ?? "Location pending"}
                      </p>
                    </div>
                    <VerifiedBadge verified={buyer.verified} />
                  </li>
                ))}
              </ul>
            )}
            <div className="border-t border-ivory-200 px-3.5 py-2">
              <Link href="/farmer/listings" className="inline-flex items-center gap-1 text-[11.5px] font-medium text-forest-700 hover:underline">
                Publish a lot to reach them <ArrowUpRight className="size-3" aria-hidden />
              </Link>
            </div>
          </Panel>

          {/* Quick links */}
          <Panel className="p-3.5">
            <p className="text-[10.5px] font-semibold uppercase tracking-[0.1em] text-sage">Jump to</p>
            <div className="mt-2 grid grid-cols-2 gap-1.5">
              {[
                // Live auctions are paused; the link returns when the flag is on.
                { href: "/farmer/earnings", label: "Earnings", icon: Wallet },
                { href: "/farmer/orders", label: "Orders", icon: ClipboardList },
                { href: "/farmer/profile", label: "Farm profile", icon: Users },
              ].map((item) => (
                <Link
                  key={item.href}
                  href={item.href}
                  className="flex items-center gap-1.5 rounded-[4px] border border-ivory-300 px-2 py-1.5 text-[11.5px] font-medium text-charcoal-500 transition-colors hover:border-forest/25 hover:text-forest-700"
                >
                  <item.icon className="size-3.5" aria-hidden />
                  {item.label}
                </Link>
              ))}
            </div>
          </Panel>
        </div>
      </div>
    </div>
  );
}
