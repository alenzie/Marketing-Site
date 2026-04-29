# Ophthalytics Marketing-Site — Handoff Bundle

## What's in here

```
handoff_bundle/
├── INSTRUCTIONS.md              ← read this first
├── preview/
│   ├── Current Site.html        ← source of truth for variations
│   ├── Beyond the Eye — Hybrid.html
│   └── Who We Help — Before and After.html
└── assets/
    ├── audiences/               ← drop into public/images/audiences/
    └── sections/                ← drop into public/images/sections/
```

## How to use

1. Open `INSTRUCTIONS.md` — six locked changes, file-by-file.
2. For each change marked "source of truth: preview/...", open that HTML file in a browser, find the section by its comment marker, copy the working markup/CSS/JS verbatim.
3. Copy `assets/audiences/*` → `public/images/audiences/` (new directory).
4. Copy `assets/sections/pakistan-collage.jpg` → `public/images/sections/`.
5. Run `npm run dev` and walk the verification checklist in §Verification at the bottom of INSTRUCTIONS.md.

## Important

The live codebase has drifted from the snapshot the previews were built against. Locate each landmark by its section comment marker, confirm context, then apply. Do not find-and-replace whole files.
