"use client";

import { ShieldCheck, ShieldX } from "lucide-react";
import { useRouter } from "next/navigation";
import { useTransition } from "react";

import { useToast } from "@/components/ui/toast";
import { setListingModerationAction, setUserVerifiedAction } from "@/lib/actions/admin";

export function VerifyUserButton({
  userId,
  verified,
}: {
  userId: string;
  verified: boolean;
}) {
  const router = useRouter();
  const toast = useToast();
  const [pending, startTransition] = useTransition();

  const run = () => {
    startTransition(async () => {
      const result = await setUserVerifiedAction(userId, !verified);
      if (result.ok) toast.success(result.message ?? "Updated");
      else toast.error("Could not update", result.message);
      router.refresh();
    });
  };

  return (
    <button
      type="button"
      onClick={run}
      disabled={pending}
      className={`inline-flex items-center gap-1 rounded-[3px] border px-1.5 py-0.5 text-[10.5px] font-medium transition-colors disabled:opacity-50 ${
        verified
          ? "border-danger/25 text-danger hover:bg-danger-soft"
          : "border-forest/25 text-forest-700 hover:bg-forest-50"
      }`}
    >
      {verified ? <ShieldX className="size-3" aria-hidden /> : <ShieldCheck className="size-3" aria-hidden />}
      {pending ? "…" : verified ? "Unverify" : "Verify"}
    </button>
  );
}

export function ModerateListingButton({
  listingId,
  moderationStatus,
}: {
  listingId: string;
  moderationStatus: string;
}) {
  const router = useRouter();
  const toast = useToast();
  const [pending, startTransition] = useTransition();

  const run = (status: string) => {
    startTransition(async () => {
      const result = await setListingModerationAction(listingId, status);
      if (result.ok) toast.success(result.message ?? "Updated");
      else toast.error("Could not moderate", result.message);
      router.refresh();
    });
  };

  return (
    <div className="flex gap-1">
      {moderationStatus !== "APPROVED" ? (
        <button
          type="button"
          onClick={() => run("APPROVED")}
          disabled={pending}
          className="rounded-[3px] border border-forest/25 px-1.5 py-0.5 text-[10.5px] font-medium text-forest-700 hover:bg-forest-50 disabled:opacity-50"
        >
          Approve
        </button>
      ) : null}
      {moderationStatus !== "REJECTED" ? (
        <button
          type="button"
          onClick={() => run("REJECTED")}
          disabled={pending}
          className="rounded-[3px] border border-danger/25 px-1.5 py-0.5 text-[10.5px] font-medium text-danger hover:bg-danger-soft disabled:opacity-50"
        >
          Pause
        </button>
      ) : null}
    </div>
  );
}
