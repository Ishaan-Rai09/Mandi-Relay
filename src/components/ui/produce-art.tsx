import { cn } from "@/lib/utils";

/**
 * Produce artwork.
 *
 * Listing tiles use a drawn specimen motif rather than stock photography: it is
 * identical across devices, survives offline caching and never misrepresents a
 * lot with someone else's photo. Real photographs take over automatically when
 * a listing supplies `imageUrl`.
 */

const palettes: Record<string, { bg: string; ink: string; accent: string }> = {
  vegetables: { bg: "#e8efe6", ink: "#1f4d37", accent: "#7ba888" },
  fruits: { bg: "#fbeed9", ink: "#8a5a12", accent: "#e0a94a" },
  grains: { bg: "#f2eddb", ink: "#6b5a24", accent: "#c3a760" },
  pulses: { bg: "#f0e9e0", ink: "#6b4a33", accent: "#b8875f" },
  spices: { bg: "#f8e6dd", ink: "#8a3f21", accent: "#d4835a" },
  other: { bg: "#e9ecea", ink: "#33403a", accent: "#8ba096" },
};

function Motif({ category, ink, accent }: { category: string; ink: string; accent: string }) {
  switch (category) {
    case "fruits":
      return (
        <g>
          <circle cx="80" cy="92" r="34" fill={ink} opacity="0.9" />
          <circle cx="124" cy="108" r="24" fill={accent} />
          <circle cx="60" cy="124" r="16" fill={accent} opacity="0.7" />
          <path d="M80 58c6-14 22-18 34-16-2 14-16 24-30 22z" fill={ink} opacity="0.55" />
        </g>
      );
    case "grains":
      return (
        <g stroke={ink} strokeWidth="3" fill="none" strokeLinecap="round">
          <path d="M96 160V52" />
          <path d="M96 74c-14-4-20-14-20-26 14 0 22 10 20 26zM96 74c14-4 20-14 20-26-14 0-22 10-20 26z" fill={accent} stroke="none" />
          <path d="M96 102c-16-4-22-14-22-28 16 0 24 12 22 28zM96 102c16-4 22-14 22-28-16 0-24 12-22 28z" fill={accent} stroke="none" opacity="0.85" />
          <path d="M96 130c-14-4-20-12-20-24 14 0 22 10 20 24zM96 130c14-4 20-12 20-24-14 0-22 10-20 24z" fill={accent} stroke="none" opacity="0.7" />
        </g>
      );
    case "pulses":
      return (
        <g fill={ink}>
          {[0, 1, 2, 3, 4].map((r) =>
            [0, 1, 2, 3, 4].map((c) => (
              <circle
                key={`${r}-${c}`}
                cx={58 + c * 19}
                cy={66 + r * 19}
                r={r % 2 === c % 2 ? 6.5 : 4.5}
                opacity={0.85 - (r + c) * 0.02}
              />
            )),
          )}
        </g>
      );
    case "spices":
      return (
        <g>
          <path d="M70 70c26 8 44 26 52 52-26-8-44-26-52-52z" fill={ink} opacity="0.85" />
          <path d="M70 70c-6 24 2 46 20 62 10-22 4-46-20-62z" fill={accent} opacity="0.75" />
          <circle cx="130" cy="120" r="7" fill={accent} />
          <circle cx="112" cy="66" r="4" fill={ink} opacity="0.5" />
        </g>
      );
    default:
      // Vegetables: layered leaf forms.
      return (
        <g>
          <path
            d="M96 156c-34-18-44-56-30-92 34 8 52 34 52 66 0 12-6 22-22 26z"
            fill={ink}
            opacity="0.9"
          />
          <path
            d="M96 152c26-16 34-46 24-76-26 8-38 30-38 54 0 10 4 18 14 22z"
            fill={accent}
            opacity="0.8"
          />
          <path d="M96 156c0-32 2-58 8-82" stroke="#fff" strokeWidth="2" opacity="0.35" fill="none" />
        </g>
      );
  }
}

export function ProduceArt({
  category = "other",
  className,
  label,
}: {
  category?: string | null;
  className?: string;
  label?: string;
}) {
  const key = category && palettes[category] ? category : "other";
  const palette = palettes[key];
  const uid = `pa-${key}`;

  return (
    <svg
      viewBox="0 0 192 192"
      className={cn("h-full w-full", className)}
      role={label ? "img" : "presentation"}
      aria-label={label}
      aria-hidden={label ? undefined : true}
      preserveAspectRatio="xMidYMid slice"
    >
      <defs>
        <radialGradient id={`${uid}-g`} cx="32%" cy="26%" r="86%">
          <stop offset="0%" stopColor="#ffffff" stopOpacity="0.85" />
          <stop offset="100%" stopColor={palette.bg} />
        </radialGradient>
        <pattern id={`${uid}-grid`} width="24" height="24" patternUnits="userSpaceOnUse">
          <path d="M24 0H0v24" fill="none" stroke={palette.ink} strokeOpacity="0.06" strokeWidth="1" />
        </pattern>
      </defs>
      <rect width="192" height="192" fill={`url(#${uid}-g)`} />
      <rect width="192" height="192" fill={`url(#${uid}-grid)`} />
      <Motif category={key} ink={palette.ink} accent={palette.accent} />
    </svg>
  );
}

export function ProduceTile({
  category,
  imageUrl,
  alt,
  className,
}: {
  category?: string | null;
  imageUrl?: string | null;
  alt: string;
  className?: string;
}) {
  return (
    <div className={cn("relative overflow-hidden bg-ivory-200", className)}>
      {imageUrl ? (
        // eslint-disable-next-line @next/next/no-img-element
        <img
          src={imageUrl}
          alt={alt}
          className="h-full w-full object-cover"
          loading="lazy"
          decoding="async"
        />
      ) : (
        <ProduceArt category={category} label={alt} />
      )}
    </div>
  );
}
