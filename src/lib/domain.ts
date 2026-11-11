/**
 * Canonical domain vocabulary for Mandi Relay.
 *
 * Enum-like values are stored as strings in the database so that the same model
 * works on SQLite (local) and Postgres (Supabase). This module is the single
 * source of truth for those values, their labels and their presentation.
 */

export const ROLES = ["FARMER", "BUYER", "TRANSPORTER", "ADMIN"] as const;
export type Role = (typeof ROLES)[number];

export const LANGUAGES = ["en", "hi", "pa"] as const;
export type Language = (typeof LANGUAGES)[number];

export const LANGUAGE_LABELS: Record<Language, string> = {
  en: "English",
  hi: "हिन्दी",
  pa: "ਪੰਜਾਬੀ",
};

export const LISTING_STATUSES = [
  "DRAFT",
  "ACTIVE",
  "RESERVED",
  "SOLD",
  "PAUSED",
] as const;
export type ListingStatus = (typeof LISTING_STATUSES)[number];

export const LISTING_STATUS_LABEL: Record<ListingStatus, string> = {
  DRAFT: "Draft",
  ACTIVE: "Active",
  RESERVED: "Reserved",
  SOLD: "Sold",
  PAUSED: "Paused",
};

export const OFFER_STATUSES = [
  "PENDING",
  "COUNTERED",
  "ACCEPTED",
  "REJECTED",
  "WITHDRAWN",
] as const;
export type OfferStatus = (typeof OFFER_STATUSES)[number];

export const OFFER_STATUS_LABEL: Record<OfferStatus, string> = {
  PENDING: "Awaiting response",
  COUNTERED: "Countered",
  ACCEPTED: "Accepted",
  REJECTED: "Declined",
  WITHDRAWN: "Withdrawn",
};

export const AUCTION_STATUSES = [
  "SCHEDULED",
  "LIVE",
  "CLOSED",
  "AWARDED",
  "CANCELLED",
] as const;
export type AuctionStatus = (typeof AUCTION_STATUSES)[number];

export const AUCTION_STATUS_LABEL: Record<AuctionStatus, string> = {
  SCHEDULED: "Scheduled",
  LIVE: "Live",
  CLOSED: "Closed",
  AWARDED: "Awarded",
  CANCELLED: "Cancelled",
};

export const ORDER_STATUSES = [
  "CONFIRMED",
  "IN_TRANSIT",
  "DELIVERED",
  "COMPLETED",
  "CANCELLED",
] as const;
export type OrderStatus = (typeof ORDER_STATUSES)[number];

export const DELIVERY_STATUSES = [
  "REQUESTED",
  "QUOTED",
  "ASSIGNED",
  "PICKUP_SCHEDULED",
  "PICKED_UP",
  "IN_TRANSIT",
  "DELIVERED",
  "CANCELLED",
] as const;
export type DeliveryStatus = (typeof DELIVERY_STATUSES)[number];

export const DELIVERY_STATUS_LABEL: Record<DeliveryStatus, string> = {
  REQUESTED: "Requested",
  QUOTED: "Quotes received",
  ASSIGNED: "Transporter assigned",
  PICKUP_SCHEDULED: "Pickup scheduled",
  PICKED_UP: "Picked up",
  IN_TRANSIT: "In transit",
  DELIVERED: "Delivered",
  CANCELLED: "Cancelled",
};

export const BUSINESS_TYPES = [
  "RETAILER",
  "RESTAURANT",
  "WHOLESALER",
  "PROCESSOR",
  "OTHER",
] as const;
export type BusinessType = (typeof BUSINESS_TYPES)[number];

export const BUSINESS_TYPE_LABEL: Record<BusinessType, string> = {
  RETAILER: "Vegetable & fruit retailer",
  RESTAURANT: "Restaurant or food business",
  WHOLESALER: "Wholesale buyer / distributor",
  PROCESSOR: "Food processor",
  OTHER: "Other business",
};

export const VEHICLE_TYPES = ["PICKUP", "TEMPO", "TRUCK_6W", "TRUCK_10W"] as const;
export type VehicleType = (typeof VEHICLE_TYPES)[number];

export const VEHICLE_LABEL: Record<VehicleType, string> = {
  PICKUP: "Pickup (up to 1,000 kg)",
  TEMPO: "Tempo (up to 2,500 kg)",
  TRUCK_6W: "6-wheel truck (up to 9,000 kg)",
  TRUCK_10W: "10-wheel truck (up to 16,000 kg)",
};

export const VERIFICATION_LABEL: Record<string, string> = {
  UNVERIFIED: "Unverified",
  PENDING: "Verification pending",
  VERIFIED: "Verified",
};

/** Platform fee applied to confirmed orders. Shown in every net-proceeds view. */
export const PLATFORM_FEE_RATE = 0.015;

/** Rough road-transport cost model, used for estimates only. */
export const TRANSPORT_RATE_PER_KM_PER_TONNE = 7.5;

export const COMMODITY_UNITS = ["kg", "quintal", "tonne", "dozen", "piece"] as const;
export type CommodityUnit = (typeof COMMODITY_UNITS)[number];

export const UNIT_TO_KG: Record<string, number> = {
  kg: 1,
  quintal: 100,
  tonne: 1000,
  dozen: 1,
  piece: 1,
};

export type NotificationType =
  | "OFFER_NEW"
  | "OFFER_COUNTER"
  | "OFFER_ACCEPTED"
  | "OFFER_REJECTED"
  | "BID_NEW"
  | "AUCTION_CLOSING"
  | "ORDER_CONFIRMED"
  | "DELIVERY_UPDATE";

export interface SessionUser {
  id: string;
  name: string;
  phone: string;
  role: Role;
  language: Language;
  state: string | null;
  district: string | null;
  village: string | null;
  verified: boolean;
  isDemo: boolean;
}

export const ROLE_HOME: Record<Role, string> = {
  FARMER: "/farmer/dashboard",
  BUYER: "/buyer/dashboard",
  TRANSPORTER: "/transporter/dashboard",
  ADMIN: "/admin/dashboard",
};

export const ROLE_LABEL: Record<Role, string> = {
  FARMER: "Farmer",
  BUYER: "Buyer",
  TRANSPORTER: "Transporter",
  ADMIN: "Administrator",
};
