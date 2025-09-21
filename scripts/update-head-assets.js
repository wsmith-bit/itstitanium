#!/usr/bin/env node
/**
 * Normalize head assets and image hygiene across /public HTML files.
 * - Upserts favicon/social metadata only when source files exist
 * - Ensures canonical + robots meta (without clobbering explicit directives)
 * - Populates Open Graph / Twitter tags with hero or fallback imagery
 * - Standardizes non-hero <img> tags to lazy/async loading
 * - Adds /site.js defer script before </body> when absent
 */

const fs = require('fs');
const path = require('path');

const ROOT_DIR = path.resolve(__dirname, '..');
const PUBLIC_DIR = path.join(ROOT_DIR, 'public');
const SITE_ORIGIN = 'https://itstitanium.com';

const ICON_CANDIDATES = [
  { rel: 'icon', type: 'image/png', sizes: '32x32', href: '/assets/img/brand/itstitaniun-logo-32.png' },
  { rel: 'icon', type: 'image/png', sizes: '192x192', href: '/assets/img/brand/itstitaniun-logo-192.png' },
  { rel: 'apple-touch-icon', sizes: '180x180', href: '/assets/img/brand/itstitaniun-apple-touch-180.png' }
];
const FALLBACK_OG_IMAGE = '/assets/img/itstitaniun-hero-og-1200x630.webp';

function escapeRegExp(str) {
  return str.replace(/[.*+?^${}()|[\]\\]/g, '\\$&');
}

function escapeAttribute(value) {
  return String(value)
    .replace(/&(?!(?:[a-zA-Z0-9]+|#\d+|#x[a-fA-F0-9]+);)/g, '&amp;')
    .replace(/"/g, '&quot;')
    .replace(/'/g, '&#39;');
}

function assetExists(publicPath) {
  if (!publicPath) return false;
  const clean = publicPath.replace(/^\//, '').split(/[?#]/)[0];
  if (!clean) return false;
  try {
    return fs.statSync(path.join(PUBLIC_DIR, clean)).isFile();
  } catch (err) {
    return false;
  }
}

function listHtmlFiles(dir) {
  const entries = fs.readdirSync(dir, { withFileTypes: true });
  const files = [];
  for (const entry of entries) {
    if (entry.name.startsWith('.')) continue;
    const full = path.join(dir, entry.name);
    if (entry.isDirectory()) {
      files.push(...listHtmlFiles(full));
    } else if (entry.isFile() && entry.name.toLowerCase().endsWith('.html')) {
      files.push(full);
    }
  }
  return files;
}

function relativeToPublic(filePath) {
  return path.relative(PUBLIC_DIR, filePath).split(path.sep).join('/');
}

function computeCanonical(fileRel) {
  if (fileRel === 'index.html') return `${SITE_ORIGIN}/`;
  if (fileRel.endsWith('/index.html')) {
    const trimmed = fileRel.slice(0, -'index.html'.length);
    return `${SITE_ORIGIN}/${trimmed}`;
  }
  return `${SITE_ORIGIN}/${fileRel}`;
}

function extractHead(html) {
  const match = html.match(/<head\b[^>]*>[\s\S]*?<\/head>/i);
  if (!match) return null;
  const openTag = match[0].match(/<head\b[^>]*>/i)[0];
  const start = match.index;
  const end = start + match[0].length;
  const inner = match[0].slice(openTag.length, match[0].length - '</head>'.length);
  return { start, end, openTag, inner };
}

function replaceHead(html, headInfo, newInner) {
  const newHead = `${headInfo.openTag}${newInner}</head>`;
  return html.slice(0, headInfo.start) + newHead + html.slice(headInfo.end);
}

function tagRegex(tag, attr, value) {
  const attrPattern = `${attr}=["']${escapeRegExp(value)}["']`;
  return new RegExp(`(^|\n)([\t ]*)<${tag}[^>]*${attrPattern}[^>]*>`, 'i');
}

function upsertTag(inner, regex, buildTag, { force = true } = {}) {
  const desired = buildTag().trim();
  const match = inner.match(regex);
  if (match) {
    if (!force) return { inner, changed: false };
    const indent = match[2] || '  ';
    const current = match[0].trim();
    if (current === desired) return { inner, changed: false };
    const updated = inner.replace(regex, (_, lead, indentStr) => `${lead}${indentStr}${desired}`);
    return { inner: updated, changed: true };
  }
  const indent = '  ';
  const needsNewline = inner.length && !inner.endsWith('\n');
  const prefix = needsNewline ? '\n' : '';
  const updated = inner + `${prefix}${indent}${desired}\n`;
  return { inner: updated, changed: true };
}

function ensureLink(inner, rel, href, extra = {}) {
  const regex = tagRegex('link', 'rel', rel);
  return upsertTag(inner, regex, () => {
    const parts = [`rel="${rel}"`, `href="${escapeAttribute(href)}"`];
    if (extra.sizes) parts.push(`sizes="${extra.sizes}"`);
    if (extra.type) parts.push(`type="${extra.type}"`);
    return `<link ${parts.join(' ')}>`;
  });
}

function ensureMeta(inner, attr, key, value, { force = true } = {}) {
  const regex = tagRegex('meta', attr, key);
  return upsertTag(inner, regex, () => `<meta ${attr}="${key}" content="${escapeAttribute(value)}">`, { force });
}

function metaExists(inner, attr, key) {
  const regex = tagRegex('meta', attr, key);
  return regex.test(inner);
}

function ensureTwitterMeta(inner, key, value) {
  if (metaExists(inner, 'name', key)) {
    const result = ensureMeta(inner, 'name', key, value, { force: true });
    return { inner: result.inner, changed: result.changed };
  }
  if (metaExists(inner, 'property', key)) {
    const result = ensureMeta(inner, 'property', key, value, { force: true });
    return { inner: result.inner, changed: result.changed };
  }
  const result = ensureMeta(inner, 'name', key, value, { force: true });
  return { inner: result.inner, changed: result.changed };
}

function deriveDescription(html) {
  const bodyMatch = html.match(/<p[^>]*>([\s\S]*?)<\/p>/i);
  if (!bodyMatch) return null;
  const text = bodyMatch[1]
    .replace(/<[^>]+>/g, ' ')
    .replace(/\s+/g, ' ')
    .trim();
  if (!text) return null;
  return text.length > 155 ? `${text.slice(0, 152).trim()}...` : text;
}

function getAttr(tag, attr) {
  const regex = new RegExp(`${attr}=["']([^"']+)["']`, 'i');
  const match = tag.match(regex);
  return match ? match[1] : null;
}

function toAbsolutePath(src, fileRel) {
  if (!src) return null;
  if (/^https?:\/\//i.test(src)) return src;
  if (src.startsWith('data:')) return null;
  const cleaned = src.split(/[?#]/)[0];
  if (!cleaned) return null;
  if (cleaned.startsWith('/')) return cleaned;
  const dir = path.posix.dirname(fileRel);
  const base = dir === '.' ? '' : dir;
  const joined = path.posix.normalize(path.posix.join(base, cleaned));
  return `/${joined}`;
}

function findPrimaryImage(html, fileRel) {
  const preload = html.match(/<link[^>]+rel=["']preload["'][^>]+as=["']image["'][^>]+href=["']([^"']+)["']/i);
  if (preload) {
    const abs = toAbsolutePath(preload[1], fileRel);
    if (abs && assetExists(abs)) return `${SITE_ORIGIN}${abs}`;
  }
  const heroImg = html.match(/<img[^>]+(?:class|id|data-role|data-hero)=["'][^"']*hero[^"']*["'][^>]*>/i);
  if (heroImg) {
    const src = getAttr(heroImg[0], 'src');
    const abs = toAbsolutePath(src, fileRel);
    if (abs && assetExists(abs)) return `${SITE_ORIGIN}${abs}`;
  }
  const firstImg = html.match(/<img[^>]*>/i);
  if (firstImg) {
    const src = getAttr(firstImg[0], 'src');
    const abs = toAbsolutePath(src, fileRel);
    if (abs && assetExists(abs)) return `${SITE_ORIGIN}${abs}`;
  }
  if (assetExists(FALLBACK_OG_IMAGE)) {
    return `${SITE_ORIGIN}${FALLBACK_OG_IMAGE}`;
  }
  return null;
}

function normalizeImages(html, relPath, log) {
  let modified = false;
  const updated = html.replace(/<img\b[^>]*>/gi, tag => {
    const original = tag;
    const isHero = /(class|id|data-role|data-hero)=["'][^"']*hero[^"']*["']/i.test(tag) || /loading=["']eager["']/i.test(tag);
    let next = tag;
    if (!isHero) {
      const loadingRe = /\bloading=["'][^"']+["']/i;
      if (loadingRe.test(next)) {
        if (!/\bloading=["']lazy["']/i.test(next)) {
          next = next.replace(loadingRe, 'loading="lazy"');
        }
      } else {
        next = next.replace(/^<img/i, '<img loading="lazy"');
      }
      const decodingRe = /\bdecoding=["'][^"']+["']/i;
      if (decodingRe.test(next)) {
        if (!/\bdecoding=["']async["']/i.test(next)) {
          next = next.replace(decodingRe, 'decoding="async"');
        }
      } else {
        next = next.replace(/^<img/i, '<img decoding="async"');
      }
    }
    if (next !== original) modified = true;
    return next;
  });
  if (modified) {
    log.push(`${relPath}: normalized <img> loading/decoding`);
  }
  return updated;
}

function ensureSiteScript(html, relPath, log) {
  if (/src=["'][^"']*site\.js["']/i.test(html)) return html;
  if (!/<\/body>/i.test(html)) return html;
  log.push(`${relPath}: added site.js defer script`);
  return html.replace(/<\/body>/i, match => `  <script src="/site.js" defer></script>\n${match}`);
}

function main() {
  const htmlFiles = listHtmlFiles(PUBLIC_DIR);
  const changes = [];
  for (const file of htmlFiles) {
    const originalHtml = fs.readFileSync(file, 'utf8');
    const headInfo = extractHead(originalHtml);
    if (!headInfo) continue;
    let headInner = headInfo.inner;
    const fileRel = relativeToPublic(file);
    const canonicalUrl = computeCanonical(fileRel);

    const primaryImage = findPrimaryImage(originalHtml, fileRel);

    // Icons
    for (const icon of ICON_CANDIDATES) {
      if (!assetExists(icon.href)) continue;
      const result = ensureLink(headInner, icon.rel, icon.href, { sizes: icon.sizes, type: icon.type });
      headInner = result.inner;
      if (result.changed) {
        changes.push(`${fileRel}: ensured ${icon.rel}${icon.sizes ? ` ${icon.sizes}` : ''}`);
      }
    }

    // Canonical (force)
    const canonicalResult = upsertTag(headInner, tagRegex('link', 'rel', 'canonical'), () => `<link rel="canonical" href="${canonicalUrl}">`, { force: true });
    headInner = canonicalResult.inner;
    if (canonicalResult.changed) changes.push(`${fileRel}: updated canonical link`);

    // Robots - only add if missing
    if (!metaExists(headInner, 'name', 'robots')) {
      const robotsResult = ensureMeta(headInner, 'name', 'robots', 'index,follow', { force: false });
      headInner = robotsResult.inner;
      if (robotsResult.changed) changes.push(`${fileRel}: added robots meta`);
    }

    // Description (add if missing)
    if (!metaExists(headInner, 'name', 'description')) {
      const derived = deriveDescription(originalHtml);
      if (derived) {
        const descResult = ensureMeta(headInner, 'name', 'description', derived, { force: true });
        headInner = descResult.inner;
        if (descResult.changed) changes.push(`${fileRel}: added meta description`);
      }
    }

    // Collect data for OG/Twitter
    const titleMatch = headInner.match(/<title>([^<]*)<\/title>/i);
    const title = titleMatch ? titleMatch[1].trim() : 'It’s Titanium';

    let descriptionValue = null;
    const descMatch = headInner.match(tagRegex('meta', 'name', 'description'));
    if (descMatch) {
      const existing = descMatch[0].match(/content=["']([^"']*)["']/i);
      if (existing) descriptionValue = existing[1];
    }
    if (!descriptionValue) {
      const derived = deriveDescription(originalHtml);
      if (derived) descriptionValue = derived;
      else descriptionValue = 'Titanium cookware expertise from the It’s Titanium team.';
    }

    const ogPairs = [
      { attr: 'property', key: 'og:type', value: fileRel === 'index.html' ? 'website' : 'article' },
      { attr: 'property', key: 'og:site_name', value: 'It’s Titanium' },
      { attr: 'property', key: 'og:title', value: title },
      { attr: 'property', key: 'og:description', value: descriptionValue },
      { attr: 'property', key: 'og:url', value: canonicalUrl }
    ];
    if (primaryImage) {
      ogPairs.push({ attr: 'property', key: 'og:image', value: primaryImage });
      ogPairs.push({ attr: 'property', key: 'og:image:alt', value: 'Titanium cookware hero image' });
    }
    let ogChanged = false;
    for (const pair of ogPairs) {
      const result = ensureMeta(headInner, pair.attr, pair.key, pair.value, { force: true });
      if (result.changed) ogChanged = true;
      headInner = result.inner;
    }
    if (ogChanged) changes.push(`${fileRel}: aligned Open Graph tags`);

    const twitterPairs = [
      { key: 'twitter:card', value: primaryImage ? 'summary_large_image' : 'summary' },
      { key: 'twitter:title', value: title },
      { key: 'twitter:description', value: descriptionValue }
    ];
    if (primaryImage) {
      twitterPairs.push({ key: 'twitter:image', value: primaryImage });
      twitterPairs.push({ key: 'twitter:image:alt', value: 'Titanium cookware hero image' });
    }
    let twitterChanged = false;
    for (const pair of twitterPairs) {
      const result = ensureTwitterMeta(headInner, pair.key, pair.value);
      if (result.changed) twitterChanged = true;
      headInner = result.inner;
    }
    if (twitterChanged) changes.push(`${fileRel}: aligned Twitter card tags`);

    const updatedHtml = replaceHead(originalHtml, headInfo, headInner);
    let finalHtml = updatedHtml;
    finalHtml = normalizeImages(finalHtml, fileRel, changes);
    finalHtml = ensureSiteScript(finalHtml, fileRel, changes);

    if (finalHtml !== originalHtml) {
      fs.writeFileSync(file, finalHtml);
    }
  }

  if (changes.length) {
    console.log('update-head-assets changes:');
    for (const change of changes) {
      console.log(`  • ${change}`);
    }
  } else {
    console.log('update-head-assets: no changes needed.');
  }
}

main();
