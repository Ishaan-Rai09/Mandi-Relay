import "server-only";

import { db } from "@/lib/db";
import type { NotificationType } from "@/lib/domain";

interface NotifyInput {
  userId: string;
  type: NotificationType;
  title: string;
  body: string;
  href?: string;
}

/**
 * Creates an in-app notification. Preferences are stored on the profile later;
 * for now transactional categories (offers, bids, orders) are always delivered
 * because they carry binding commercial state.
 */
export async function notify(input: NotifyInput | NotifyInput[]) {
  const items = Array.isArray(input) ? input : [input];
  if (items.length === 0) return;
  await db.notification.createMany({
    data: items.map((item) => ({
      userId: item.userId,
      type: item.type,
      title: item.title,
      body: item.body,
      href: item.href ?? null,
    })),
  });
}

export async function markNotificationRead(userId: string, id: string) {
  await db.notification.updateMany({
    where: { id, userId },
    data: { readAt: new Date() },
  });
}

export async function markAllNotificationsRead(userId: string) {
  await db.notification.updateMany({
    where: { userId, readAt: null },
    data: { readAt: new Date() },
  });
}
