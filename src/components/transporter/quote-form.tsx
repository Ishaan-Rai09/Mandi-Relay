"use client";

import { Send } from "lucide-react";
import { useActionState, useState } from "react";

import { Button } from "@/components/ui/button";
import { Field, Input } from "@/components/ui/field";
import { submitQuoteAction } from "@/lib/actions/delivery";
import { IDLE } from "@/lib/schemas";
import { formatINR } from "@/lib/utils";

export function QuoteForm({
  requestId,
  suggested,
  existing,
}: {
  requestId: string;
  suggested: number;
  existing?: number | null;
}) {
  const [open, setOpen] = useState(false);
  const [state, action, pending] = useActionState(submitQuoteAction, IDLE);
  const [amount, setAmount] = useState(String(existing ?? suggested));

  if (state.ok) {
    return (
      <p className="rounded-[4px] bg-success-soft px-2 py-1 text-[11px] font-medium text-success">
        {state.message} {formatINR(Number(amount))}
      </p>
    );
  }

  if (!open) {
    return (
      <button
        type="button"
        onClick={() => setOpen(true)}
        className="rounded-[3px] border border-forest/25 bg-white px-2 py-1 text-[11px] font-medium text-forest-700 transition-colors hover:bg-forest-50"
      >
        {existing ? "Update quote" : "Quote"}
      </button>
    );
  }

  return (
    <form action={action} className="mt-1.5 space-y-2 rounded-[5px] border border-ivory-300 bg-ivory/70 p-2.5">
      <input type="hidden" name="requestId" value={requestId} />
      <div className="grid gap-2 sm:grid-cols-2">
        <Field label="Your quote" htmlFor={`amount-${requestId}`} hint="₹" required>
          <Input
            id={`amount-${requestId}`}
            name="amount"
            type="number"
            min="1"
            step="50"
            value={amount}
            onChange={(event) => setAmount(event.target.value)}
            className="h-8 text-[12px]"
            required
          />
        </Field>
        <Field label="ETA (hours)" htmlFor={`eta-${requestId}`} hint="optional">
          <Input id={`eta-${requestId}`} name="etaHours" type="number" min="0" step="1" className="h-8 text-[12px]" />
        </Field>
      </div>
      <Field label="Message" htmlFor={`msg-${requestId}`} hint="optional">
        <Input id={`msg-${requestId}`} name="message" placeholder="Vehicle, loading help, timing" className="h-8 text-[12px]" />
      </Field>
      {state.message && !state.ok ? (
        <p className="text-[11px] text-danger" role="alert">
          {state.message}
        </p>
      ) : null}
      <div className="flex items-center gap-2">
        <Button type="submit" size="sm" loading={pending} icon={<Send className="size-3.5" />}>
          Send quote
        </Button>
        <Button type="button" size="sm" variant="ghost" onClick={() => setOpen(false)}>
          Cancel
        </Button>
      </div>
    </form>
  );
}
