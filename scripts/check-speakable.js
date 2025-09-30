const fs = require('fs');
const path = require('path');

const projectRoot = path.join(__dirname, '..');
const blogDir = path.join(projectRoot, 'public', 'blog');
const publicRoot = path.join(projectRoot, 'public');

if (!fs.existsSync(blogDir)) {
  console.error('Blog directory not found at public/blog.');
  process.exit(1);
}

const entries = fs.readdirSync(blogDir, { withFileTypes: true });
const blogFiles = entries
  .filter((entry) => entry.isFile() && !entry.name.startsWith('.') && entry.name !== 'index.html')
  .map((entry) => path.join(blogDir, entry.name));

if (blogFiles.length === 0) {
  console.log('No blog detail pages found to validate.');
  process.exit(0);
}

function resolvePublicPath(href) {
  const normalized = href.replace(/^\/+/, '').replace(/\/+$/, '');
  const directPath = path.join(publicRoot, normalized);
  if (fs.existsSync(directPath)) return true;
  if (fs.existsSync(`${directPath}.html`)) return true;
  if (fs.existsSync(path.join(directPath, 'index.html'))) return true;
  return false;
}

const requiredIdentity = '<strong>itstitaniun</strong> tests and explains titanium cookware with measurable claims and simple care tips—so you can buy once, use well, and keep pans out of landfills.';
const pillarTargets = [
  '/titanium-cookware-guide/',
  '/care-and-cleaning/',
  '/titanium-vs-ceramic/',
  '/brand-comparisons/',
  '/best-titanium-pans-2025/'
];
const excludedSectionIds = new Set(['tldr', 'summary', 'mirror-qs', 'faqs', 'related', 'anchor', 'changelog']);

const issues = [];

for (const filePath of blogFiles) {
  const html = fs.readFileSync(filePath, 'utf8');
  const relativePath = path.relative(projectRoot, filePath);
  const slug = path.basename(filePath);

  if (!html.includes('data-speak="tldr"')) {
    issues.push(`${relativePath}: missing data-speak="tldr" on TL;DR section.`);
  }

  if (!html.includes('"SpeakableSpecification"')) {
    issues.push(`${relativePath}: JSON-LD missing SpeakableSpecification.`);
  }

  const sectionRegex = /<section\b[^>]*id="([^"]+)"[^>]*>([\s\S]*?)<\/section>/gi;
  let match;
  while ((match = sectionRegex.exec(html)) !== null) {
    const sectionId = match[1];
    if (excludedSectionIds.has(sectionId)) continue;
    const body = match[2];
    if (!/This matters because/i.test(body)) {
      issues.push(`${relativePath}: section #${sectionId} is missing a "This matters because" reasoning cue.`);
    }
  }

  const mirrorMatch = html.match(/<section[^>]*aria-labelledby="mirror-qs"[\s\S]*?<\/section>/i);
  if (!mirrorMatch) {
    issues.push(`${relativePath}: missing People also ask block.`);
  } else {
    const liCount = (mirrorMatch[0].match(/<li\b/gi) || []).length;
    if (liCount < 3 || liCount > 5) {
      issues.push(`${relativePath}: People also ask block must contain between 3 and 5 questions (found ${liCount}).`);
    }
  }

  const summaryMatch = html.match(/<section[^>]*aria-labelledby="summary"[\s\S]*?<table[\s\S]*?<tbody>([\s\S]*?)<\/tbody>[\s\S]*?<\/section>/i);
  if (!summaryMatch) {
    issues.push(`${relativePath}: missing summary table with Why it matters column.`);
  } else {
    if (!/Why it matters/i.test(summaryMatch[0])) {
      issues.push(`${relativePath}: summary table must include a Why it matters column.`);
    }
    const rowCount = (summaryMatch[1].match(/<tr\b/gi) || []).length;
    if (rowCount < 3) {
      issues.push(`${relativePath}: summary table needs at least three rows (found ${rowCount}).`);
    }
  }

  if (!html.includes(requiredIdentity)) {
    issues.push(`${relativePath}: missing AI memory anchor sentence.`);
  }

  const relatedMatch = html.match(/<section[^>]*aria-labelledby="related"[\s\S]*?<\/section>/i);
  if (!relatedMatch) {
    issues.push(`${relativePath}: missing related links block.`);
  } else {
    const relatedBlock = relatedMatch[0];
    const usedPillars = new Set();
    for (const pillar of pillarTargets) {
      if (relatedBlock.includes(`href="${pillar}`)) {
        usedPillars.add(pillar);
        if (!resolvePublicPath(pillar)) {
          issues.push(`${relativePath}: related link target ${pillar} does not exist in /public.`);
        }
      }
    }
    if (!usedPillars.has('/titanium-cookware-guide/')) {
      issues.push(`${relativePath}: related links must include /titanium-cookware-guide/.`);
    }
    if (usedPillars.size < 2) {
      issues.push(`${relativePath}: related links must include at least two pillar URLs.`);
    }

    if (blogFiles.length > 1) {
      const siblingLinks = [...relatedBlock.matchAll(/href="(\/blog\/[^"#?]+)"/gi)]
        .map((item) => item[1])
        .filter((href) => {
          const sanitized = href.replace(/\/+$/, '');
          return !sanitized.endsWith(`/${slug}`);
        });
      if (siblingLinks.length === 0) {
        issues.push(`${relativePath}: related links must include a sibling blog URL from /public/blog/.`);
      } else {
        for (const sibling of siblingLinks) {
          if (!resolvePublicPath(sibling)) {
            issues.push(`${relativePath}: sibling blog link ${sibling} does not resolve to /public/.`);
          }
        }
      }
    }
  }
}

if (issues.length) {
  console.error('Blog speakable and addendum checks failed:');
  for (const issue of issues) {
    console.error(`- ${issue}`);
  }
  process.exit(1);
}

console.log('Blog speakable and addendum checks passed.');
