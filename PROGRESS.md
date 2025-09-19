# itstitanium Project Progress Log

This file is a **living working document**.  
It tracks setup, troubleshooting, and next steps for the ChatOps + site automation system.

---

## 📌 Current Setup

- **Repo assets uploaded**:  
  `base.css`, `site.js`, `components.html`, `brands.json`, `faq-bank.json`, `products-schema.json`, `robots.txt`, `sitemap-starter.xml`, `editorial-standards.txt`, `disclosure.txt`, `new checklist.txt`, `itstitaniun_styling.txt`.

- **GitHub Actions**:
  - **chatops-apply.yml**  
    Triggered by `/apply` comments with a valid `diff` block.  
    Creates a new branch → applies patch → opens PR.
  - **chatops-diagnose.yml**  
    Allows debugging by printing event payloads and showing the comment body.

- **Bot identity**:  
  `itstitanium-bot <bot@users.noreply.github.com>` is configured inside workflows.

---

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

---

## ✅ What Works

- Actions trigger correctly on `/apply`.  
- Branches and PRs are created successfully.  
- Site assets are in repo and structured.  
- Workflow identity errors resolved.

---

## 🚀 Next Steps

1. **Confirm ChatOps loop with a tiny patch**  
   - Example comment on an issue/PR:
     ```
     /apply
     ```diff
     - # itstitanium Project Progress Log
     + # itstitanium Project Progress Log (Updated via ChatOps test)
     ```
   - Expectation: New branch + PR with the update to this file.

2. **Expand patch scope**  
   - Once tested, try updating `site.js`, `base.css`, or HTML files.

3. **Standardize working doc updates**  
   - Always log progress and open issues here.  
   - This ensures ChatGPT and Codex have a consistent reference.

---

## 📖 Instructions for Codex

- To apply changes, leave a comment on any issue/PR starting with `/apply`.  
- Always include a **valid fenced diff block**.  
- Example:
