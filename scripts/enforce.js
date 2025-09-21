#!/usr/bin/env node
const fs = require('fs');
const path = require('path');

const ROOT = path.resolve(__dirname, '..');
const PUBLIC_DIR = path.join(ROOT, 'public');
const TEMPLATE_PATH = path.join(ROOT, 'data/templates/kg-template.jsonld');
const FAQ_PATH = path.join(ROOT, 'data/faq-bank.json');
const LOG_PATH = path.join(__dirname, '.align-log.json');

const DOMAIN = 'https://itstitanium.com';

function formatDuration(ms) {
  if (!Number.isFinite(ms)) return 'n/a';
  if (ms < 1000) return `${ms}ms`;
  return `${(ms / 1000).toFixed(2)}s`;
}

function readFileSafe(filePath) {
  try {
    return fs.readFileSync(filePath, 'utf8');
  } catch (error) {
    console.error(`Failed to read ${filePath}: ${error.message}`);
    process.exitCode = 1;
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

function escapeRegExp(str) {
  return str.replace(/[.*+?^${}()|[\]\\]/g, '\\$&');
}

function extractHead(html) {
  const match = html.match(/<head[^>]*>[\s\S]*?<\/head>/i);
  if (!match) return null;
  const headBlock = match[0];
  const openMatch = headBlock.match(/<head[^>]*>/i);
  const openTag = openMatch ? openMatch[0] : '<head>';
  const inner = headBlock.slice(openTag.length, headBlock.length - '</head>'.length);
  return { headBlock, openTag, inner, start: match.index, end: match.index + headBlock.length };
}

function replaceHead(html, headInfo, newInner) {
  const trimmed = newInner.trim();
  const content = trimmed ? `\n${trimmed}\n` : '\n';
  const newHead = `${headInfo.openTag}${content}</head>`;
  return html.slice(0, headInfo.start) + newHead + html.slice(headInfo.end);
}

function upsertTag(inner, regex, tag) {
  const formatted = `  ${tag}`;
  const match = inner.match(regex);
  if (match) {
    if (match[0].trim() === formatted.trim()) {
      return { inner, changed: false };
    }
    return { inner: inner.replace(regex, formatted), changed: true };
  }
  const trimmed = inner.trimEnd();
  const prefix = trimmed ? `${trimmed}\n${formatted}\n` : `\n${formatted}\n`;
  return { inner: prefix, changed: true };
}

function ensureMetaName(inner, name, content) {
  const regex = new RegExp(`<meta\\s+name=["']${escapeRegExp(name)}["'][^>]*>`, 'i');
  const tag = `<meta name="${name}" content="${content}">`;
  const result = upsertTag(inner, regex, tag);
  return { inner: result.inner, changed: result.changed };
}

function ensureMetaProperty(inner, property, content) {
  const regex = new RegExp(`<meta\\s+(?:property|name)=["']${escapeRegExp(property)}["'][^>]*>`, 'i');
  const tag = `<meta property="${property}" content="${content}">`;
  const result = upsertTag(inner, regex, tag);
  return { inner: result.inner, changed: result.changed };
}

function ensureLinkCanonical(inner, href) {
  const regex = /<link\s+rel=["']canonical["'][^>]*>/i;
  const tag = `<link rel="canonical" href="${href}">`;
  const result = upsertTag(inner, regex, tag);
  return { inner: result.inner, changed: result.changed };
}

function ensureJsonLd(inner, json) {
  const scriptRegex = /<script[^>]+type=["']application\/ld\+json["'][^>]*>[\s\S]*?<\/script>/gi;
  let nextInner = inner.replace(scriptRegex, '').trimEnd();
  const scriptTag = `  <script type="application/ld+json">\n${json}\n  </script>`;
  nextInner = `${nextInner}\n${scriptTag}\n`;
  return { inner: nextInner, changed: true };
}

function extractExistingDates(inner) {
  const scriptMatch = inner.match(/<script[^>]+type=["']application\/ld\+json["'][^>]*>([\s\S]*?)<\/script>/i);
  if (!scriptMatch) return {};
  try {
    const raw = scriptMatch[1].trim();
    const parsed = JSON.parse(raw);
    const nodes = Array.isArray(parsed)
      ? parsed
      : Array.isArray(parsed['@graph'])
        ? parsed['@graph']
        : [parsed];
    const result = {};
    for (const node of nodes) {
      if (!result.datePublished && typeof node.datePublished === 'string') {
        result.datePublished = node.datePublished;
      }
      if (!result.dateModified && typeof node.dateModified === 'string') {
        result.dateModified = node.dateModified;
      }
      if (result.datePublished && result.dateModified) {
        break;
      }
    }
    return result;
  } catch (error) {
    return {};
  }
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

function titleCase(segment) {
  return segment
    .split('-')
    .map((part) => part.charAt(0).toUpperCase() + part.slice(1))
    .join(' ');
}

function buildBreadcrumbs(canonical, relPath) {
  const items = [
    {
      '@type': 'ListItem',
      position: 1,
      name: 'Home',
      item: `${DOMAIN}/`
    }
  ];
  const rel = relPath.replace(/\\/g, '/');
  let pathAccumulator = '';
  const cleaned = rel.replace(/index\.html$/, '');
  const segments = cleaned.split('/').filter(Boolean);
  segments.forEach((segment, idx) => {
    const isLast = idx === segments.length - 1;
    const displayName = titleCase(segment.replace(/\.html$/, ''));
    if (pathAccumulator) {
      pathAccumulator += segment;
    } else {
      pathAccumulator = segment;
    }
    if (!isLast || !segment.endsWith('.html')) {
      pathAccumulator += '/';
    }
    items.push({
      '@type': 'ListItem',
      position: items.length + 1,
      name: displayName,
      item: `${DOMAIN}/${pathAccumulator}`
    });
  });
  return items;
}

function findHeroImage(html) {
  const preload = html.match(/<link[^>]+rel=["']preload["'][^>]+as=["']image["'][^>]+href=["']([^"']+)["'][^>]*>/i);
  if (preload) return preload[1];
  const heroImg = html.match(/<img[^>]+class=["'][^"']*hero[^"']*["'][^>]*src=["']([^"']+)["'][^>]*>/i);
  if (heroImg) return heroImg[1];
  const first = html.match(/<img[^>]+src=["']([^"']+)["'][^>]*>/i);
  return first ? first[1] : null;
}

function findHeroDetails(html) {
  const match = html.match(/<img[^>]+class=["'][^"']*hero[^"']*["'][^>]*>/i) || html.match(/<img[^>]+loading=["']eager["'][^>]*>/i);
  if (!match) return null;
  const tag = match[0];
  const srcMatch = tag.match(/src=["']([^"']+)["']/i);
  const widthMatch = tag.match(/width=["']([^"']+)["']/i);
  const heightMatch = tag.match(/height=["']([^"']+)["']/i);
  const altMatch = tag.match(/alt=["']([^"']*)["']/i);
  return {
    src: srcMatch ? srcMatch[1] : null,
    width: widthMatch ? widthMatch[1] : null,
    height: heightMatch ? heightMatch[1] : null,
    alt: altMatch ? altMatch[1] : ''
  };
}

function buildFaqEntities(faqData) {
  return faqData.map((item) => ({
    '@type': 'Question',
    name: item.q,
    acceptedAnswer: {
      '@type': 'Answer',
      text: item.a
    }
  }));
}

function extractCareSteps(html) {
  const match = html.match(/<ol[^>]*class=["'][^"']*care-steps[^"']*["'][^>]*>([\s\S]*?)<\/ol>/i);
  if (!match) return [];
  const liMatches = match[1].match(/<li[^>]*>([\s\S]*?)<\/li>/gi) || [];
  return liMatches.map((li) => stripTags(li));
}

function buildJsonLd(html, filePath, canonical, title, description, dateModified, faqData, existingDates = {}) {
  const rel = path.relative(PUBLIC_DIR, filePath).replace(/\\/g, '/');
  const template = JSON.parse(readFileSafe(TEMPLATE_PATH));
  const graph = [];
  const org = template['@graph'].find((node) => node['@type'] === 'Organization');
  const website = template['@graph'].find((node) => node['@type'] === 'WebSite');
  const webPage = template['@graph'].find((node) => node['@type'] === 'WebPage');
  const breadcrumb = template['@graph'].find((node) => node['@type'] === 'BreadcrumbList');

  const heroDetails = findHeroDetails(html);
  const heroSrc = heroDetails && heroDetails.src ? heroDetails.src : findHeroImage(html);
  const heroUrl = heroSrc ? (heroSrc.startsWith('http') ? heroSrc : `${DOMAIN}${heroSrc.startsWith('/') ? '' : '/'}${heroSrc}`) : undefined;

  const preserved = existingDates || {};
  const fallbackDate = new Date().toISOString().split('T')[0];
  const published = preserved.datePublished || preserved.dateModified || dateModified || fallbackDate;
  const modified = dateModified || preserved.dateModified || published;

  graph.push({
    ...org,
    '@id': `${DOMAIN}/#org`,
    url: `${DOMAIN}/`
  });

  graph.push({
    ...website,
    '@id': `${DOMAIN}/#website`,
    url: `${DOMAIN}/`,
    name: "It’s Titanium",
    inLanguage: 'en-US',
    publisher: {
      '@id': `${DOMAIN}/#org`
    },
    potentialAction: website.potentialAction
  });

  const breadcrumbs = buildBreadcrumbs(canonical, rel);
  graph.push({
    '@type': 'BreadcrumbList',
    '@id': `${canonical}#breadcrumbs`,
    itemListElement: breadcrumbs
  });

  graph.push({
    ...webPage,
    '@id': `${canonical}#webpage`,
    url: canonical,
    name: title,
    inLanguage: 'en-US',
    description,
    datePublished: published,
    dateModified: modified,
    isPartOf: {
      '@id': `${DOMAIN}/#website`
    },
    breadcrumb: {
      '@id': `${canonical}#breadcrumbs`
    }
  });

  if (heroUrl) {
    graph.push({
      '@type': 'ImageObject',
      '@id': `${canonical}#primaryimage`,
      url: heroUrl,
      contentUrl: heroUrl,
      caption: heroDetails ? heroDetails.alt : '',
      width: heroDetails && heroDetails.width ? heroDetails.width : undefined,
      height: heroDetails && heroDetails.height ? heroDetails.height : undefined
    });
  }

  graph.push({
    '@type': 'BlogPosting',
    '@id': `${canonical}#blog`,
    headline: title,
    description,
    datePublished: published,
    dateModified: modified,
    inLanguage: 'en-US',
    mainEntityOfPage: {
      '@id': `${canonical}#webpage`
    },
    author: {
      '@id': `${DOMAIN}/#org`,
      '@type': 'Organization',
      name: "It’s Titanium"
    },
    publisher: {
      '@id': `${DOMAIN}/#org`
    },
    image: heroUrl ? {
      '@id': `${canonical}#primaryimage`
    } : undefined
  });

  const speakableSelectors = [];
  if (/class=["'][^"']*tldr[^"']*/i.test(html)) {
    speakableSelectors.push('.tldr');
  }
  if (/<h1/i.test(html)) {
    speakableSelectors.push('h1');
  }
  if (speakableSelectors.length) {
    graph.push({
      '@type': 'SpeakableSpecification',
      '@id': `${canonical}#speakable`,
      cssSelector: speakableSelectors
    });
  }

  if (rel === 'index.html' && faqData.length) {
    graph.push({
      '@type': 'FAQPage',
      '@id': `${canonical}#faq`,
      mainEntity: buildFaqEntities(faqData)
    });
  }

  const steps = extractCareSteps(html);
  if (steps.length) {
    graph.push({
      '@type': 'HowTo',
      '@id': `${canonical}#care`,
      name: 'Care and cleaning routine for titanium cookware',
      step: steps.map((text, index) => ({
        '@type': 'HowToStep',
        position: index + 1,
        text
      }))
    });
  }

  return JSON.stringify({ '@context': 'https://schema.org', '@graph': graph.filter(Boolean) }, null, 2);
}

function ensureProgressMarkup(html, summary) {
  if (html.includes('class="reading-progress"')) {
    return { html, changed: false };
  }
  const headerMatch = html.match(/<header[^>]*>[\s\S]*?<\/header>/i);
  if (!headerMatch) {
    summary.warnings.push('Missing <header> for progress bar injection');
    return { html, changed: false };
  }
  const insertIndex = headerMatch.index + headerMatch[0].length - '</header>'.length;
  const markup = '    <div class="progress" aria-hidden="true">\n      <i class="reading-progress"></i>\n    </div>';
  const newHeader = headerMatch[0].replace('</header>', `${markup}\n  </header>`);
  const nextHtml = html.slice(0, headerMatch.index) + newHeader + html.slice(headerMatch.index + headerMatch[0].length);
  summary.fixes.push('Inserted progress bar markup');
  return { html: nextHtml, changed: true };
}

function ensureSiteScript(html, summary) {
  if (/src=["'][^"']*site\.js["']/.test(html)) {
    return { html, changed: false };
  }
  const scriptTag = '  <script src="/site.js" defer></script>';
  if (html.includes('</body>')) {
    const nextHtml = html.replace('</body>', `${scriptTag}\n</body>`);
    summary.fixes.push('Added site.js reference');
    return { html: nextHtml, changed: true };
  }
  return { html, changed: false };
}

function updateImages(html, summary) {
  let changed = false;
  let index = 0;
  const updated = html.replace(/<img\b[^>]*>/gi, (tag) => {
    index += 1;
    const isHero = /class=["'][^"']*hero[^"']*/i.test(tag) || /loading=["']eager["']/i.test(tag);
    let nextTag = tag;
    if (!isHero) {
      if (!/loading=/i.test(nextTag)) {
        nextTag = nextTag.replace('<img', '<img loading="lazy"');
        changed = true;
      } else if (!/loading=["']lazy["']/i.test(nextTag)) {
        nextTag = nextTag.replace(/loading=["'][^"']*["']/i, 'loading="lazy"');
        changed = true;
      }
      if (!/decoding=/i.test(nextTag)) {
        nextTag = nextTag.replace('<img', '<img decoding="async"');
        changed = true;
      } else if (!/decoding=["']async["']/i.test(nextTag)) {
        nextTag = nextTag.replace(/decoding=["'][^"']*["']/i, 'decoding="async"');
        changed = true;
      }
      if (!/width=/i.test(nextTag) || !/height=/i.test(nextTag)) {
        summary.warnings.push('Missing width/height on image #' + index);
      }
    }
    if (/https:\/\/itstitaniun.com/.test(nextTag)) {
      nextTag = nextTag
        .replace(/https:\/\/itstitaniun.com\//g, `${DOMAIN}/`)
        .replace(/https:\/\/itstitaniun.com/g, DOMAIN);
      changed = true;
    }
    return nextTag;
  });
  return { html: updated, changed };
}

function readAlignLog() {
  try {
    return JSON.parse(fs.readFileSync(LOG_PATH, 'utf8'));
  } catch (error) {
    return {};
  }
}

function writeAlignLog(data) {
  fs.writeFileSync(LOG_PATH, JSON.stringify(data, null, 2) + '\n');
}

function ensureRobotsContent(content) {
  if (!content.includes('index') || !content.includes('follow')) {
    return 'index,follow';
  }
  return content;
}

function main() {
  const startTime = Date.now();
  const files = getHtmlFiles(PUBLIC_DIR);
  let faqData = [];
  const faqRaw = readFileSafe(FAQ_PATH);
  if (faqRaw && faqRaw.trim()) {
    try {
      faqData = JSON.parse(faqRaw);
    } catch (error) {
      console.error(`Failed to parse FAQ JSON: ${error.message}`);
      process.exitCode = 1;
      faqData = [];
    }
  }
  const changes = [];
  const warnings = [];
  const filesChanged = new Set();
  let totalFixes = 0;

  for (const file of files) {
    const relPath = path.relative(ROOT, file);
    let html = readFileSafe(file);
    let changed = false;
    const summary = { file: relPath, fixes: [], warnings: [] };

    if (html.includes('https://itstitaniun.com')) {
      html = html
        .replace(/https:\/\/itstitaniun.com\//g, `${DOMAIN}/`)
        .replace(/https:\/\/itstitaniun.com/g, DOMAIN);
      summary.fixes.push('Corrected domain typo');
      changed = true;
    }

    const headInfo = extractHead(html);
    if (!headInfo) {
      summary.warnings.push('Missing <head> section');
      warnings.push(...summary.warnings.map((msg) => `${relPath}: ${msg}`));
      continue;
    }

    let headInner = headInfo.inner;
    const existingDates = extractExistingDates(headInner);

    const canonical = computeCanonical(file);

    const titleMatch = headInner.match(/<title>([^<]*)<\/title>/i);
    const title = titleMatch ? titleMatch[1].trim() : '';
    if (!title) {
      summary.warnings.push('Missing <title>');
    } else {
      if (title.length > 65 || title.length < 35) {
        summary.warnings.push(`Title length ${title.length} outside preferred range (~60)`);
      }
    }

    const descMatch = headInner.match(/<meta\s+name=["']description["'][^>]*content=["']([^"']*)["'][^>]*>/i);
    let description = descMatch ? descMatch[1].trim() : '';
    if (!description) {
      const paragraphMatch = html.match(/<p[^>]*>([\s\S]*?)<\/p>/i);
      if (paragraphMatch) {
        description = stripTags(paragraphMatch[1]).slice(0, 155);
        const { inner: updatedInner } = upsertTag(headInner, /<meta\s+name=["']description["'][^>]*>/i, `<meta name="description" content="${description}">`);
        headInner = updatedInner;
        summary.fixes.push('Added meta description');
      } else {
        summary.warnings.push('Missing meta description');
      }
    } else if (description.length > 165) {
      summary.warnings.push(`Meta description length ${description.length} exceeds 165 characters`);
    }

    let result;
    result = ensureLinkCanonical(headInner, canonical);
    headInner = result.inner;
    if (result.changed) summary.fixes.push('Ensured canonical link');

    const robotsMatch = headInner.match(/<meta\s+name=["']robots["'][^>]*content=["']([^"']*)["'][^>]*>/i);
    let robotsChanged = false;
    if (robotsMatch) {
      const safeContent = ensureRobotsContent(robotsMatch[1]);
      result = upsertTag(headInner, /<meta\s+name=["']robots["'][^>]*>/i, `<meta name="robots" content="${safeContent}">`);
      headInner = result.inner;
      if (result.changed) robotsChanged = true;
    } else {
      result = ensureMetaName(headInner, 'robots', 'index,follow');
      headInner = result.inner;
      if (result.changed) robotsChanged = true;
    }
    if (robotsChanged) summary.fixes.push('Standardized robots meta');

    const ogType = /index\.html$/.test(path.relative(PUBLIC_DIR, file)) ? 'website' : 'article';
    const heroPath = findHeroImage(html);
    const ogImage = heroPath ? (heroPath.startsWith('http') ? heroPath : `${DOMAIN}${heroPath.startsWith('/') ? '' : '/'}${heroPath}`) : `${DOMAIN}/assets/img/itstitaniun-hero-og-1200x630.webp`;
    const ogImageAlt = 'Titanium cookware hero image';

    const ogPairs = [
      ['og:type', ogType],
      ['og:site_name', "It’s Titanium"],
      ['og:title', title || 'It’s Titanium'],
      ['og:description', description || 'Titanium cookware guidance'],
      ['og:url', canonical],
      ['og:image', ogImage],
      ['og:image:alt', ogImageAlt]
    ];
    let ogChanged = false;
    for (const [property, value] of ogPairs) {
      result = ensureMetaProperty(headInner, property, value);
      headInner = result.inner;
      if (result.changed) ogChanged = true;
    }
    if (ogChanged) summary.fixes.push('Aligned Open Graph tags');

    const twitterPairs = [
      ['twitter:card', 'summary_large_image'],
      ['twitter:title', title || 'It’s Titanium'],
      ['twitter:description', description || 'Titanium cookware guidance'],
      ['twitter:image', ogImage],
      ['twitter:image:alt', ogImageAlt]
    ];
    let twitterChanged = false;
    for (const [name, value] of twitterPairs) {
      result = ensureMetaProperty(headInner, name, value);
      headInner = result.inner;
      if (result.changed) twitterChanged = true;
    }
    if (twitterChanged) summary.fixes.push('Aligned Twitter card tags');

    const timeMatch = html.match(/<time[^>]+datetime=["']([^"']+)["'][^>]*>/i);
    const dateModified = timeMatch ? timeMatch[1] : null;
    const jsonLd = buildJsonLd(
      html,
      file,
      canonical,
      title || 'It’s Titanium',
      description || 'Titanium cookware guidance',
      dateModified,
      faqData,
      existingDates
    );
    result = ensureJsonLd(headInner, jsonLd);
    headInner = result.inner;
    if (result.changed) summary.fixes.push('Refreshed JSON-LD graph');

    const newHtml = replaceHead(html, headInfo, headInner);
    if (newHtml !== html) {
      html = newHtml;
      changed = true;
    }

    const progressResult = ensureProgressMarkup(html, summary);
    html = progressResult.html;
    if (progressResult.changed) changed = true;

    const scriptResult = ensureSiteScript(html, summary);
    html = scriptResult.html;
    if (scriptResult.changed) changed = true;

    const imageResult = updateImages(html, summary);
    html = imageResult.html;
    if (imageResult.changed) {
      changed = true;
      summary.fixes.push('Standardized image loading attributes');
    }

    if (changed) {
      fs.writeFileSync(file, html);
      changes.push(...summary.fixes.map((msg) => `${relPath}: ${msg}`));
      totalFixes += summary.fixes.length;
      filesChanged.add(relPath);
    }

    if (summary.warnings.length) {
      warnings.push(...summary.warnings.map((msg) => `${relPath}: ${msg}`));
    }
  }

  const log = readAlignLog();
  const durationMs = Date.now() - startTime;
  const progress = {
    totalFiles: files.length,
    filesChanged: filesChanged.size,
    totalFixes,
    warnings: warnings.length
  };
  log.enforce = {
    timestamp: new Date().toISOString(),
    durationMs,
    progress,
    changes,
    warnings
  };
  writeAlignLog(log);

  if (changes.length) {
    console.log('enforce:');
    for (const change of changes) {
      console.log(`  • ${change}`);
    }
  } else {
    console.log('enforce: no changes needed.');
  }

  console.log(
    `enforce summary: processed ${progress.totalFiles} file(s) in ${formatDuration(durationMs)}, ` +
      `${progress.filesChanged} file(s) updated, ${progress.totalFixes} fix(es), ${progress.warnings} warning(s).`
  );

  if (warnings.length) {
    console.warn('Warnings:');
    for (const warn of warnings) {
      console.warn(`  • ${warn}`);
    }
    process.exitCode = 1;
  }
}

main();
