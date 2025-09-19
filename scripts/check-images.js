#!/usr/bin/env node
const fs = require('fs');
const path = require('path');

const IMG_DIR = path.join(process.cwd(), 'public', 'assets', 'img');
const ALT_MAP_PATH = path.join(IMG_DIR, 'alts.json');

function fail(message) {
  console.error(`\u001b[31m[check-images]\u001b[0m ${message}`);
  process.exit(1);
}

if (!fs.existsSync(IMG_DIR) || !fs.statSync(IMG_DIR).isDirectory()) {
  fail(`Image directory not found at ${IMG_DIR}`);
}

if (!fs.existsSync(ALT_MAP_PATH)) {
  fail(`Alt text map missing at ${ALT_MAP_PATH}`);
}

let altEntries;
try {
  const altRaw = fs.readFileSync(ALT_MAP_PATH, 'utf8');
  const sanitized = altRaw.replace(/^\uFEFF/, '');
  altEntries = JSON.parse(sanitized);
} catch (error) {
  fail(`Unable to parse JSON from ${ALT_MAP_PATH}: ${error.message}`);
}

const webpImages = fs
  .readdirSync(IMG_DIR)
  .filter((name) => name.toLowerCase().endsWith('.webp'));

if (webpImages.length === 0) {
  fail('No .webp images discovered to validate.');
}

const missingAlt = [];
const invalidAlt = [];

for (const image of webpImages) {
  if (!(image in altEntries)) {
    missingAlt.push(image);
    continue;
  }
  const alt = altEntries[image];
  if (typeof alt !== 'string' || alt.trim().length < 5) {
    invalidAlt.push({ image, alt });
  }
}

const definedKeys = new Set(Object.keys(altEntries));
const dangling = [...definedKeys].filter((key) => !webpImages.includes(key));

if (missingAlt.length > 0 || invalidAlt.length > 0 || dangling.length > 0) {
  if (missingAlt.length > 0) {
    console.error('Missing alt text entries for:');
    for (const image of missingAlt) {
      console.error(`  - ${image}`);
    }
  }
  if (invalidAlt.length > 0) {
    console.error('Invalid alt text entries (require 5+ visible characters):');
    for (const { image, alt } of invalidAlt) {
      console.error(`  - ${image}: ${JSON.stringify(alt)}`);
    }
  }
  if (dangling.length > 0) {
    console.error('Alt text entries exist for files not found on disk:');
    for (const key of dangling) {
      console.error(`  - ${key}`);
    }
  }
  process.exit(1);
}

console.log(
  `Validated ${webpImages.length} images with matching descriptive alt text entries.`
);
