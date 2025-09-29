# itstitanium Project Progress Log

This file is a **living working document**.  
It tracks setup, troubleshooting, and next steps for the ChatOps + site automation system.

---

## 📌 Current Setup

- **Static site + assets**: `public/index.html`, `public/components.html`, and `public/404.html` align with the 2025 checklist. Shared styling lives in `public/base.css`; interactive behaviors in `public/site.js`.

- **Source-of-truth docs**: Editorial, styling, disclosure, and checklist specs live under `docs/`. FAQ copy is synced from `data/faq-bank.json`.

- **Automation scripts**:
  - `scripts/inject.js` — injects disclosure + FAQ content from internal files.
  - `scripts/enforce.js` — enforces metadata/OG/schema/lazy-loading requirements and logs per-file progress metrics.
  - `scripts/report.js` — prints the "State of Alignment" report for PRs.
  - `scripts/json-sanity.js` — validates `data/*.json` and HTML JSON-LD during CI.
  - `scripts/.align-log.json` — rolling log of the most recent automation run with duration and counts.

- **Package scripts**: `npm run inject`, `npm run enforce`, `npm run align`, and `npm run report` power the local workflow.

- **GitHub Actions**:
  - **ci.yml** — Node 20 job that runs `npm run align`, serves `public/`, validates HTML (html-validate), checks links (lychee), executes Lighthouse CI (3 runs), audits accessibility (pa11y + axe), validates JSON, guards against `https://itstitaniun.com`, and optionally validates the sitemap.
  - **chatops-apply.yml** — triggered by `/apply` comments with a valid `diff` block. Creates a new branch → applies patch → opens PR.
  - **chatops-diagnose.yml** — surfaces payloads and comment bodies for debugging `/apply` failures.

- **Bot identity**: `itstitanium-bot <bot@users.noreply.github.com>` remains the workflow actor.

---

## 📈 Recent Progress — Titanium Cookware Guide pillar (2025-09-29 session)

- Rebuilt `/public/titanium-cookware-guide/index.html` end to end so it aligns with `docs/itstitaniun_styling.txt` and `docs/new-checklist.txt`, keeping the disclosure above the fold and reinforcing the TL;DR, Quick Answer, and Use Case sections called for in the latest specs.
- Confirmed the hero `<picture>` sources now point to the shipped `/assets/img/itstitanium-hero-pans-{800|1200|1600}.webp` set with explicit width/height; additional AVIF/JPG conversions remain a follow-up.
- Layered in the collapsible TOC wired to `public/site.js`, specification benchmarks table with caption/scope attributes, care and cleaning guidance, related links, and "What changed" freshness ledger.
- Added AI-friendly embellishments including the SVG "VS" badge, comparison strip, LinkedIn/Pinterest/WhatsApp share controls, SpeakableSpecification hooks, and an audio TL;DR block with transcript that references `public/assets/audio/titanium-guide-tldr.(mp3|ogg)`.
- Refreshed structured data with BlogPosting, FAQPage (matching new `<details>` FAQs + JSON-LD), HowTo, ItemList, Product schema (Snow Peak Trek 700 Titanium, verifiable attributes only), and updated freshness metadata/dates.
- Established `.github/workflows/make-audio.yml` to generate and commit MP3/OGG narration via espeak + ffmpeg so the TL;DR audio stays in sync from CI.

## ✅ Checklist Tag Status

- DONE — checklist:meta+og+twitter
- DONE — checklist:toc+progress
- DONE — checklist:faq+howto+itemlist
- DONE — checklist:speakable
- DONE — checklist:audio+transcript
- DONE — checklist:svg-vs-comparison
- DONE — checklist:product-schema
- DONE — a11y:table-caption-th-scope
- DONE — freshness:dateModified+stamp

## 🛑 Known Issues

1. **Invalid diff blocks**
   - Error: `patch with only garbage at line 4`.
   - Cause: Comments didn’t use strict Git diff syntax.
   - Fix: Always wrap changes in:
     \`\`\`diff
     - old line
     + new line
     \`\`\`

2. **PowerShell script errors** (earlier image renaming attempts).
   - Root cause: `??` operator not valid in older PowerShell.
   - Status: Parked for now (not blocking web automation).

3. **Pending asset optimization**
   - Hero now points at `/public/assets/img/itstitanium-hero-pans-{800|1200|1600}.webp`; AVIF/JPG derivatives plus final inline art swaps still need to be produced, and richer audio voices remain under evaluation (tracked in `docs/OPERATIONS.md`).

4. **ChatOps `/report` idea**
   - Placeholder command noted in `docs/OPERATIONS.md`; implementation still outstanding.

---

## ✅ What Works

- `/apply` workflow creates branches and PRs when provided a valid fenced diff.
- `/diag` workflow surfaces useful payloads for debugging permission issues.
- `npm run align` is idempotent; rerunning after manual edits yields no diff when pages already match the source of truth.
- `npm run report` mirrors CI output, making it easy to paste the State of Alignment summary into PRs.
- html-validate, lychee, Lighthouse, pa11y, axe, and JSON sanity steps all pass after the most recent automation tune-up.

---

## 🚀 Next Steps

1. **Confirm hero image filenames**
   - Audit `/public/assets/img/` for the final hero renders, then update `<picture>` sources (including AVIF/JPG fallbacks) to match the delivered filenames.

2. **Expand product schema coverage**
   - Add additional verifiable entries such as the T-fal Ultimate Hard Anodized line, keeping claims limited to documentation we can cite.

3. **Evaluate richer narration**
   - Prototype Piper TTS (or comparable) in the audio workflow so the TL;DR sounds more natural than the espeak baseline.

4. **Roll improvements to other pillars**
   - Bring the same FTC placement, audio, share buttons, TOC, and structured data coverage to pages like `/titanium-vs-ceramic/`.

5. **Capture transcripts as assets**
   - Store narration text as `.txt` companions in `/public/assets/audio/` to simplify edits without touching the workflow.

---

## 📖 Instructions for Codex

- To apply changes, leave a comment on any issue/PR starting with `/apply`.  
- Always include a **valid fenced diff block**.
- Example:
    /apply
    ```diff
    - # itstitanium Project Progress Log
    + # itstitanium Project Progress Log (ChatOps smoke test)
    ```
- After the bot opens a PR, pull the branch locally, run `npm run align` and `npm run report`, then push follow-up commits if automation finds new issues.
