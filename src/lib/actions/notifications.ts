"use server";

import { revalidatePath } from "next/cache";

import { assertRole } from "@/lib/auth";
import { markAllNotificationsRead, markNotificationRead } from "@/lib/notifications";

export async function markReadAction(id: string) {
  const user = await assertRole(["FARMER", "BUYER", "TRANSPORTER", "ADMIN"]).catch(() => null);
  if (!user) return { ok: false };
  await markNotificationRead(user.id, id);
  revalidatePath("/notifications");
  return { ok: true };
}

export async function markAllReadAction() {
  const user = await assertRole(["FARMER", "BUYER", "TRANSPORTER", "ADMIN"]).catch(() => null);
  if (!user) return { ok: false };
  await markAllNotificationsRead(user.id);
  revalidatePath("/notifications");
  return { ok: true };
}
