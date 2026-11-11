"use client";

import { ChevronRight } from "lucide-react";
import { useRouter } from "next/navigation";
import { useTransition } from "react";

import { useToast } from "@/components/ui/toast";
import { updateDeliveryStatusAction } from "@/lib/actions/delivery";

const FLOW: Record<string, { next: string; label: string }[]> = {
  ASSIGNED: [
    { next: "PICKUP_SCHEDULED", label: "Schedule pickup" },
    { next: "CANCELLED", label: "Cancel" },
  ],
  PICKUP_SCHEDULED: [
    { next: "PICKED_UP", label: "Mark picked up" },
    { next: "CANCELLED", label: "Cancel" },
  ],
  PICKED_UP: [
    { next: "IN_TRANSIT", label: "In transit" },
    { next: "CANCELLED", label: "Cancel" },
  ],
  IN_TRANSIT: [
    { next: "DELIVERED", label: "Mark delivered" },
    { next: "CANCELLED", label: "Cancel" },
  ],
  DELIVERED: [],
  CANCELLED: [],
};

export function DeliveryStatusControls({
  deliveryId,
  status,
}: {
  deliveryId: string;
  status: string;
}) {
  const router = useRouter();
  const toast = useToast();
  const [pending, startTransition] = useTransition();
  const options = FLOW[status] ?? [];

  if (options.length === 0) {
    return <span className="text-[10.5px] text-charcoal-400">No further action</span>;
  }

  const run = (next: string) => {
    startTransition(async () => {
      const result = await updateDeliveryStatusAction(deliveryId, next);
      if (result.ok) toast.success("Status updated", result.message);
      else toast.error("Could not update", result.message);
      router.refresh();
    });
  };

  return (
    <div className="flex flex-wrap gap-1.5">
      {options.map((option) => (
        <button
          key={option.next}
          type="button"
          disabled={pending}
          onClick={() => {
            if (option.next === "CANCELLED" && !window.confirm("Cancel this delivery?")) return;
            run(option.next);
          }}
          className={`inline-flex items-center gap-0.5 rounded-[3px] border px-1.5 py-0.5 text-[10.5px] font-medium transition-colors disabled:opacity-50 ${
            option.next === "CANCELLED"
              ? "border-danger/25 text-danger hover:bg-danger-soft"
              : "border-forest/25 text-forest-700 hover:bg-forest-50"
          }`}
        >
          {option.label}
          <ChevronRight className="size-3" aria-hidden />
        </button>
      ))}
    </div>
  );
}
