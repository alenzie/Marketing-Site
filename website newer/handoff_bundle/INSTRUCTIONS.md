# Claude Code — Implementation Brief (Full Sweep)

**Repo:** `Marketing-Site` (Astro 6 + Tailwind 4 + Motion 12)
**Source of truth for all locked treatments:** `preview/Current Site.html` in this project. Open it, find the variation, copy the working markup/CSS/JS — do not re-derive from scratch.

> **Read this first.** The live codebase has drifted from the snapshot the previews were built against. Locate each landmark by the section comment markers below, confirm context, then apply. Do **not** find-and-replace whole files. If a section has been restructured, adapt the principle, don't force the diff.

---

## Summary of changes (six total)

| # | Where | What |
|---|---|---|
| 1 | `/who-we-help` — audience pills | Replace SVG icons with circular photos via new `photo` prop on `AudiencePill` |
| 2 | `/who-we-help` — Regional Impact | Replace gradient placeholder with real `pakistan-collage.jpg` |
| 3 | `/who-we-help` — overall page restructure | See §3 below |
| 4 | `/` Section 1.5 — Trusted Partners marquee | New banner, locked: **V1 · eye-scan + center radial vignette** |
| 5 | `/` Section 2 — "Beyond the Eye" | New treatment: full-bleed image + multi-feather + soft horizontal wash + translucent backdrop-blur card |
| 6 | `/solutions` — platform transition + "One Platform. Four Deployments." | Two locked pieces: D2 banner ("One foundation. Four purpose-built deployments.") AND animated-orbit diagram |

All locked markup lives inside **`preview/Current Site.html`**. Section markers below tell you exactly where in that file each treatment is.

---

## §1 — `/who-we-help` audience pills become photo pills

**Files:**
- `src/components/content/AudiencePill.astro` — modify in place
- `src/pages/who-we-help.astro` — update each `<AudiencePill>` call
- `public/images/audiences/` — new directory, 9 PNGs (sources in `OPHLX_MEDIA/`)

**Component change:** add optional `photo` and `photoAlt` props. When `photo` is set, render a 52×52 circular `<img>` instead of the icon slot. Keep the icon-slot path as fallback so untouched callers don't break.

```astro
---
interface Props { label: string; photo?: string; photoAlt?: string; }
const { label, photo, photoAlt = '' } = Astro.props;
---
<div class="flex items-center gap-3 px-3 py-2 border border-brand-line rounded-full bg-white transition hover:border-brand-primary-light hover:-translate-y-px hover:shadow-[0_4px_14px_-6px_rgba(30,58,138,0.18)]">
  {photo ? (
    <span class="rounded-full overflow-hidden flex-shrink-0 bg-brand-surface-blue ring-2 ring-brand-surface-blue" style="width:52px;height:52px;">
      <img src={photo} alt={photoAlt} class="w-full h-full object-cover block" loading="lazy" />
    </span>
  ) : (
    <span class="w-7 h-7 rounded-full bg-brand-surface-blue text-brand-primary flex items-center justify-center flex-shrink-0">
      <slot name="icon" />
    </span>
  )}
  <span class="text-[14.5px] font-semibold text-brand-ink leading-tight">{label}</span>
</div>
```

**Asset files** (copy from `OPHLX_MEDIA/` — names exact):
```
public/images/audiences/Primary-Care-Physicians.png
public/images/audiences/Endocrinologists-and-Diabetologists.png
public/images/audiences/Nurses-and-Educators.png
public/images/audiences/Home-Health-Agencies.png
public/images/audiences/Medical-Schools.png
public/images/audiences/Remote-and-Rural-Eye-Clinics.png
public/images/audiences/Ophthalmologists.png
public/images/audiences/Pharmaceutical-Companies.png
public/images/audiences/Device-Manufacturers.png
```

**Label → photo mapping** (some photos intentionally repeat — closest visual fit; do not invent new images):

**Nsight360 block:**
- Primary Care Physicians → `Primary-Care-Physicians.png`
- Endocrinologists & Diabetologists → `Endocrinologists-and-Diabetologists.png`
- Nurses & Care Teams → `Nurses-and-Educators.png`
- Home Health Agencies → `Home-Health-Agencies.png`
- Community Health Centers → `Medical-Schools.png`
- Remote & Rural Clinics → `Remote-and-Rural-Eye-Clinics.png`

**2nd Opinion block:**
- Optometrists → `Ophthalmologists.png`
- Eye Clinics & Optical Chains → `Remote-and-Rural-Eye-Clinics.png`
- Ophthalmology Practices → `Ophthalmologists.png`
- Reading Centers → `Medical-Schools.png`

**Ophthal360 block:**
- Healthcare Systems → `Home-Health-Agencies.png`
- Population Health Programs → `Nurses-and-Educators.png`
- Pharmaceutical Companies → `Pharmaceutical-Companies.png`
- Clinical Research Organizations → `Medical-Schools.png`
- Imaging Centers → `Device-Manufacturers.png`
- Academic & Research Institutions → `Medical-Schools.png`

**Per-call diff pattern:**
```diff
- <AudiencePill label="Primary Care Physicians">
-   <svg slot="icon" ... />
- </AudiencePill>
+ <AudiencePill label="Primary Care Physicians" photo="/images/audiences/Primary-Care-Physicians.png" />
```

---

## §2 — `/who-we-help` Pakistan Regional Impact uses real photo

**File:** `src/pages/who-we-help.astro`, Section 7.
**Asset:** `public/images/sections/pakistan-collage.jpg` (source: `OPHLX_MEDIA/pakistan-collage.jpg`)

Find the placeholder marked `FINAL_ASSET_TBD — Pakistan impact imagery`. Replace the gradient div with:

```astro
<div class="aspect-[4/3] rounded-2xl overflow-hidden shadow-lg">
  <img src="/images/sections/pakistan-collage.jpg"
       alt="Ophthalytics team with The Diabetes Centre partners in Pakistan"
       class="w-full h-full object-cover" loading="lazy" />
</div>
```

---

## §3 — `/who-we-help` overall page restructure

We restructured the page in earlier sessions. The current `who-we-help.astro` you'll find on disk **is** the restructured version — do not undo it. Only apply §1 and §2 within it. If you find a version that doesn't match the structure (Hero → Intro → Nsight360 → Compliance stat → 2nd Opinion → Ophthal360 → Continuum of Care → Regional Impact → Final CTA), pause and ask before changing layout.

---

## §4 — Homepage Trusted Partners marquee (Section 1.5) — LOCKED: V1

**File:** `src/pages/index.astro`. Insert as a new section between the hero and the existing "Beyond the Eye" section (or wherever a "trusted by" row makes sense if the layout has shifted).

**Source of truth:** `preview/Current Site.html`, look for `<!-- SECTION 1.5 — TRUSTED PARTNERS MARQUEE — VARIATIONS LAB -->` and the block marked `<!-- ===== V1 · Eye-scan + center radial vignette to brighten the middle ===== -->`. Copy:

1. The `.tp-band` / `.tp-marquee` / `.tp-track` / `.tp-logo` CSS primitives (the shared marquee block, NOT the variation switcher CSS or `.tp-picker`).
2. The V1 markup only (one `<section class="tp-section is-active" data-tp-section="1">` block).
3. The track-population JS that fills `[data-tp-track]` with logos. The preview clones logo objects to make the marquee loop seamlessly — copy this verbatim.

**Discard:** the `.tp-picker` switcher UI, `.tp-section`/`is-active` toggling, all other variation sections (V2–V5).

**Image asset:** the V1 background uses `/images/sections/eye-scan-banner.jpg` — already in `public/images/sections/`. No new asset needed.

**Astro adaptation:** drop the `<style>` block into the page or move into `src/styles/components/trusted-partners.css` and import. The track-population script can be inline `<script>` at the bottom of the section (it runs once on load).

---

## §5 — Homepage "Beyond the Eye" (Section 2) — LOCKED: hybrid treatment

**File:** `src/pages/index.astro`, replace contents of `<!-- SECTION 2 — VISION ("Beyond the Eye") -->`.

**Source of truth:** `preview/Beyond the Eye — Hybrid.html` (standalone reference file in this project — easier to read than the Current Site lab).

**Goal:**
1. Photo bleeds **full-width** across the section (current implementation has it pinned to right half — change this).
2. **Multi-feather:** smooth top + bottom mask so the image dissolves into adjacent sections, no hard horizontal lines.
3. **Soft horizontal white wash** instead of hard fade — heavy white on left for text legibility, transparent on right so photo detail still reads.
4. **Translucent panel** with `backdrop-blur` so photo is faintly visible through the text card.

**Markup pattern:**
```astro
<section class="relative bg-white overflow-hidden isolate py-10">
  <div class="absolute inset-0 z-0 pointer-events-none" aria-hidden="true">
    <img src="/images/sections/dr-ai-computer-screen.jpg" alt=""
         class="absolute inset-0 w-full h-full object-cover object-center md:object-right"
         loading="lazy"
         style="-webkit-mask-image: linear-gradient(to bottom, transparent 0%, black 12%, black 88%, transparent 100%); mask-image: linear-gradient(to bottom, transparent 0%, black 12%, black 88%, transparent 100%);" />
  </div>
  <div class="absolute inset-0 z-[1] pointer-events-none" aria-hidden="true"
       style="background: linear-gradient(to right, rgba(255,255,255,0.92) 0%, rgba(255,255,255,0.78) 30%, rgba(255,255,255,0.35) 55%, rgba(255,255,255,0.10) 75%, rgba(255,255,255,0) 100%);"></div>
  <div class="relative z-[2] max-w-6xl mx-auto px-6 md:px-8 lg:px-12 py-20 md:py-28 grid md:grid-cols-2 gap-12 items-center">
    <div class="bg-white/[0.78] backdrop-blur-md border border-brand-line/70 rounded-2xl p-8 md:p-10 shadow-[0_10px_30px_-12px_rgba(15,44,92,0.12)]">
      <PipeHeading level="h2" data-reveal>Beyond the Eye: A New Frontier in Detection</PipeHeading>
      <div class="mt-6 space-y-5 text-lg text-brand-body leading-relaxed" data-reveal>
        <p>The retina is one of the only places in the body where microvascular and neural structures can be observed directly and noninvasively.</p>
        <p>At Ophthalytics, we are advancing the field of oculomics—where retinal imaging extends beyond eye disease to reveal early indicators of systemic health.</p>
        <p>By combining AI with multimodal data, we enable earlier risk detection, deeper clinical insights, and more connected care.</p>
        <p>This is the future of preventive healthcare—starting with the eye.</p>
      </div>
    </div>
    <div class="hidden md:block"></div>
  </div>
</section>
```

**Critical points (do not skip):**
- `overflow-hidden isolate` on the section — required so absolute layers clip and stacking is contained.
- `py-10` on the section gives the feather room to breathe; without it the fade clips against the boundary.
- Image layer is `inset-0` (full width). This is the key change from the current `right-0 w-full md:w-3/5 lg:w-1/2`.
- Mask: `linear-gradient(to bottom, transparent 0%, black 12%, black 88%, transparent 100%)` — 12% top + bottom feather. Tunable.
- Mobile: `object-center md:object-right` keeps subject visible at narrow viewports.

**Remove:** the existing `right-0 w-full md:w-3/5 lg:w-1/2` image container, the `bg-gradient-to-r from-white via-white/85 to-white/0` gradient veil. Keep the empty `<div class="hidden md:block"></div>` spacer in the grid.

---

## §6 — `/solutions` page: platform transition banner + One Platform Four Deployments

Two locked pieces, applied in order in `src/pages/solutions/index.astro`.

### §6a · Platform transition banner — LOCKED: D2

**Source of truth:** `preview/Current Site.html`, search for `<!-- SECTION 3.5 — PLATFORM TRANSITION (locked: D2 · photo + duotone + stat) -->`. Copy the `.am-band` / `.am-bg` / `.am-content` / `.am-eyebrow` / `.am-quote` CSS and the entire `<section>` that follows it.

**Key visuals:**
- Background: `/images/sections/ai-montage-with-dr-on-pad-LIGHTER-scaled.jpg`, grayscale 0.7 + contrast 1.05
- Navy → cyan duotone gradient overlay (`135deg, rgba(15,35,80,0.85) → rgba(30,58,138,0.78) → rgba(14,127,176,0.65)`)
- Deep multi-stop top + bottom feathers (40px each) so it dissolves into adjacent white sections
- Centered eyebrow "Built on Ocula360" (cyan)
- Headline: **"One foundation. Four purpose-built deployments."** (white, 28→36px responsive)
- 3-stat row underneath: **4+** Diseases detected · **250K+** Patients screened · **<2s** Per-image inference

This banner replaces (or sits between) whatever currently introduces the "One Platform. Four Deployments." section.

### §6b · "One Platform. Four Deployments." — LOCKED: Variant A · Animated Orbit

**Source of truth:** `preview/Current Site.html`, search for `<!-- ============== VARIANT A · ANIMATED ORBIT ============== -->`. The implementation runs ~200 lines including SVG, CSS, and JS — copy verbatim from there.

**What it is:**
- Central Ocula360 orb (gradient-filled, glowing halo, scales/lifts on hover)
- 3 satellite orbs (Nsight360, 2nd Opinion, Ophthal360) on an orbit ring
- Connecting beam lines from foundation → each satellite
- Animated cyan packets traveling along each beam (continuous, staggered phases)
- Concentric orbit rings + radial glow gradient as backdrop
- Cursor-tracking parallax on the whole stage (each layer has `data-depth`; JS reads pointer position and translates layers)
- Each orb is an `<a>` linking to `#page-<product-id>`

**JS dependencies:** vanilla JS, no libs. The packet animation uses `requestAnimationFrame` and reads `data-line` / `data-dur` / `data-phase` attributes on each `.opfdA-packet` circle. The parallax uses pointer events on `#opfdA-stage` and applies transforms to `.opfdA-layer` children. All of this is in the variant block in the preview — copy it as a unit.

**CSS classes used:** `opfdA-foundation`, `opfdA-layer`, `opfdA-packet`, `opfdA-beam`, plus inline Tailwind on the orb wrappers. Keep prefixes intact to avoid collisions.

**Replace:** the existing static SVG diagram (the "Current (Live)" variant in the preview — concentric circles with text labels). Animated Orbit replaces it entirely.

---

## Verification checklist

After applying everything, run `npm run dev` and:

1. **`/who-we-help`** — every audience pill in the three product blocks shows a circular photo (52×52). Hover lifts the pill. No `<svg slot="icon">` remains in those blocks. Pakistan section shows the real collage, not a gradient.
2. **`/`** — Trusted Partners marquee scrolls smoothly across the eye-scan banner, pauses on hover, respects `prefers-reduced-motion`. Logos populate from the JS-driven track.
3. **`/`** — Beyond the Eye section: photo spans full width, top + bottom feather smoothly into adjacent sections (no hard lines), text panel readable on left, photo detail visible on right, panel translucent with blur visible.
4. **`/solutions`** — D2 banner appears with the 3-stat row, deep feathers dissolving into adjacent sections. The Animated Orbit diagram renders, cyan packets travel along beams, hovering an orb lifts it, the whole scene parallaxes when you move the cursor.
5. **No console errors. No 404s.** Mobile (375px wide): all sections legible, marquee continues to scroll, orbit diagram scales down (it's `aspect-square` with `max-w-[640px]`).

---

## Asset paths summary

New files to add to repo:
```
public/images/audiences/Primary-Care-Physicians.png
public/images/audiences/Endocrinologists-and-Diabetologists.png
public/images/audiences/Nurses-and-Educators.png
public/images/audiences/Home-Health-Agencies.png
public/images/audiences/Medical-Schools.png
public/images/audiences/Remote-and-Rural-Eye-Clinics.png
public/images/audiences/Ophthalmologists.png
public/images/audiences/Pharmaceutical-Companies.png
public/images/audiences/Device-Manufacturers.png
public/images/sections/pakistan-collage.jpg
```

All sourced from the `OPHLX_MEDIA/` archive. Already-present assets used (no copy needed): `eye-scan-banner.jpg`, `dr-ai-computer-screen.jpg`, `ai-montage-with-dr-on-pad-LIGHTER-scaled.jpg`.

---

## Working method recommendation

For §4, §5, §6a, §6b — **open `preview/Current Site.html` in your browser**, identify the locked variant by its section marker, then **view source / dev tools** to copy the working markup, CSS, and JS as a coherent unit. The handoff above describes the *what* and *where*; the preview file is the authoritative *how*.
