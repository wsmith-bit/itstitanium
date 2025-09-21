#!/usr/bin/env node
const fs = require('fs');
const path = require('path');

const ROOT = path.resolve(__dirname, '..');
const PUBLIC_DIR = path.join(ROOT, 'public');
const DISCLOSURE_PATH = path.join(ROOT, 'docs/disclosure.txt');
const FAQ_PATH = path.join(ROOT, 'data/faq-bank.json');
const LOG_PATH = path.join(__dirname, '.align-log.json');

function readFileSafe(filePath) {
  try {
    return fs.readFileSync(filePath, 'utf8');
  } catch (error) {
    console.error(`Failed to read ${filePath}: ${error.message}`);
    process.exitCode = 1;
    return '';
  }
}

function escapeHtml(value) {
  return value
    .replace(/&/g, '&amp;')
    .replace(/</g, '&lt;')
    .replace(/>/g, '&gt;')
    .replace(/"/g, '&quot;')
    .replace(/'/g, '&#39;');
}

function getHtmlFiles(dir) {
  const entries = fs.readdirSync(dir, { withFileTypes: true });
  const files = [];
  for (const entry of entries) {
    if (entry.name.startsWith('.')) continue;
    const fullPath = path.join(dir, entry.name);
    if (entry.isDirectory()) {
      files.push(...getHtmlFiles(fullPath));
    } else if (entry.isFile() && entry.name.endsWith('.html')) {
      files.push(fullPath);
    }
  }
  return files;
}

function upsertDisclosure(html, disclosureHtml) {
  const sectionRegex = /<section[^>]*id=["']disclosure["'][\s\S]*?<\/section>/i;
  if (sectionRegex.test(html)) {
    return html.replace(sectionRegex, disclosureHtml);
  }
  const mainMatch = html.match(/<main[^>]*>/i);
  if (mainMatch) {
    const insertIndex = mainMatch.index + mainMatch[0].length;
    return html.slice(0, insertIndex) + '\n    ' + disclosureHtml + html.slice(insertIndex);
  }
  const bodyMatch = html.match(/<body[^>]*>/i);
  if (bodyMatch) {
    const insertIndex = bodyMatch.index + bodyMatch[0].length;
    return html.slice(0, insertIndex) + '\n  ' + disclosureHtml + html.slice(insertIndex);
  }
  return html + '\n' + disclosureHtml;
}

function buildFaqHtml(faqItems) {
  if (!faqItems.length) {
    return '            <div class="faq-list"></div>';
  }
  const details = faqItems
    .map((item) => {
      const slug = 'faq-' + item.q.toLowerCase().replace(/[^a-z0-9]+/g, '-').replace(/(^-|-$)/g, '');
      return `              <details id="${slug}"><summary>${escapeHtml(item.q)}</summary><div>${escapeHtml(item.a)}</div></details>`;
    })
    .join('\n');
  return `            <div class="faq-list">\n${details}\n            </div>`;
}

function replaceFaqSection(html, faqHtml) {
  const sectionRegex = /(<section[^>]*id=["']faqs["'][^>]*>)([\s\S]*?)(<\/section>)/i;
  const match = html.match(sectionRegex);
  if (!match) {
    return html;
  }
  return html.replace(sectionRegex, `${match[1]}\n${faqHtml}\n          ${match[3]}`);
}

function readAlignLog() {
  try {
    return JSON.parse(fs.readFileSync(LOG_PATH, 'utf8'));
  } catch (error) {
    return {};
  }
}

function writeAlignLog(data) {
  fs.writeFileSync(LOG_PATH, JSON.stringify(data, null, 2));
}

function main() {
  const disclosureRaw = readFileSafe(DISCLOSURE_PATH).trim();
  const faqRaw = readFileSafe(FAQ_PATH).trim();
  let faqData = [];
  if (faqRaw) {
    try {
      faqData = JSON.parse(faqRaw);
    } catch (error) {
      console.error(`Invalid FAQ JSON: ${error.message}`);
      process.exitCode = 1;
      return;
    }
  }

  const disclosureHtml = `<section class="disclosure" id="disclosure">\n      <p>${escapeHtml(disclosureRaw)}</p>\n    </section>`;
  const faqHtml = buildFaqHtml(faqData);
  const files = getHtmlFiles(PUBLIC_DIR);
  const changes = [];

  for (const file of files) {
    const original = readFileSafe(file);
    let updated = original;
    let disclosureChanged = false;
    let faqChanged = false;
    const relPath = path.relative(ROOT, file);

    const afterDisclosure = upsertDisclosure(updated, disclosureHtml);
    if (afterDisclosure !== updated) {
      updated = afterDisclosure;
      disclosureChanged = true;
    }

    if (path.basename(file) === 'index.html') {
      const afterFaq = replaceFaqSection(updated, faqHtml);
      if (afterFaq !== updated) {
        updated = afterFaq;
        faqChanged = true;
      }
    }

    if (updated !== original) {
      fs.writeFileSync(file, updated);
      if (disclosureChanged) {
        changes.push({ file: relPath, message: 'Updated disclosure block' });
      }
      if (faqChanged) {
        changes.push({ file: relPath, message: 'Synced FAQ module' });
      }
    }
  }

  const log = readAlignLog();
  log.inject = {
    timestamp: new Date().toISOString(),
    changes,
  };
  writeAlignLog(log);

  if (changes.length === 0) {
    console.log('inject: no changes needed.');
  } else {
    console.log('inject:');
    for (const change of changes) {
      console.log(`  • ${change.file}: ${change.message}`);
    }
  }
}

main();
