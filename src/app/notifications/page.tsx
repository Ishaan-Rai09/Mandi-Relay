import Link from "next/link";
import type { Metadata } from "next";
import { Bell, BellOff } from "lucide-react";

import { AppShell } from "@/components/layout/app-shell";
import { NotificationList } from "@/components/shared/notification-list";
import { Panel } from "@/components/ui/panel";
import { EmptyState } from "@/components/ui/misc";
import { requireUser } from "@/lib/auth";
import { db } from "@/lib/db";

export const metadata: Metadata = { title: "Notifications" };
export const dynamic = "force-dynamic";

export default async function NotificationsPage() {
  const user = await requireUser("/notifications");

  const notifications = await db.notification.findMany({
    where: { userId: user.id },
    orderBy: { createdAt: "desc" },
    take: 50,
  });

  const unread = notifications.filter((item) => !item.readAt).length;

  return (
    <AppShell user={user}>
      <div className="mx-auto w-full max-w-2xl">
        <div className="flex flex-wrap items-end justify-between gap-2">
          <div>
            <p className="eyebrow">Activity</p>
            <h1 className="mt-1.5 font-display text-[24px] font-bold tracking-[-0.03em] text-charcoal">
              Notifications
            </h1>
            <p className="mt-1 text-[12.5px] text-charcoal-500">
              {unread > 0 ? `${unread} unread` : "All caught up"} · offers, bids, orders and delivery
              updates.
            </p>
          </div>
          <Link
            href={
              user.role === "FARMER"
                ? "/farmer/dashboard"
                : user.role === "BUYER"
                  ? "/buyer/dashboard"
                  : user.role === "TRANSPORTER"
                    ? "/transporter/dashboard"
                    : "/admin/dashboard"
            }
            className="text-[12px] font-medium text-forest-700 hover:underline"
          >
            Back to workspace
          </Link>
        </div>

        <div className="mt-4">
          {notifications.length === 0 ? (
            <Panel>
              <EmptyState
                icon={<BellOff className="size-5" />}
                title="Nothing here yet"
                description="You will be notified when a buyer offers on your produce, a farmer counters, an auction closes or a delivery moves."
              />
            </Panel>
          ) : (
            <NotificationList
              items={notifications.map((item) => ({
                id: item.id,
                type: item.type,
                title: item.title,
                body: item.body,
                href: item.href,
                read: Boolean(item.readAt),
                createdAt: item.createdAt.toISOString(),
              }))}
              unread={unread}
            />
          )}
        </div>

        <p className="mt-4 flex items-start gap-1.5 text-[10.5px] leading-relaxed text-charcoal-400">
          <Bell className="mt-0.5 size-3 shrink-0" aria-hidden />
          Notifications are stored in the database and refreshed when you open a page. This build
          does not claim push delivery while the app is closed — the PWA service worker caches
          assets, not live events.
        </p>
      </div>
    </AppShell>
  );
}
