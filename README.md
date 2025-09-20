# itstitanium

Titanium cookware knowledge hub and static site. This repo hosts the content, templates, and CI needed to publish an accessible, SEO-sound site about titanium cookware.

> **Why this exists**  
> People search for fast, trustworthy answers on titanium cookware. This project aims to provide clear guides, unbiased comparisons, and carefully sourced claims with strong accessibility and performance baselines.

## Quick start

```bash
# clone
git clone https://github.com/wsmith-bit/itstitanium.git
cd itstitanium

# serve (any static server works)
# Option A: Node
npx http-server ./public -p 5173 -c-1

# Option B: Python
python3 -m http.server --directory public 5173
Open http://localhost:5173/ to preview.

Project layout
bash
Copy code
.
├─ public/            # production assets (index.html, images, css/js, sitemap.xml, robots.txt)
├─ docs/              # documentation and planning notes
├─ scripts/           # build/test/deploy helpers
├─ .github/workflows/ # CI pipelines
└─ README.md
Note: Binary utilities (e.g., ExifTool) should not be tracked in git. Prefer downloading them as part of a CI step or attach them to Releases.

Accessibility, performance, and SEO
Automated in CI: HTML validation, link checks, Lighthouse CI (PWA/SEO/Performance/Best Practices), pa11y + axe-core audits, JSON-LD/schema lint, and Markdown/spell lint.

Manual spot checks encouraged with a screen reader (NVDA/VoiceOver) and keyboard navigation.

Contributing
Open an issue describing the change.

Create a branch, commit small, test locally (npm run lint if present).

Submit a PR; ensure CI is green.

Development helpers (optional)
bash
Copy code
# lint markdown & spelling
npx markdownlint-cli2 '**/*.md'
npx cspell "public/**/*.html" "**/*.md"

# run pa11y locally
npx pa11y http://localhost:5173/
Security
Please do not submit sensitive info in issues. Report security concerns privately via repository owner.

License
MIT (or project’s chosen license). Add a LICENSE file at the repo root.
