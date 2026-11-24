# Hyperframes Composition Brief: Mandi Relay

## Objective
Create a short launch-style brag video for Mandi Relay.

## Output
- Composition directory: `brag-output/composition/`
- Rendered video: `brag-output/brag.mp4`
- Format: landscape — 1920x1080
- Duration: 20.0 seconds

## Source Material
- Project root: `E:\Projects\mandi`
- Primary files read: `src/app/(public)/page.tsx`, `src/app/globals.css`,
  `src/components/marketing/hero-voice-demo.tsx`, `src/components/layout/wordmark.tsx`,
  `src/components/marketplace/listing-card.tsx`, `README.md`
- Product name: Mandi Relay
- Tagline / strongest claim: "Your Produce. Your Market. Your Voice."
- Key UI or visual moment to recreate: the Voice Listing panel from the hero — mic pulse,
  live waveform, Hinglish transcript, and the five-field structured extraction column.
- Copy that must appear verbatim:
  - ONE SENTENCE.
  - That's the entire listing form.
  - Your Produce. Your Market. Your Voice.
  - Mere paas kal subah 500 kilo fresh tomatoes available hain. Main Mohali mein hoon.
    Mujhe 20 rupaye kilo se achha rate chahiye.
  - Tomatoes / 500 kg / Tomorrow, morning / Mohali, Punjab / ₹20+ per kg
  - You receive ₹10,790
  - No payment taken in this build.

## Creative Direction
- Tone preset: default
- Creative direction: hyper-kinetic product launch — a farm-tech ad cut like a consumer
  social spot, confident not corporate
- Interpretation: playful and clean, but fast. Hard cuts, punchy scale changes, one idea
  per beat. Short declarative copy. The speed and confidence carry the energy; never joke
  at the farmer's expense.
- Angle: every agri-tech product asks a farmer to learn a form; Mandi Relay asks them to
  talk. One spoken sentence becomes a market.
- Hook: giant "ONE SENTENCE." over a breathing waveform, then "That's the entire listing
  form." in gold.
- Outro / punchline: relay mark draws, MANDI RELAY slams in, tagline lands, small honesty
  line.
- Avoid:
  - Generic SaaS language
  - Abstract filler visuals
  - Unrelated visual redesign
  - Stock photos of farmers or fields
  - Invented testimonials, stats or partnerships

## Visual Identity
- Background: `#0e2419` (forest-950); secondary panel `#132f21`
- Text: `#f5f3ec` (ivory) on dark; `#151a17` (charcoal) on ivory surfaces
- Accent: `#f4b942` (harvest gold)
- Display font: Manrope Variable (copy the local woff2 from
  `node_modules/@fontsource-variable/manrope/files/`)
- Body font: Inter Variable (copy the local woff2 from
  `node_modules/@fontsource-variable/inter/files/`)
- Visual references from the project: relay mark (two converging strokes + gold dot),
  forest/ivory/gold palette, thin hairline rules, tabular numerals, `#f4b942` LIVE tag,
  ivory cards with 1px `#ded9c9` borders, uppercase eyebrow labels with 0.12em tracking.

## Storyboard
Use the storyboard in `brag-output/brag-plan.md` as the creative contract.

Scene summary:
1. Hook — 2.6s — "ONE SENTENCE." + "That's the entire listing form."
2. Speak — 3.6s — Voice Listing panel, Hinglish transcript types, waveform live.
3. Extract — 3.4s — five structured fields snap in, then Listing ready / LIVE.
4. Offers — 3.6s — three buyer offers arrive with net proceeds.
5. Decide — 3.4s — receipt breakdown, cursor clicks Accept, order confirmed.
6. Outro — 3.4s — mark draw, MANDI RELAY, tagline, honesty line.

## Audio
- Audio role: dense rhythmic layer, clean and propulsive
- Audio arc: full from the hook, slight duck under the voice panel, build through offers,
  dip on the receipt, lift on the confirmation bell, final phrase under the wordmark,
  fade out.
- Music: `happy-beats-business-moves-vol-10-by-ende-dot-app.mp3`
- Music treatment: 0.25s fade-in, 0.34 volume; dip to 0.24 during Scene 5; fade out
  19.4→20.0.
- Music cue guidance: bundled preset at
  `C:\Users\Lenovo\.agents\skills\brag\assets\music\cues\happy-beats-business-moves-vol-10-by-ende-dot-app.music-cues.json`.
  Strong cues 15.82s, 18.01s, 18.55s; beat grid ~0.55s apart. Lock the wordmark to 18.01s
  and the honesty line to 18.55s within ±0.15s.
- Audio-reactive treatment: subtle; music RMS drives the forest background glow and the
  ivory panel edge light. No waveform/equalizer graphics.
- Audio-coupled moments:
  - Scene 2 — transcript typing with thinned key ticks
  - Scene 3 — five field chips, one soft tick each
  - Scene 4 — three offer rows, one card-placement sound each
  - Scene 5 — mouse click on Accept, success bell on confirmation
  - Scene 6 — deep bell on the wordmark
- SFX selection guidance: `interface/drop_*` for chips and rows, `ui/mouseclick1` for the
  Accept click, `interface/click_001` for the mic, `impact/impactBell_heavy_000` for the
  wordmark, `impact/impactBell_heavy_003` for order confirmed. Keep high-frequency-risk
  files out of repeated moments.
- SFX analysis guidance:
  `C:\Users\Lenovo\.agents\skills\brag\assets\sfx\sfx-analysis.md`
- Exact SFX choice: choose filenames, timestamps, density and volume after the visual
  animation exists.
- Audio files: copy chosen music and SFX into `brag-output/composition/assets/`

## Hyperframes Instructions
Load `hyperframes-core`, `hyperframes-animation`, `hyperframes-creative`,
`hyperframes-keyframes`, and `hyperframes-cli`. This is the /brag workflow; do not enter
the generic hyperframes intent interview.

Requirements:
- Show at least one real UI, copy, or visual element from the source project.
- Keep all text readable in the final render; use the reading-time floor.
- Keep the video within 15-25 seconds.
- Include the planned music/SFX layer.
- Treat /brag audio notes as guidance, not a fixed cue sheet.
- Major reveals may move toward nearby strong cues within ±0.15s; smaller entrances within
  ±0.10s. Use only 1-3 strong cue locks.
- Use local assets for audio and fonts.
- Run `hyperframes check` before render.
- Keep creation and rendering local.
