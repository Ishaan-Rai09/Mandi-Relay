"use client";

import { List, Loader2, Map, Mic, Search, SlidersHorizontal, Sparkles, X } from "lucide-react";
import { useRouter, useSearchParams } from "next/navigation";
import { useState, useTransition } from "react";

import { Button } from "@/components/ui/button";
import { Input, Segmented, Select } from "@/components/ui/field";
import { useSpeechRecognition } from "@/hooks/use-speech";
import { parseSearchAction } from "@/lib/actions/voice";
import { cn } from "@/lib/utils";

export interface CategoryOption {
  slug: string;
  name: string;
  count: number;
}

const SORTS = [
  { value: "newest", label: "Newest first" },
  { value: "distance", label: "Nearest first" },
  { value: "price_asc", label: "Lowest price" },
  { value: "price_desc", label: "Highest price" },
  { value: "quantity", label: "Largest lot" },
];

export function MarketplaceFilters({
  categories,
  basePath,
  view,
  total,
}: {
  categories: CategoryOption[];
  basePath: string;
  view: "list" | "map";
  total: number;
}) {
  const router = useRouter();
  const params = useSearchParams();
  const [pending, startTransition] = useTransition();
  const [showAll, setShowAll] = useState(false);
  const [voiceOpen, setVoiceOpen] = useState(false);
  const [voiceError, setVoiceError] = useState<string | null>(null);
  const [interpreting, setInterpreting] = useState(false);

  const current = (key: string) => params.get(key) ?? "";
  const activeCategory = current("category");

  const speech = useSpeechRecognition({
    language: "auto",
    onFinal: async (transcript) => {
      setInterpreting(true);
      const response = await parseSearchAction(transcript);
      setInterpreting(false);
      if (!response.ok || !response.parsed) {
        setVoiceError(response.error ?? "Could not understand that search.");
        return;
      }
      const query = response.queryString ? `&${response.queryString}` : "";
      startTransition(() => router.push(`${basePath}?voice=1${query}`));
      setVoiceOpen(false);
    },
  });

  const setParam = (key: string, value: string | null) => {
    const next = new URLSearchParams(params.toString());
    if (value === null || value === "") next.delete(key);
    else next.set(key, value);
    startTransition(() => router.push(`${basePath}?${next.toString()}`));
  };

  const submitSearch = (event: React.FormEvent<HTMLFormElement>) => {
    event.preventDefault();
    const form = new FormData(event.currentTarget);
    const next = new URLSearchParams(params.toString());
    const q = String(form.get("q") ?? "").trim();
    if (q) next.set("q", q);
    else next.delete("q");
    startTransition(() => router.push(`${basePath}?${next.toString()}`));
  };

  const activeCount = ["q", "category", "maxPrice", "minQty", "distance", "place", "availableBy"].filter(
    (key) => params.get(key),
  ).length;

  return (
    <div className="rounded-[8px] border border-ivory-300 bg-white">
      {/* Search row */}
      <div className="flex flex-wrap items-center gap-2 border-b border-ivory-200 p-2.5">
        <form onSubmit={submitSearch} className="relative min-w-0 flex-1">
          <Search className="pointer-events-none absolute left-2.5 top-1/2 size-4 -translate-y-1/2 text-charcoal-400" aria-hidden />
          <Input
            name="q"
            defaultValue={current("q")}
            placeholder="Search produce, variety or place…"
            className="h-9 pl-8 pr-8 text-[13px]"
            aria-label="Search the marketplace"
          />
          {current("q") ? (
            <button
              type="button"
              onClick={() => setParam("q", null)}
              className="absolute right-2 top-1/2 -translate-y-1/2 rounded p-0.5 text-charcoal-400 hover:text-charcoal"
              aria-label="Clear search"
            >
              <X className="size-3.5" />
            </button>
          ) : null}
        </form>

        <Button
          type="button"
          size="sm"
          variant={voiceOpen ? "primary" : "outline"}
          onClick={() => {
            setVoiceOpen((value) => !value);
            if (!voiceOpen) speech.start();
            else speech.stop();
          }}
          icon={<Mic className="size-3.5" />}
        >
          Voice
        </Button>

        <Button
          type="button"
          size="sm"
          variant={showAll ? "primary" : "outline"}
          onClick={() => setShowAll((value) => !value)}
          icon={<SlidersHorizontal className="size-3.5" />}
        >
          Filters{activeCount > 0 ? ` · ${activeCount}` : ""}
        </Button>

        <Segmented
          value={view}
          size="sm"
          onChange={(value) => setParam("view", value === "list" ? null : value)}
          options={[
            { value: "list", label: "List", icon: <List className="size-3" /> },
            { value: "map", label: "Map", icon: <Map className="size-3" /> },
          ]}
        />
      </div>

      {/* Voice panel */}
      {voiceOpen ? (
        <div className="border-b border-ivory-200 bg-forest-50/60 px-3 py-3">
          <div className="flex items-start gap-2.5">
            <span className="mt-0.5 grid size-7 shrink-0 place-items-center rounded-full bg-forest text-white">
              <Mic className="size-3.5" aria-hidden />
            </span>
            <div className="min-w-0 flex-1">
              <p className="text-[12.5px] font-semibold text-charcoal">
                {speech.listening
                  ? "Listening… say what you need"
                  : interpreting
                    ? "Turning that into filters…"
                    : "Voice search"}
              </p>
              <p className="mt-0.5 font-devanagari text-[11.5px] leading-relaxed text-charcoal-500">
                {speech.transcript || speech.interim || "“Find 200 kg of onions within 30 kilometres of Mohali.”"}
              </p>
              {speech.error ? (
                <p className="mt-1 text-[11px] text-warning">{speech.error}</p>
              ) : null}
              {voiceError ? <p className="mt-1 text-[11px] text-danger">{voiceError}</p> : null}
            </div>
            {interpreting ? <Loader2 className="mt-1 size-4 animate-spin text-forest-600" aria-hidden /> : null}
          </div>
        </div>
      ) : null}

      {/* Filter rail */}
      {showAll ? (
        <div className="grid gap-3 border-b border-ivory-200 p-3 sm:grid-cols-2 lg:grid-cols-4">
          <label className="space-y-1">
            <span className="text-[11px] font-medium text-charcoal-500">Commodity category</span>
            <Select
              value={activeCategory}
              onChange={(event) => setParam("category", event.target.value || null)}
              className="h-8 py-0 text-[12.5px]"
            >
              <option value="">All categories</option>
              {categories.map((category) => (
                <option key={category.slug} value={category.slug}>
                  {category.name} ({category.count})
                </option>
              ))}
            </Select>
          </label>

          <label className="space-y-1">
            <span className="text-[11px] font-medium text-charcoal-500">Max price (₹/kg)</span>
            <Input
              type="number"
              min="0"
              step="1"
              defaultValue={current("maxPrice")}
              onChange={(event) => setParam("maxPrice", event.target.value || null)}
              placeholder="Any"
              className="h-8 py-0 text-[12.5px]"
            />
          </label>

          <label className="space-y-1">
            <span className="text-[11px] font-medium text-charcoal-500">Minimum quantity (kg)</span>
            <Input
              type="number"
              min="0"
              step="10"
              defaultValue={current("minQty")}
              onChange={(event) => setParam("minQty", event.target.value || null)}
              placeholder="Any"
              className="h-8 py-0 text-[12.5px]"
            />
          </label>

          <label className="space-y-1">
            <span className="text-[11px] font-medium text-charcoal-500">Within distance (km)</span>
            <Input
              type="number"
              min="1"
              step="5"
              defaultValue={current("distance")}
              onChange={(event) => setParam("distance", event.target.value || null)}
              placeholder="Any"
              className="h-8 py-0 text-[12.5px]"
            />
          </label>

          <label className="space-y-1">
            <span className="text-[11px] font-medium text-charcoal-500">Distance measured from</span>
            <Input
              defaultValue={current("place")}
              onChange={(event) => setParam("place", event.target.value || null)}
              placeholder="Mohali"
              className="h-8 py-0 text-[12.5px]"
            />
          </label>

          <label className="space-y-1">
            <span className="text-[11px] font-medium text-charcoal-500">Available by</span>
            <Select
              value={current("availableBy") ? "soon" : ""}
              onChange={(event) =>
                setParam(
                  "availableBy",
                  event.target.value === "soon"
                    ? new Date(Date.now() + 48 * 3600 * 1000).toISOString()
                    : null,
                )
              }
              className="h-8 py-0 text-[12.5px]"
            >
              <option value="">Any time</option>
              <option value="soon">Next 48 hours</option>
            </Select>
          </label>

          <label className="space-y-1">
            <span className="text-[11px] font-medium text-charcoal-500">Sort by</span>
            <Select
              value={current("sort") || "newest"}
              onChange={(event) => setParam("sort", event.target.value)}
              className="h-8 py-0 text-[12.5px]"
            >
              {SORTS.map((sort) => (
                <option key={sort.value} value={sort.value}>
                  {sort.label}
                </option>
              ))}
            </Select>
          </label>

          <div className="flex items-end">
            <button
              type="button"
              onClick={() => startTransition(() => router.push(basePath))}
              className="h-8 w-full rounded-[4px] border border-ivory-300 text-[12px] font-medium text-charcoal-500 transition-colors hover:border-danger/30 hover:text-danger"
            >
              Reset all filters
            </button>
          </div>
        </div>
      ) : null}

      {/* Category chips */}
      <div className="no-scrollbar flex items-center gap-1.5 overflow-x-auto px-2.5 py-2">
        <button
          type="button"
          onClick={() => setParam("category", null)}
          className={cn(
            "shrink-0 rounded-full border px-2.5 py-1 text-[11.5px] font-medium transition-colors",
            !activeCategory
              ? "border-forest bg-forest text-white"
              : "border-ivory-300 bg-white text-charcoal-500 hover:border-forest/30",
          )}
        >
          All produce
        </button>
        {categories.map((category) => (
          <button
            key={category.slug}
            type="button"
            onClick={() => setParam("category", category.slug)}
            className={cn(
              "shrink-0 rounded-full border px-2.5 py-1 text-[11.5px] font-medium transition-colors",
              activeCategory === category.slug
                ? "border-forest bg-forest text-white"
                : "border-ivory-300 bg-white text-charcoal-500 hover:border-forest/30",
            )}
          >
            {category.name}
            <span className={cn("ml-1 tabular", activeCategory === category.slug ? "text-white/60" : "text-charcoal-400")}>
              {category.count}
            </span>
          </button>
        ))}
        <span className="ml-auto flex shrink-0 items-center gap-1 pl-2 text-[11px] text-charcoal-400">
          {pending ? <Loader2 className="size-3 animate-spin" aria-hidden /> : <Sparkles className="size-3" aria-hidden />}
          {total} lot{total === 1 ? "" : "s"}
        </span>
      </div>
    </div>
  );
}
