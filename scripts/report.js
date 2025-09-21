#!/usr/bin/env node
const fs = require('fs');
const path = require('path');

const ROOT = path.resolve(__dirname, '..');
const PUBLIC_DIR = path.join(ROOT, 'public');
const CHECKLIST_PATH = path.join(ROOT, 'docs/new-checklist.txt');
const LOG_PATH = path.join(__dirname, '.align-log.json');

const DOMAIN = 'https://itstitanium.com';

function readFileSafe(filePath) {
  try {
    return fs.readFileSync(filePath, 'utf8');
  } catch (error) {
    return '';
  }
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

function stripTags(value) {
  return value.replace(/<[^>]+>/g, ' ').replace(/\s+/g, ' ').trim();
}

function computeCanonical(filePath) {
  const rel = path.relative(PUBLIC_DIR, filePath).replace(/\\/g, '/');
  if (rel === 'index.html') return `${DOMAIN}/`;
  if (rel.endsWith('/index.html')) {
    const withoutIndex = rel.slice(0, -'index.html'.length);
    return `${DOMAIN}/${withoutIndex}`;
  }
  return `${DOMAIN}/${rel}`;
}

function hasJsonLd(html) {
  return /<script[^>]+type=["']application\/ld\+json["'][^>]*>/.test(html);
}

function loadLog() {
  try {
    return JSON.parse(fs.readFileSync(LOG_PATH, 'utf8'));
  } catch (error) {
    return {};
  }
}

function formatResult(passed, label, detail) {
  const icon = passed ? '✅' : '❌';
  return `  ${icon} ${label}${!passed && detail ? ` — ${detail}` : ''}`;
}

function formatDuration(ms) {
  if (!Number.isFinite(ms)) return null;
  if (ms < 1000) return `${ms}ms`;
  return `${(ms / 1000).toFixed(2)}s`;
}

function summarizeProgress(progress) {
  if (!progress) return null;
  const parts = [];
  if (Number.isFinite(progress.totalFiles)) {
    parts.push(`processed ${progress.totalFiles} file(s)`);
  }
  if (Number.isFinite(progress.filesChanged)) {
    parts.push(`updated ${progress.filesChanged} file(s)`);
  }
  if (Number.isFinite(progress.changeEntries)) {
    parts.push(`${progress.changeEntries} change note(s)`);
  }
  if (Number.isFinite(progress.disclosureUpdates)) {
    parts.push(`${progress.disclosureUpdates} disclosure update(s)`);
  }
  if (Number.isFinite(progress.faqUpdates)) {
    parts.push(`${progress.faqUpdates} FAQ sync(s)`);
  }
  if (Number.isFinite(progress.totalFixes)) {
    parts.push(`${progress.totalFixes} fix(es)`);
  }
  if (Number.isFinite(progress.warnings)) {
    parts.push(`${progress.warnings} warning(s)`);
  }
  return parts.length ? parts.join(', ') : null;
}

function main() {
  const checklist = readFileSafe(CHECKLIST_PATH);
  if (!checklist) {
    console.warn('Warning: checklist file missing or unreadable.');
  }

  console.log('State of Alignment');
  console.log('===================');
  if (checklist) {
    const firstLines = checklist.split('\n').slice(0, 6).join('\n');
    console.log('Checklist source: docs/new-checklist.txt');
    console.log(firstLines);
  }

  const files = getHtmlFiles(PUBLIC_DIR).sort();
  const faqDataRaw = readFileSafe(path.join(ROOT, 'data/faq-bank.json'));
  let faqLength = 0;
  if (faqDataRaw.trim()) {
    try {
      const parsed = JSON.parse(faqDataRaw);
      faqLength = Array.isArray(parsed) ? parsed.length : 0;
    } catch (error) {
      faqLength = 0;
    }
  }

  for (const file of files) {
    const relPath = path.relative(ROOT, file);
    const html = readFileSafe(file);
    const headMatch = html.match(/<head[^>]*>([\s\S]*?)<\/head>/i);
    const head = headMatch ? headMatch[1] : '';
    const bodyMatch = html.match(/<body[^>]*>([\s\S]*?)<\/body>/i);
    const body = bodyMatch ? bodyMatch[1] : '';
    const titleMatch = head.match(/<title>([^<]*)<\/title>/i);
    const title = titleMatch ? titleMatch[1].trim() : '';
    const descMatch = head.match(/<meta\s+name=["']description["'][^>]*content=["']([^"']*)["'][^>]*>/i);
    const description = descMatch ? descMatch[1].trim() : '';
    const canonical = computeCanonical(file);
    const canonicalMatch = head.match(/<link\s+rel=["']canonical["'][^>]*href=["']([^"']*)["'][^>]*>/i);
    const robotsMatch = head.match(/<meta\s+name=["']robots["'][^>]*content=["']([^"']*)["'][^>]*>/i);
    const hasDisclosure = /<section[^>]*id=["']disclosure["']/.test(html);
    const hasProgress = /class=["'][^"']*reading-progress/.test(html);
    const hasTldr = /class=["'][^"']*tldr[^"']*/.test(html);
    const hasFaq = /<section[^>]*id=["']faqs["'][^>]*>([\s\S]*?)<\/section>/i.test(html);
    const faqDetails = (html.match(/<section[^>]*id=["']faqs["'][^>]*>([\s\S]*?)<\/section>/i) || ['',''])[1].match(/<details/gi) || [];

    console.log(`\n${relPath}`);
    console.log(formatResult(Boolean(title) && title.length >= 35 && title.length <= 65, 'Title between 35 and 65 characters', title ? `length ${title.length}` : 'missing'));
    console.log(formatResult(Boolean(description) && description.length <= 165, 'Meta description present', description ? `length ${description.length}` : 'missing'));
    console.log(formatResult(Boolean(canonicalMatch) && canonicalMatch[1] === canonical, 'Canonical matches expected URL', canonicalMatch ? canonicalMatch[1] : 'missing'));
    console.log(formatResult(Boolean(robotsMatch) && /index/.test(robotsMatch[1]) && /follow/.test(robotsMatch[1]), 'Robots meta includes index,follow', robotsMatch ? robotsMatch[1] : 'missing'));
    console.log(formatResult(hasJsonLd(html), 'JSON-LD block present', hasJsonLd(html) ? '' : 'missing'));
    console.log(formatResult(hasDisclosure, 'Disclosure block synced', hasDisclosure ? '' : 'missing'));
    console.log(formatResult(hasProgress, 'Progress bar markup present', hasProgress ? '' : 'missing'));
    console.log(formatResult(/site\.js/.test(html), 'site.js referenced', /site\.js/.test(html) ? '' : 'missing'));
    const requiresTldr = relPath.endsWith(path.join('public', 'index.html'));
    if (requiresTldr) {
      console.log(formatResult(hasTldr, 'TL;DR section detected', hasTldr ? '' : 'missing'));
    }
    if (relPath.endsWith('index.html')) {
      console.log(formatResult(hasFaq && faqDetails.length === faqLength, `FAQ count matches data (${faqLength})`, hasFaq ? `found ${faqDetails.length}` : 'missing section'));
    }
  }

  const log = loadLog();
  console.log('\nRecent alignment actions');
  if (log.inject) {
    console.log(`inject.js @ ${log.inject.timestamp || 'unknown'}`);
    const injectSummary = summarizeProgress(log.inject.progress);
    const injectDuration = formatDuration(log.inject.durationMs);
    if (injectSummary) {
      console.log(`  summary: ${injectSummary}`);
    }
    if (injectDuration) {
      console.log(`  duration: ${injectDuration}`);
    }
    if (log.inject.changes && log.inject.changes.length) {
      for (const change of log.inject.changes) {
        console.log(`  • ${change.file}: ${change.message}`);
      }
    } else {
      console.log('  • No recorded changes');
    }
  } else {
    console.log('inject.js has not recorded a run.');
  }
  if (log.enforce) {
    console.log(`enforce.js @ ${log.enforce.timestamp || 'unknown'}`);
    const enforceSummary = summarizeProgress(log.enforce.progress);
    const enforceDuration = formatDuration(log.enforce.durationMs);
    if (enforceSummary) {
      console.log(`  summary: ${enforceSummary}`);
    }
    if (enforceDuration) {
      console.log(`  duration: ${enforceDuration}`);
    }
    if (log.enforce.changes && log.enforce.changes.length) {
      for (const change of log.enforce.changes) {
        console.log(`  • ${change}`);
      }
    } else {
      console.log('  • No recorded changes');
    }
    if (log.enforce.warnings && log.enforce.warnings.length) {
      console.log('  warnings:');
      for (const warn of log.enforce.warnings) {
        console.log(`    - ${warn}`);
      }
    }
  } else {
    console.log('enforce.js has not recorded a run.');
  }
}

main();
