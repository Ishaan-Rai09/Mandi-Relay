import { AppShell } from "@/components/layout/app-shell";
import { requireRole } from "@/lib/auth";

export default async function BuyerLayout({ children }: { children: React.ReactNode }) {
  const user = await requireRole("BUYER");
  return <AppShell user={user}>{children}</AppShell>;
}
