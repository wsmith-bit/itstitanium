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

## 📈 Recent Progress — Titanium Cookware Guide pillar (2025-09-25 session)

- Rebuilt the pillar page to match current styling and editorial standards, layering in FTC disclosure placement, TL;DR, Quick Answer, collapsible TOC inside `<details class="toc">`, reading progress bar hook, refreshed FAQs, use-case cards, a captioned spec table, related links, and a "What changed" ledger.
- Upgraded the hero to a `<picture>` element with AVIF, WebP, and JPG fallbacks plus explicit width/height; temporary asset paths live under `/public/assets/img/hero/guide-hero-{600|900|1400}.{avif|webp|jpg}` until the new renders land.
- Added AI- and assistant-friendly patterns: inline SVG "VS" badge, compact SVG comparison strip, consistent anchor IDs, and a TL;DR audio block (transcript included) that currently references `/assets/audio/titanium-guide-tldr.(mp3|ogg)` placeholders.
- Wired a consolidated JSON-LD `@graph` covering Organization, WebSite with SearchAction, WebPage, BreadcrumbList, ImageObject, BlogPosting, FAQPage, HowTo, ItemList, SpeakableSpecification, and a conservative Product schema example for the Snow Peak Trek 700 Titanium mug.
- Introduced LinkedIn, Pinterest, and WhatsApp share buttons (no tracking, `rel="noopener"`), bolstering checklist coverage alongside the audio summary and Product schema. Estimated compliance with `docs/new-checklist.txt` is now ≥ 90% for the pillar.

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
   - Need to finalize hero and inline asset mapping. Placeholder hero set to `/public/assets/img/hero/guide-hero-{600|900|1400}.{avif|webp|jpg}` and audio TL;DR paths `/assets/audio/titanium-guide-tldr.(mp3|ogg)` require confirmed files. Tracked in `docs/OPERATIONS.md` open issues.

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

1. **Automate ChatOps report publishing**
   - Evaluate adding a `/report` workflow that runs `npm run report` and comments the output.

2. **Asset optimization follow-up**
   - Finalize the pending image mapping/renaming work so hero assets match the new naming scheme.

3. **Document deployment path**
   - Capture Cloudflare Pages deploy procedures (prereqs, secrets, branch naming) so they are reproducible.

4. **Quarterly content review**
   - Schedule reminders to refresh `data/faq-bank.json` and `docs/disclosure.txt` against the editorial calendar.

5. **Swap in final media for the pillar**
   - Replace placeholder hero assets and audio files once design delivers the approved renders and narration exports; rerun `npm run align` afterward to confirm no regressions.

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
