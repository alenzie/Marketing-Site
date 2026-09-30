#!/usr/bin/env node
// Content-extraction parity check: compares two `astro build` outputs.
//
//   node scripts/dist-parity.mjs <baseline-dist> <candidate-dist>
//
// Non-HTML files must be byte-identical (CSS/JS/images must not change).
// HTML files are classified as:
//   identical   byte-for-byte equal
//   equivalent  equal after normalizing the two things a literal -> `{expr}` move
//               changes without changing what the browser renders:
//                 1. entity spelling: Astro escapes expressions (' -> &#39;, & -> &amp;)
//                    where the literal source had a raw character;
//                 2. whitespace runs: Astro's compressHTML emits "\n" around literal
//                    text on its own line but " " around an expression on its own line;
//                 3. empty attributes: a literal alt="" becomes a bare `alt` when the
//                    value comes from an expression (identical per the HTML spec).
//               Whitespace runs are collapsed, never removed, so a dropped or added
//               space between two elements is still reported as a difference.
//   DIFFERENT   anything else (printed with context); the script exits 1.
import { readdirSync, readFileSync, statSync } from 'node:fs';
import { join, relative } from 'node:path';

const [baseDir, candDir] = process.argv.slice(2);
if (!baseDir || !candDir) {
  console.error('usage: node scripts/dist-parity.mjs <baseline-dist> <candidate-dist>');
  process.exit(2);
}

const walk = (dir) =>
  readdirSync(dir).flatMap((name) => {
    const p = join(dir, name);
    return statSync(p).isDirectory() ? walk(p) : [p];
  });
const files = (dir) => new Set(walk(dir).map((p) => relative(dir, p)));

const normalize = (html) =>
  html
    .replace(/&#39;|&#x27;/g, "'")
    .replace(/&quot;|&#34;/g, '"')
    .replace(/&gt;/g, '>')
    .replace(/&lt;/g, '<')
    .replace(/&#38;|&amp;/g, '&')
    .replace(/\s+/g, ' ')
    .replace(/(<[a-zA-Z][^<>]*?\s[a-zA-Z][\w:-]*)=""(?=[\s/>])/g, '$1');

const base = files(baseDir);
const cand = files(candDir);
let failed = false;
const counts = { identical: 0, equivalent: 0, different: 0 };

for (const f of [...base].filter((f) => !cand.has(f))) {
  console.log(`MISSING in candidate: ${f}`);
  failed = true;
}
for (const f of [...cand].filter((f) => !base.has(f))) {
  console.log(`EXTRA in candidate:   ${f}`);
  failed = true;
}

for (const f of [...base].filter((f) => cand.has(f)).sort()) {
  const a = readFileSync(join(baseDir, f));
  const b = readFileSync(join(candDir, f));
  if (a.equals(b)) {
    if (f.endsWith('.html')) counts.identical++;
    continue;
  }
  if (!f.endsWith('.html')) {
    console.log(`DIFFERENT (non-HTML, must be byte-identical): ${f}`);
    failed = true;
    continue;
  }
  const na = normalize(a.toString('utf8'));
  const nb = normalize(b.toString('utf8'));
  if (na === nb) {
    counts.equivalent++;
    console.log(`equivalent: ${f}`);
    continue;
  }
  counts.different++;
  failed = true;
  let i = 0;
  while (i < na.length && na[i] === nb[i]) i++;
  console.log(`DIFFERENT: ${f}\n  baseline:  …${na.slice(Math.max(0, i - 120), i + 160)}…\n  candidate: …${nb.slice(Math.max(0, i - 120), i + 160)}…`);
}

console.log(
  `\nHTML: ${counts.identical} identical, ${counts.equivalent} equivalent, ${counts.different} different; ` +
    `${failed ? 'FAIL' : 'PASS'}`,
);
process.exit(failed ? 1 : 0);
