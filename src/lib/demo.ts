import type { Role } from "@/lib/domain";

/**
 * Seeded demonstration accounts. Published deliberately so a reviewer can walk
 * the whole marketplace flow; every record these accounts create is flagged as
 * demonstration data in the interface.
 */
export interface DemoAccount {
  role: Role;
  label: string;
  name: string;
  phone: string;
  detail: string;
}

export const DEMO_PASSWORD = "demo1234";

export const DEMO_ACCOUNTS: DemoAccount[] = [
  {
    role: "FARMER",
    label: "Farmer A",
    name: "Gurpreet Singh",
    phone: "+919810000001",
    detail: "Kharar · 500 kg tomatoes, 200 kg potatoes live",
  },
  {
    role: "FARMER",
    label: "Farmer B",
    name: "Harjit Kaur",
    phone: "+919810000002",
    detail: "Banur · onions, cauliflower, live auction",
  },
  {
    role: "BUYER",
    label: "Retailer",
    name: "Amit Verma",
    phone: "+919810000011",
    detail: "Verma Fresh Vegetables · Zirakpur",
  },
  {
    role: "BUYER",
    label: "Restaurant",
    name: "Neha Kapoor",
    phone: "+919810000012",
    detail: "Spice Route Kitchens · Chandigarh",
  },
  {
    role: "BUYER",
    label: "Wholesaler",
    name: "Rakesh Yadav",
    phone: "+919810000013",
    detail: "Yadav Wholesale Mandi · Delhi",
  },
  {
    role: "TRANSPORTER",
    label: "Transporter",
    name: "Balwinder Singh",
    phone: "+919810000021",
    detail: "Tempo, 2,500 kg · SAS Nagar",
  },
  {
    role: "ADMIN",
    label: "Administrator",
    name: "Mandi Relay Admin",
    phone: "+919810000099",
    detail: "Moderation and platform oversight",
  },
];
