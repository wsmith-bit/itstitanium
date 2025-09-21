# itstitaniun — OPERATIONS (Working Doc)

This is the single source of truth for ChatOps, playbooks, and decisions.

## Index
- [ChatOps Commands](#chatops-commands)
- [Runbooks](#runbooks)
- [Open Issues](#open-issues)
- [Decisions Log](#decisions-log)

## ChatOps Commands
- `/diag` — diagnose perms/PRs. See `.github/workflows/chatops-diagnose.yml`.
- `/apply` + ```diff …``` — apply unified diffs. See `.github/workflows/chatops-apply.yml`.
- `/write` + ```write …``` — append/replace sections of docs (this file). See `.github/workflows/chatops-docs.yml`.
- `/report` — future idea; placeholder until we wire State of Alignment snapshots into ChatOps.

## Runbooks

### ChatOps Troubleshooting Playbook
1. Re-run the command comment with `/diag` to surface payloads and confirm permissions.
2. If `/apply` fails, inspect the Actions log for "patch with only garbage". This usually means the diff block was not fenced or lacked a leading space.
3. Re-run `/apply` with a minimal test diff (for example, tweak `PROGRESS.md`) to confirm the bot can create branches before retrying larger changes.

### Alignment Enforcement Cycle
1. Run `npm run align` locally. This executes `scripts/inject.js` followed by `scripts/enforce.js` and updates `scripts/.align-log.json` with file counts, durations, and change summaries.
2. Serve `public/` (e.g., `npx http-server ./public -p 5173 -c-1`) and spot-check that disclosures, FAQs, and JSON-LD render correctly.
3. Execute `npm run report` to capture the current checklist status. Paste the "State of Alignment" block into PR descriptions when possible.
4. Push commits only after `npm run align` and `npm run report` complete without new warnings. CI re-runs these commands and will fail if non-fixable issues remain.

### State-of-Alignment Snapshotting
1. After CI completes, archive the console output that lists recent `inject.js` and `enforce.js` runs.
2. Update `PROGRESS.md` if the automation revealed new gaps (for example, missing lazy-loading attributes or typos in the canonical domain).

## Automation Inventory
- **scripts/inject.js** — syncs the disclosure module and homepage FAQ list from `docs/disclosure.txt` and `data/faq-bank.json`.
- **scripts/enforce.js** — validates checklist items (metadata, robots, OG/Twitter, JSON-LD, lazy media attributes) and auto-fixes safe changes. Non-fixable failures exit with code 1.
- **scripts/report.js** — prints the State of Alignment summary by reading `docs/new-checklist.txt` and current HTML outputs.
- **scripts/json-sanity.js** — used in CI to ensure `data/*.json` and JSON-LD blocks remain valid JSON.

## Open Issues
- [ ] Image mapping and hero asset renaming is still pending (carry-over from earlier backlog).
- [ ] Harden `/apply` validation for malformed diffs (add guard).
- [ ] Document Cloudflare Pages deploy checks (still to capture).
- [ ] Schedule quarterly review of `data/faq-bank.json` so stale answers do not persist.

## Decisions Log
- 2025-09-19: Adopted `/write` ChatOps to keep working docs updated via comments.
- 2025-09-21: Added progress telemetry to `inject.js` and `enforce.js` and use the resulting summaries in the State of Alignment report.
