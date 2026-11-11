"use client";

import { CheckCheck, Gavel, Handshake, Truck, Wallet } from "lucide-react";
import Link from "next/link";
import { useRouter } from "next/navigation";
import { useTransition } from "react";

import { Panel } from "@/components/ui/panel";
import { markAllReadAction, markReadAction } from "@/lib/actions/notifications";
import { cn, timeAgo } from "@/lib/utils";

export interface NotificationItem {
  id: string;
  type: string;
  title: string;
  body: string;
  href: string | null;
  read: boolean;
  createdAt: string;
}

const ICONS: Record<string, typeof Handshake> = {
  OFFER_NEW: Handshake,
  OFFER_COUNTER: Handshake,
  OFFER_ACCEPTED: CheckCheck,
  OFFER_REJECTED: Handshake,
  BID_NEW: Gavel,
  AUCTION_CLOSING: Gavel,
  ORDER_CONFIRMED: Wallet,
  DELIVERY_UPDATE: Truck,
};

export function NotificationList({ items, unread }: { items: NotificationItem[]; unread: number }) {
  const router = useRouter();
  const [pending, startTransition] = useTransition();

  const markAll = () =>
    startTransition(async () => {
      await markAllReadAction();
      router.refresh();
    });

  const markOne = (id: string) =>
    startTransition(async () => {
      await markReadAction(id);
      router.refresh();
    });

  return (
    <Panel className="overflow-hidden">
      <div className="flex items-center justify-between gap-2 border-b border-ivory-200 bg-ivory px-4 py-2.5">
        <p className="text-[10.5px] font-semibold uppercase tracking-[0.1em] text-charcoal-500">
          Recent activity
        </p>
        {unread > 0 ? (
          <button
            type="button"
            onClick={markAll}
            disabled={pending}
            className="text-[11.5px] font-medium text-forest-700 hover:underline disabled:opacity-50"
          >
            Mark all read
          </button>
        ) : null}
      </div>

      <ul className="divide-y divide-ivory-100">
        {items.map((item) => {
          const Icon = ICONS[item.type] ?? Handshake;
          return (
            <li key={item.id} className={cn("relative px-4 py-3", !item.read && "bg-gold-50/40")}>
              <div className="flex gap-2.5">
                <span
                  className={cn(
                    "mt-0.5 grid size-7 shrink-0 place-items-center rounded-full",
                    item.read ? "bg-ivory-200 text-charcoal-400" : "bg-forest-100 text-forest-700",
                  )}
                >
                  <Icon className="size-3.5" aria-hidden />
                </span>
                <div className="min-w-0 flex-1">
                  <div className="flex items-start justify-between gap-2">
                    <p className="text-[12.5px] font-semibold text-charcoal">{item.title}</p>
                    <span className="shrink-0 text-[10px] text-charcoal-400">{timeAgo(item.createdAt)}</span>
                  </div>
                  <p className="mt-0.5 text-[11.5px] leading-relaxed text-charcoal-500">{item.body}</p>
                  <div className="mt-1.5 flex items-center gap-3">
                    {item.href ? (
                      <Link href={item.href} className="text-[11.5px] font-medium text-forest-700 hover:underline">
                        Open
                      </Link>
                    ) : null}
                    {!item.read ? (
                      <button
                        type="button"
                        onClick={() => markOne(item.id)}
                        disabled={pending}
                        className="text-[11px] text-charcoal-400 hover:text-charcoal disabled:opacity-50"
                      >
                        Mark read
                      </button>
                    ) : null}
                  </div>
                </div>
              </div>
              {!item.read ? (
                <span className="absolute left-1.5 top-1/2 size-1.5 -translate-y-1/2 rounded-full bg-gold" aria-hidden />
              ) : null}
            </li>
          );
        })}
      </ul>
    </Panel>
  );
}
