import {
  BadgeIndianRupee,
  Bike,
  ClipboardList,
  Handshake,
  LayoutDashboard,
  ListOrdered,
  MapPin,
  Mic,
  Package,
  ReceiptText,
  ShieldCheck,
  Sparkles,
  Store,
  Truck,
  Users,
  Wallet,
} from "lucide-react";
import type { LucideIcon } from "lucide-react";

import type { Role } from "@/lib/domain";
import type { MessageKey } from "@/lib/i18n/messages";

export interface NavItem {
  href: string;
  /** Catalogue key, resolved with `t()` so the label follows the language. */
  labelKey: MessageKey;
  icon: LucideIcon;
  badge?: "offers" | "bids" | "deliveries";
  emphasis?: boolean;
}

export const NAV: Record<Role, { primary: NavItem[]; secondary: NavItem[] }> = {
  FARMER: {
    primary: [
      { href: "/farmer/dashboard", labelKey: "nav.dashboard", icon: LayoutDashboard },
      { href: "/farmer/voice-listing", labelKey: "nav.listByVoice", icon: Mic, emphasis: true },
      { href: "/farmer/listings", labelKey: "nav.myProduce", icon: Package },
      { href: "/farmer/offers", labelKey: "nav.offers", icon: Handshake, badge: "offers" },
      // Live auctions are paused (FEATURES.auctions). Re-enable both entries
      // when NEXT_PUBLIC_ENABLE_AUCTIONS=true.
      // { href: "/farmer/auctions", label: "Auctions", icon: Gavel },
      { href: "/farmer/orders", labelKey: "nav.orders", icon: ClipboardList },
      { href: "/farmer/earnings", labelKey: "nav.earnings", icon: Wallet },
    ],
    secondary: [{ href: "/farmer/profile", labelKey: "nav.farmProfile", icon: Users }],
  },
  BUYER: {
    primary: [
      { href: "/buyer/dashboard", labelKey: "nav.dashboard", icon: LayoutDashboard },
      { href: "/buyer/marketplace", labelKey: "nav.marketplace", icon: Store },
      { href: "/buyer/bids", labelKey: "nav.myOffers", icon: Handshake, badge: "bids" },
      // { href: "/buyer/auctions", label: "Auctions", icon: Gavel },
      { href: "/buyer/orders", labelKey: "nav.orders", icon: ClipboardList },
    ],
    secondary: [{ href: "/buyer/profile", labelKey: "nav.profileSettings", icon: Users }],
  },
  TRANSPORTER: {
    primary: [
      { href: "/transporter/dashboard", labelKey: "nav.dashboard", icon: LayoutDashboard },
      { href: "/transporter/requests", labelKey: "nav.loadBoard", icon: ListOrdered, badge: "deliveries" },
      { href: "/transporter/deliveries", labelKey: "nav.myDeliveries", icon: Truck },
    ],
    secondary: [{ href: "/transporter/profile", labelKey: "nav.vehicleProfile", icon: Bike }],
  },
  ADMIN: {
    primary: [
      { href: "/admin/dashboard", labelKey: "nav.overview", icon: LayoutDashboard },
      { href: "/admin/users", labelKey: "nav.users", icon: Users },
      { href: "/admin/listings", labelKey: "nav.listings", icon: Package },
      { href: "/admin/transactions", labelKey: "nav.transactions", icon: ReceiptText },
      { href: "/admin/reports", labelKey: "nav.reports", icon: BadgeIndianRupee },
    ],
    secondary: [],
  },
};

/** Role headings, translated through the same catalogue. */
export const ROLE_ACCENT: Record<Role, { labelKey: MessageKey; icon: LucideIcon }> = {
  FARMER: { labelKey: "role.FARMER", icon: Sparkles },
  BUYER: { labelKey: "role.BUYER", icon: MapPin },
  TRANSPORTER: { labelKey: "role.TRANSPORTER", icon: Truck },
  ADMIN: { labelKey: "role.ADMIN", icon: ShieldCheck },
};
