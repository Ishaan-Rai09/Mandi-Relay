import type { Metadata } from "next";
import Link from "next/link";

import { VerifyUserButton } from "@/components/admin/admin-actions";
import { Panel, Pill } from "@/components/ui/panel";
import { PageHeader } from "@/components/ui/misc";
import { requireRole } from "@/lib/auth";
import { db } from "@/lib/db";
import { ROLE_LABEL, type Role } from "@/lib/domain";
import { formatDate, formatNumber, maskPhone } from "@/lib/utils";

export const metadata: Metadata = { title: "Users" };
export const dynamic = "force-dynamic";

export default async function AdminUsersPage({
  searchParams,
}: {
  searchParams: Promise<{ role?: string; verified?: string }>;
}) {
  await requireRole("ADMIN");
  const { role, verified } = await searchParams;

  const users = await db.user.findMany({
    where: {
      ...(role && role !== "ALL" ? { role } : {}),
      ...(verified === "false" ? { verified: false } : verified === "true" ? { verified: true } : {}),
    },
    include: {
      farm: true,
      business: true,
      transporter: true,
      _count: { select: { listings: true, offers: true, buyerOrders: true } },
    },
    orderBy: [{ role: "asc" }, { createdAt: "desc" }],
  });

  const roles: (Role | "ALL")[] = ["ALL", "FARMER", "BUYER", "TRANSPORTER", "ADMIN"];

  return (
    <div className="mx-auto w-full max-w-6xl space-y-4">
      <PageHeader
        eyebrow="Administration"
        title="Users"
        description="Verification is a manual review: it confirms the phone and profile details, not the quality of produce."
      />

      <div className="flex flex-wrap items-center gap-1.5">
        {roles.map((item) => {
          const active = (role ?? "ALL") === item;
          return (
            <Link
              key={item}
              href={item === "ALL" ? "/admin/users" : `/admin/users?role=${item}`}
              className={`rounded-full border px-2.5 py-1 text-[11.5px] font-medium transition-colors ${
                active
                  ? "border-forest bg-forest text-white"
                  : "border-ivory-300 bg-white text-charcoal-500 hover:border-forest/30"
              }`}
            >
              {item === "ALL" ? "All users" : ROLE_LABEL[item as Role]}
            </Link>
          );
        })}
        <Link
          href="/admin/users?verified=false"
          className="rounded-full border border-ivory-300 bg-white px-2.5 py-1 text-[11.5px] font-medium text-charcoal-500 hover:border-warning/40 hover:text-warning"
        >
          Unverified only
        </Link>
      </div>

      <Panel>
        <div className="overflow-x-auto">
          <table className="w-full min-w-[820px] text-left">
            <thead>
              <tr className="border-b border-ivory-200 bg-ivory/60">
                {["Account", "Role", "Location", "Activity", "Contact", "Joined", "Verification"].map(
                  (header) => (
                    <th
                      key={header}
                      scope="col"
                      className="px-3.5 py-2 text-[10px] font-semibold uppercase tracking-[0.08em] text-sage"
                    >
                      {header}
                    </th>
                  ),
                )}
              </tr>
            </thead>
            <tbody className="divide-y divide-ivory-100">
              {users.map((user) => (
                <tr key={user.id} className="text-[12px] hover:bg-ivory/50">
                  <td className="px-3.5 py-2.5">
                    <p className="flex items-center gap-1.5 font-medium text-charcoal">
                      {user.name}
                      
                    </p>
                    <p className="text-[10.5px] text-charcoal-400">
                      {user.farm?.farmName ?? user.business?.businessName ?? "—"}
                    </p>
                  </td>
                  <td className="px-3.5 py-2.5">
                    <Pill tone={user.role === "ADMIN" ? "forest" : "neutral"}>
                      {ROLE_LABEL[user.role as Role]}
                    </Pill>
                  </td>
                  <td className="px-3.5 py-2.5 text-charcoal-500">
                    {[user.village, user.district].filter(Boolean).join(", ") || "—"}
                  </td>
                  <td className="px-3.5 py-2.5 text-[11px] text-charcoal-500">
                    {user.role === "FARMER"
                      ? `${formatNumber(user._count.listings)} lots`
                      : user.role === "BUYER"
                        ? `${formatNumber(user._count.offers)} offers · ${formatNumber(user._count.buyerOrders)} orders`
                        : user.transporter
                          ? `${user.transporter.vehicleType} · ${formatNumber(user.transporter.capacityKg)} kg`
                          : "—"}
                  </td>
                  <td className="px-3.5 py-2.5 font-mono text-[10.5px] text-charcoal-400">
                    {maskPhone(user.phone)}
                  </td>
                  <td className="px-3.5 py-2.5 text-[11px] text-charcoal-400">{formatDate(user.createdAt)}</td>
                  <td className="px-3.5 py-2.5">
                    <div className="flex items-center gap-1.5">
                      <Pill tone={user.verified ? "success" : "neutral"}>
                        {user.verified ? "Verified" : "Unverified"}
                      </Pill>
                      <VerifyUserButton userId={user.id} verified={user.verified} />
                    </div>
                  </td>
                </tr>
              ))}
            </tbody>
          </table>
        </div>
      </Panel>

      <p className="text-[11px] leading-relaxed text-charcoal-400">
        Phone numbers are masked even in the admin table. Full contact details are only exposed
        through audited support tooling, not the console screen.
      </p>
    </div>
  );
}
