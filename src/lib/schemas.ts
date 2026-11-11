import { z } from "zod";

import { BUSINESS_TYPES, LANGUAGES, ROLES, VEHICLE_TYPES } from "@/lib/domain";

const phone = z
  .string()
  .trim()
  .transform((value) => value.replace(/[^\d+]/g, ""))
  .refine((value) => /^\+?\d{10,13}$/.test(value), "Enter a valid Indian mobile number");

const password = z
  .string()
  .min(8, "Use at least 8 characters")
  .max(72, "That password is too long");

export const signInSchema = z.object({
  phone: phone,
  password: z.string().min(1, "Enter your password"),
});

export const signUpSchema = z.object({
  name: z.string().trim().min(2, "Enter your full name").max(80),
  phone: phone,
  password: password,
  role: z.enum(["FARMER", "BUYER", "TRANSPORTER"]),
  language: z.enum(LANGUAGES).default("hi"),
});

export const onboardingSchema = z.object({
  language: z.enum(LANGUAGES),
  state: z.string().trim().min(2, "Select your state"),
  district: z.string().trim().min(2, "Enter your district"),
  village: z.string().trim().min(2, "Enter your village, town or city"),
  lat: z.coerce.number().min(-90).max(90).optional().nullable(),
  lng: z.coerce.number().min(-180).max(180).optional().nullable(),
  farmName: z.string().trim().max(80).optional(),
  sizeAcres: z.coerce.number().min(0).max(100000).optional().nullable(),
  primaryCrops: z.string().trim().max(200).optional(),
  businessName: z.string().trim().max(80).optional(),
  businessType: z.enum(BUSINESS_TYPES).optional(),
  preferredCommodities: z.string().trim().max(200).optional(),
  typicalQuantityKg: z.coerce.number().min(0).max(1_000_000).optional().nullable(),
  deliveryLocations: z.string().trim().max(200).optional(),
  vehicleType: z.enum(VEHICLE_TYPES).optional(),
  capacityKg: z.coerce.number().min(0).max(100_000).optional().nullable(),
  registrationNo: z.string().trim().max(24).optional(),
  serviceAreas: z.string().trim().max(200).optional(),
});

export const listingDraftSchema = z.object({
  commodity: z.string().trim().min(2, "Which produce are you listing?").max(60),
  categorySlug: z.enum(["vegetables", "fruits", "grains", "pulses", "spices", "other"]),
  variety: z.string().trim().max(60).optional(),
  quantity: z.coerce.number().positive("Enter a quantity").max(1_000_000),
  unit: z.enum(["kg", "quintal", "tonne", "dozen", "piece"]).default("kg"),
  askingPrice: z.coerce.number().positive("Enter your asking price").max(1_000_000),
  availableFrom: z.string().min(4, "When is it available?"),
  location: z.string().trim().min(2, "Where is it available?").max(120),
  district: z.string().trim().min(2, "Enter the district").max(80),
  state: z.string().trim().min(2).max(80),
  lat: z.coerce.number().min(-90).max(90).optional().nullable(),
  lng: z.coerce.number().min(-180).max(180).optional().nullable(),
  description: z.string().trim().max(600).optional(),
  grade: z.string().trim().max(12).optional(),
  pickupOnly: z.coerce.boolean().optional(),
});

export const offerSchema = z.object({
  listingId: z.string().uuid(),
  quantity: z.coerce.number().positive("Enter a quantity"),
  pricePerUnit: z.coerce.number().positive("Enter your price per kg"),
  message: z.string().trim().max(500).optional(),
  pickupPreference: z.enum(["PICKUP", "DELIVERY"]).default("PICKUP"),
  deliveryLocation: z.string().trim().max(120).optional(),
  requestsNegotiation: z.coerce.boolean().optional(),
});

export const offerResponseSchema = z.object({
  offerId: z.string().uuid(),
  action: z.enum(["ACCEPT", "REJECT", "COUNTER", "WITHDRAW"]),
  counterPrice: z.coerce.number().positive().optional(),
  counterQuantity: z.coerce.number().positive().optional(),
  message: z.string().trim().max(500).optional(),
});

export const auctionSchema = z.object({
  listingId: z.string().uuid(),
  quantity: z.coerce.number().positive("Enter the lot quantity"),
  startingPrice: z.coerce.number().positive("Enter a starting price"),
  minIncrement: z.coerce.number().positive("Enter a bid increment"),
  durationHours: z.coerce.number().min(0.25).max(168),
  pickupNote: z.string().trim().max(300).optional(),
  buyerCriteria: z.string().trim().max(300).optional(),
});

export const bidSchema = z.object({
  auctionId: z.string().uuid(),
  amount: z.coerce.number().positive("Enter your bid"),
});

export const deliveryRequestSchema = z.object({
  pickupLocation: z.string().trim().min(2, "Enter the pickup location").max(120),
  dropLocation: z.string().trim().min(2, "Enter the delivery location").max(120),
  quantityKg: z.coerce.number().positive("Enter the load weight"),
  distanceKm: z.coerce.number().min(0).max(5000).optional().nullable(),
  pickupAt: z.string().optional(),
  notes: z.string().trim().max(300).optional(),
  orderId: z.string().uuid().optional(),
  listingId: z.string().uuid().optional(),
});

export const deliveryQuoteSchema = z.object({
  requestId: z.string().uuid(),
  amount: z.coerce.number().positive("Enter your quote"),
  etaHours: z.coerce.number().min(0).max(240).optional().nullable(),
  message: z.string().trim().max(300).optional(),
});

export const profileSchema = z.object({
  name: z.string().trim().min(2).max(80),
  language: z.enum(LANGUAGES),
  state: z.string().trim().min(2).max(80),
  district: z.string().trim().min(2).max(80),
  village: z.string().trim().min(2).max(80),
  farmName: z.string().trim().max(80).optional(),
  sizeAcres: z.coerce.number().min(0).max(100000).optional().nullable(),
  primaryCrops: z.string().max(200).optional(),
  businessName: z.string().trim().max(80).optional(),
  businessType: z.enum(BUSINESS_TYPES).optional(),
  preferredCommodities: z.string().max(200).optional(),
  typicalQuantityKg: z.coerce.number().min(0).max(1_000_000).optional().nullable(),
  deliveryLocations: z.string().max(200).optional(),
  vehicleType: z.enum(VEHICLE_TYPES).optional(),
  capacityKg: z.coerce.number().min(0).max(100_000).optional().nullable(),
  registrationNo: z.string().trim().max(24).optional(),
  serviceAreas: z.string().max(200).optional(),
});

export type ActionState = {
  ok: boolean;
  message?: string;
  errors?: Record<string, string[]>;
  data?: Record<string, unknown>;
};

export const IDLE: ActionState = { ok: false };

/** Flattens a ZodError into a field-keyed map for form rendering. */
export function fieldErrors(error: z.ZodError): Record<string, string[]> {
  return error.flatten().fieldErrors as Record<string, string[]>;
}

export function normalisePhone(raw: string) {
  const digits = raw.replace(/[^\d]/g, "").slice(-10);
  return `+91${digits}`;
}

export const ROLES_LIST = ROLES;
