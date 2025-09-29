# Changelog

## 2025-09-29

### Pillar: Titanium Cookware Guide
- Rebuilt `/public/titanium-cookware-guide/index.html` to match `docs/itstitaniun_styling.txt` and `docs/new-checklist.txt`, including hero `<picture>` sources, TL;DR, Quick Answer, collapsible TOC, benchmark table with caption, and refreshed supporting sections.
- Added FTC disclosure, share buttons (LinkedIn, Pinterest, WhatsApp), SVG comparison visuals, FAQs, HowTo steps, product schema for Snow Peak Trek 700 Titanium, speakable markup, and audio TL;DR block with transcript.
- Ensured freshness signals with `<time>` stamp, `meta name="dateModified"`, and JSON-LD dates.

### Audio Workflow
- Added `.github/workflows/make-audio.yml` to synthesize TL;DR narration via espeak + ffmpeg, normalize audio, and commit MP3/OGG outputs.
- Generated `public/assets/audio/titanium-guide-tldr.mp3` and `.ogg` via the workflow for the guide page.

### Checklist Alignment
- Achieved ≥90% compliance with `docs/new-checklist.txt` for the pillar, covering share buttons, product schema, audio/transcript pairing, voice-ready speakable markup, SVG comparison asset, and freshness metadata.

