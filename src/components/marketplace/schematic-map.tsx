"use client";

import { MapPin, X } from "lucide-react";
import Link from "next/link";
import { useMemo, useState } from "react";

import { cn, formatINR, formatNumber } from "@/lib/utils";

export interface MapPoint {
  id: string;
  commodity: string;
  lat: number | null;
  lng: number | null;
  price: number;
  quantity: number;
  location: string;
  distance: number | null;
  href: string;
  isDemo: boolean;
}

/**
 * Schematic map.
 *
 * Distances are real (haversine) and positions are a true equirectangular
 * projection of the coordinates — but the background is drawn, not a basemap.
 * No map provider token is required and nothing misrepresents a street-level
 * view. Setting NEXT_PUBLIC_MAP_PROVIDER=mapbox swaps this for a real basemap.
 */
export function SchematicMap({
  points,
  origin,
  originLabel,
}: {
  points: MapPoint[];
  origin: { lat: number; lng: number } | null;
  originLabel: string | null;
}) {
  const [selected, setSelected] = useState<string | null>(null);

  const located = useMemo(
    () => points.filter((p): p is MapPoint & { lat: number; lng: number } => p.lat != null && p.lng != null),
    [points],
  );

  const bounds = useMemo(() => {
    const lats = located.map((p) => p.lat);
    const lngs = located.map((p) => p.lng);
    if (origin) {
      lats.push(origin.lat);
      lngs.push(origin.lng);
    }
    if (lats.length === 0) return null;
    const padLat = Math.max(0.05, (Math.max(...lats) - Math.min(...lats)) * 0.25);
    const padLng = Math.max(0.05, (Math.max(...lngs) - Math.min(...lngs)) * 0.25);
    return {
      minLat: Math.min(...lats) - padLat,
      maxLat: Math.max(...lats) + padLat,
      minLng: Math.min(...lngs) - padLng,
      maxLng: Math.max(...lngs) + padLng,
    };
  }, [located, origin]);

  const project = (lat: number, lng: number) => {
    if (!bounds) return { x: 50, y: 50 };
    const x = ((lng - bounds.minLng) / (bounds.maxLng - bounds.minLng)) * 100;
    const y = 100 - ((lat - bounds.minLat) / (bounds.maxLat - bounds.minLat)) * 100;
    return { x: Math.min(96, Math.max(4, x)), y: Math.min(94, Math.max(6, y)) };
  };

  const active = located.find((p) => p.id === selected) ?? null;

  if (!bounds) {
    return (
      <div className="grid h-[380px] place-items-center rounded-[8px] border border-ivory-300 bg-ivory">
        <p className="max-w-xs px-6 text-center text-[12.5px] leading-relaxed text-charcoal-400">
          None of these lots have coordinates yet. Farmers who share a farm location appear here.
        </p>
      </div>
    );
  }

  return (
    <div className="relative overflow-hidden rounded-[8px] border border-ivory-300 bg-[#eef1ea]">
      <svg viewBox="0 0 100 100" className="h-[380px] w-full sm:h-[460px]" preserveAspectRatio="none" aria-hidden>
        <defs>
          <pattern id="map-grid" width="8" height="8" patternUnits="userSpaceOnUse">
            <path d="M8 0H0v8" fill="none" stroke="#183d2b" strokeOpacity="0.07" strokeWidth="0.3" />
          </pattern>
        </defs>
        <rect width="100" height="100" fill="url(#map-grid)" />
        {/* Distant road suggestion, purely decorative */}
        <path d="M-5 68 C 25 60, 45 74, 70 58 S 95 46, 108 52" fill="none" stroke="#183d2b" strokeOpacity="0.12" strokeWidth="1.6" />
        <path d="M18 -5 C 24 25, 14 48, 26 72 S 34 96, 32 108" fill="none" stroke="#183d2b" strokeOpacity="0.1" strokeWidth="1.2" />

        {origin ? (
          (() => {
            const p = project(origin.lat, origin.lng);
            return (
              <g>
                <circle cx={p.x} cy={p.y} r="7" fill="#2a6147" fillOpacity="0.1" />
                <circle cx={p.x} cy={p.y} r="3.4" fill="#2a6147" fillOpacity="0.18" />
                <circle cx={p.x} cy={p.y} r="1.5" fill="#183d2b" />
              </g>
            );
          })()
        ) : null}

        {located.map((point) => {
          const p = project(point.lat, point.lng);
          const isActive = point.id === selected;
          return (
            <g
              key={point.id}
              transform={`translate(${p.x} ${p.y})`}
              className="cursor-pointer"
              onClick={() => setSelected(isActive ? null : point.id)}
              role="button"
              tabIndex={0}
              aria-label={`${point.commodity} at ${point.location}`}
              onKeyDown={(event) => {
                if (event.key === "Enter" || event.key === " ") setSelected(isActive ? null : point.id);
              }}
            >
              <circle r={isActive ? 3.6 : 2.6} fill={isActive ? "#c99420" : "#183d2b"} stroke="#fff" strokeWidth="0.7" />
              {isActive ? <circle r="6" fill="none" stroke="#c99420" strokeWidth="0.5" strokeOpacity="0.6" /> : null}
            </g>
          );
        })}
      </svg>

      <div className="pointer-events-none absolute inset-x-0 top-0 flex items-start justify-between gap-2 p-2.5">
        <p className="rounded-[3px] bg-white/90 px-2 py-1 text-[10px] font-medium text-charcoal-500 backdrop-blur">
          Schematic map · distances are real, streets are not
        </p>
        {originLabel ? (
          <p className="flex items-center gap-1 rounded-[3px] bg-white/90 px-2 py-1 text-[10px] font-medium text-forest-800 backdrop-blur">
            <MapPin className="size-3" aria-hidden /> from {originLabel}
          </p>
        ) : null}
      </div>

      {active ? (
        <div className="absolute bottom-3 left-3 right-3 sm:right-auto sm:w-72">
          <div className="rounded-[6px] border border-ivory-300 bg-white p-3 shadow-[var(--shadow-e3)]">
            <div className="flex items-start justify-between gap-2">
              <div className="min-w-0">
                <p className="truncate text-[13px] font-semibold text-charcoal">{active.commodity}</p>
                <p className="truncate text-[11px] text-charcoal-400">
                  {formatNumber(active.quantity)} kg · {active.location}
                  {active.distance != null ? ` · ${active.distance} km` : ""}
                </p>
              </div>
              <button
                onClick={() => setSelected(null)}
                className="rounded p-0.5 text-charcoal-400 hover:text-charcoal"
                aria-label="Close"
              >
                <X className="size-3.5" />
              </button>
            </div>
            <div className="mt-2 flex items-center justify-between gap-2">
              <span className="text-[12px] font-semibold text-forest-700 tabular">
                {formatINR(active.price)}/kg
              </span>
              <Link
                href={active.href}
                className="rounded-[3px] bg-forest px-2 py-1 text-[11px] font-medium text-white hover:bg-forest-700"
              >
                View lot
              </Link>
            </div>
          </div>
        </div>
      ) : (
        <div className="absolute bottom-3 left-3">
          <p className={cn("rounded-[3px] bg-white/90 px-2 py-1 text-[10.5px] text-charcoal-500 backdrop-blur")}>
            Tap a marker for details · {located.length} located
          </p>
        </div>
      )}
    </div>
  );
}
