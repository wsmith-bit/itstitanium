const fs = require('fs');
const path = require('path');

const projectRoot = path.join(__dirname, '..');
const publicRoot = path.join(projectRoot, 'public');
const domainFile = path.join(projectRoot, 'data', 'affiliate-domains.json');

if (!fs.existsSync(domainFile)) {
  console.error('Affiliate domain list not found at data/affiliate-domains.json');
  process.exit(1);
}

const affiliateDomains = JSON.parse(fs.readFileSync(domainFile, 'utf8'));
if (!Array.isArray(affiliateDomains) || affiliateDomains.length === 0) {
  console.error('Affiliate domain list must be a non-empty array.');
  process.exit(1);
}

const htmlFiles = [];
function collectHtml(dir) {
  const entries = fs.readdirSync(dir, { withFileTypes: true });
  for (const entry of entries) {
    if (entry.name.startsWith('.')) continue;
    const fullPath = path.join(dir, entry.name);
    if (entry.isDirectory()) {
      collectHtml(fullPath);
    } else if (entry.isFile() && entry.name.endsWith('.html')) {
      htmlFiles.push(fullPath);
    }
  }
}

collectHtml(publicRoot);

const affiliateRegex = /<a\b[^>]*href="([^"]+)"[^>]*>/gi;
const relRegex = /rel="([^"]+)"/i;
const issues = [];

function isAffiliate(href) {
  const lowerHref = href.toLowerCase();
  if (lowerHref.startsWith('/') || lowerHref.startsWith('#') || lowerHref.startsWith('mailto:') || lowerHref.startsWith('tel:')) {
    return false;
  }
  return affiliateDomains.some((domain) => lowerHref.includes(domain.toLowerCase()));
}

function hasRequiredRel(rel) {
  const parts = rel.split(/\s+/).map((value) => value.trim().toLowerCase()).filter(Boolean);
  return ['sponsored', 'nofollow', 'noopener'].every((value) => parts.includes(value));
}

for (const filePath of htmlFiles) {
  const html = fs.readFileSync(filePath, 'utf8');
  let match;
  while ((match = affiliateRegex.exec(html)) !== null) {
    const href = match[1];
    if (!isAffiliate(href)) continue;
    const tag = match[0];
    const relMatch = tag.match(relRegex);
    if (!relMatch) {
      issues.push(`${path.relative(projectRoot, filePath)} -> ${href} is missing rel="sponsored nofollow noopener"`);
      continue;
    }
    if (!hasRequiredRel(relMatch[1])) {
      issues.push(`${path.relative(projectRoot, filePath)} -> ${href} must include rel="sponsored nofollow noopener"`);
    }
  }
}

if (issues.length) {
  console.error('Affiliate rel attribute check failed:');
  for (const issue of issues) {
    console.error(`- ${issue}`);
  }
  process.exit(1);
}

console.log('Affiliate rel attribute check passed.');
