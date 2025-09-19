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

## Runbooks
- ChatOps Troubleshooting Playbook (high-level): _add here_.

## Open Issues
- [ ] Image mapping & renaming is still pending.
- [ ] Harden /apply validation for malformed diffs (add guard).
- [ ] Cloudflare Pages deploy checks (document steps).

## Decisions Log
- 2025-09-19: Adopted `/write` ChatOps to keep working docs updated via comments.
