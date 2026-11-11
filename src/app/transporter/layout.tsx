import { AppShell } from "@/components/layout/app-shell";
import { requireRole } from "@/lib/auth";

export default async function TransporterLayout({ children }: { children: React.ReactNode }) {
  const user = await requireRole("TRANSPORTER");
  return <AppShell user={user}>{children}</AppShell>;
}
