"use client";

import { Download, X } from "lucide-react";
import { useEffect, useState } from "react";

interface BeforeInstallPromptEvent extends Event {
  prompt: () => Promise<void>;
  userChoice: Promise<{ outcome: "accepted" | "dismissed" }>;
}

const DISMISS_KEY = "mr.install.dismissed";

/**
 * Install prompt. Only appears when the browser actually offers installation —
 * no fake banner, and nothing is shown inside an already-installed window.
 */
export function InstallPrompt() {
  const [event, setEvent] = useState<BeforeInstallPromptEvent | null>(null);
  const [hidden, setHidden] = useState(true);

  useEffect(() => {
    if (window.matchMedia("(display-mode: standalone)").matches) return;
    if (window.localStorage.getItem(DISMISS_KEY) === "1") return;

    const handler = (eventEvent: Event) => {
      eventEvent.preventDefault();
      setEvent(eventEvent as BeforeInstallPromptEvent);
      setHidden(false);
    };

    window.addEventListener("beforeinstallprompt", handler);
    return () => window.removeEventListener("beforeinstallprompt", handler);
  }, []);

  if (hidden || !event) return null;

  return (
    <div className="fixed inset-x-3 bottom-20 z-50 sm:left-auto sm:right-4 sm:w-80 lg:bottom-4">
      <div className="flex items-start gap-2.5 rounded-[6px] border border-forest/25 bg-white p-3 shadow-[var(--shadow-e3)]">
        <span className="grid size-8 shrink-0 place-items-center rounded-full bg-forest-50 text-forest-700">
          <Download className="size-4" aria-hidden />
        </span>
        <div className="min-w-0 flex-1">
          <p className="text-[12.5px] font-semibold text-charcoal">Install Mandi Relay</p>
          <p className="mt-0.5 text-[11px] leading-relaxed text-charcoal-500">
            Keeps your saved drafts and cached pages on this device.
          </p>
          <div className="mt-2 flex items-center gap-2">
            <button
              type="button"
              onClick={async () => {
                await event.prompt();
                const choice = await event.userChoice;
                if (choice.outcome === "dismissed") {
                  window.localStorage.setItem(DISMISS_KEY, "1");
                }
                setHidden(true);
              }}
              className="rounded-[3px] bg-forest px-2 py-1 text-[11.5px] font-medium text-white hover:bg-forest-700"
            >
              Install
            </button>
            <button
              type="button"
              onClick={() => {
                window.localStorage.setItem(DISMISS_KEY, "1");
                setHidden(true);
              }}
              className="text-[11.5px] text-charcoal-400 hover:text-charcoal"
            >
              Not now
            </button>
          </div>
        </div>
        <button
          type="button"
          onClick={() => {
            window.localStorage.setItem(DISMISS_KEY, "1");
            setHidden(true);
          }}
          className="rounded p-0.5 text-charcoal-400 hover:text-charcoal"
          aria-label="Dismiss install prompt"
        >
          <X className="size-3.5" />
        </button>
      </div>
    </div>
  );
}
