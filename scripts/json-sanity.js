#!/usr/bin/env node
const fs = require('fs');
const path = require('path');

const ROOT = path.resolve(__dirname, '..');

function listJsonFiles(dir) {
  return fs.readdirSync(dir).filter((file) => file.endsWith('.json'));
}

function walkHtml(dir, results) {
  for (const entry of fs.readdirSync(dir, { withFileTypes: true })) {
    if (entry.name.startsWith('.')) continue;
    const fullPath = path.join(dir, entry.name);
    if (entry.isDirectory()) {
      walkHtml(fullPath, results);
    } else if (entry.isFile() && entry.name.endsWith('.html')) {
      results.push(fullPath);
    }
  }
}

function main() {
  let failures = 0;
  const dataDir = path.join(ROOT, 'data');
  const dataFiles = listJsonFiles(dataDir);
  dataFiles.forEach((file) => {
    const full = path.join(dataDir, file);
    try {
      JSON.parse(fs.readFileSync(full, 'utf8'));
    } catch (error) {
      console.error(`Invalid JSON in ${path.relative(ROOT, full)}: ${error.message}`);
      failures += 1;
    }
  });

  const htmlFiles = [];
  walkHtml(path.join(ROOT, 'public'), htmlFiles);
  htmlFiles.forEach((file) => {
    const html = fs.readFileSync(file, 'utf8');
    const scripts = html.match(/<script[^>]+type=["']application\/ld\+json["'][^>]*>([\s\S]*?)<\/script>/gi) || [];
    scripts.forEach((block, index) => {
      const inner = block.replace(/^[^>]*>/, '').replace(/<\/script>$/i, '').trim();
      if (!inner) return;
      try {
        JSON.parse(inner);
      } catch (error) {
        console.error(`Invalid JSON-LD in ${path.relative(ROOT, file)} (block ${index + 1}): ${error.message}`);
        failures += 1;
      }
    });
  });

  if (failures > 0) {
    process.exitCode = 1;
  } else {
    console.log('JSON sanity checks passed');
  }
}

main();
