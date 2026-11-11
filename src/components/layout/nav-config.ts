import {
  BadgeIndianRupee,
  Bike,
  ClipboardList,
  Gavel,
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

export interface NavItem {
  href: string;
  label: string;
  icon: LucideIcon;
  badge?: "offers" | "bids" | "deliveries";
  emphasis?: boolean;
}

export const NAV: Record<Role, { primary: NavItem[]; secondary: NavItem[] }> = {
  FARMER: {
    primary: [
      { href: "/farmer/dashboard", label: "Dashboard", icon: LayoutDashboard },
      { href: "/farmer/voice-listing", label: "List by voice", icon: Mic, emphasis: true },
      { href: "/farmer/listings", label: "My produce", icon: Package },
      { href: "/farmer/offers", label: "Offers", icon: Handshake, badge: "offers" },
      { href: "/farmer/auctions", label: "Auctions", icon: Gavel },
      { href: "/farmer/orders", label: "Orders", icon: ClipboardList },
      { href: "/farmer/earnings", label: "Earnings", icon: Wallet },
    ],
    secondary: [{ href: "/farmer/profile", label: "Farm profile", icon: Users }],
  },
  BUYER: {
    primary: [
      { href: "/buyer/dashboard", label: "Dashboard", icon: LayoutDashboard },
      { href: "/buyer/marketplace", label: "Marketplace", icon: Store },
      { href: "/buyer/bids", label: "My offers", icon: Handshake, badge: "bids" },
      { href: "/buyer/auctions", label: "Auctions", icon: Gavel },
      { href: "/buyer/orders", label: "Orders", icon: ClipboardList },
    ],
    secondary: [{ href: "/buyer/profile", label: "Business profile", icon: Users }],
  },
  TRANSPORTER: {
    primary: [
      { href: "/transporter/dashboard", label: "Dashboard", icon: LayoutDashboard },
      { href: "/transporter/requests", label: "Load board", icon: ListOrdered, badge: "deliveries" },
      { href: "/transporter/deliveries", label: "My deliveries", icon: Truck },
    ],
    secondary: [{ href: "/transporter/profile", label: "Vehicle profile", icon: Bike }],
  },
  ADMIN: {
    primary: [
      { href: "/admin/dashboard", label: "Overview", icon: LayoutDashboard },
      { href: "/admin/users", label: "Users", icon: Users },
      { href: "/admin/listings", label: "Listings", icon: Package },
      { href: "/admin/transactions", label: "Transactions", icon: ReceiptText },
      { href: "/admin/reports", label: "Reports", icon: BadgeIndianRupee },
    ],
    secondary: [],
  },
};

export const MOBILE_LABELS: Partial<Record<string, string>> = {
  "/farmer/voice-listing": "List",
  "/buyer/marketplace": "Market",
  "/transporter/requests": "Loads",
};

export const ROLE_ACCENT: Record<Role, { label: string; icon: LucideIcon }> = {
  FARMER: { label: "Farmer workspace", icon: Sparkles },
  BUYER: { label: "Buyer workspace", icon: MapPin },
  TRANSPORTER: { label: "Transporter workspace", icon: Truck },
  ADMIN: { label: "Administration", icon: ShieldCheck },
};
