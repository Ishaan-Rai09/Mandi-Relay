import { AppShell } from "@/components/layout/app-shell";
import { requireRole } from "@/lib/auth";

export default async function FarmerLayout({ children }: { children: React.ReactNode }) {
  const user = await requireRole("FARMER");
  return <AppShell user={user}>{children}</AppShell>;
}
