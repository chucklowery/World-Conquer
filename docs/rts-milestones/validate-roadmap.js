// Dependency and prompt coverage check; run: node docs/rts-milestones/validate-roadmap.js
'use strict';
const fs = require('fs');
const path = require('path');
const root = __dirname;
const markdown = fs.readFileSync(path.join(root, 'MANIFEST.md'), 'utf8');
const rows = markdown.split('\n').filter(line => /^\| R\d{2} \|/.test(line));
const milestones = new Map();
const allowed = new Set(['planned', 'in_progress', 'blocked', 'completed']);
for (const line of rows) {
  const cells = line.split('|').slice(1, -1).map(cell => cell.trim());
  if (cells.length !== 6) throw new Error(`Malformed milestone row: ${line}`);
  const [id, title, rawDeps, wave, status] = cells;
  if (milestones.has(id)) throw new Error(`Duplicate ID ${id}`);
  if (!allowed.has(status)) throw new Error(`Invalid status for ${id}: ${status}`);
  if (!/^W\d+(?:–W\d+)?$/.test(wave)) throw new Error(`Invalid wave for ${id}`);
  const match = title.match(/^\[[^\]]+\]\((R\d{2}-[^)]+\/PROMPT\.md)\)$/);
  if (!match) throw new Error(`Missing or invalid prompt link for ${id}`);
  const promptPath = match[1];
  if (!promptPath.startsWith(`${id}-`)) throw new Error(`Prompt ID mismatch: ${id}`);
  const prompt = fs.readFileSync(path.join(root, promptPath), 'utf8');
  for (const required of [id, 'MANIFEST.md', 'in_progress', 'completed', 'blocked']) {
    if (!prompt.includes(required)) throw new Error(`${id} prompt lacks ${required}`);
  }
  const deps = rawDeps === '—' ? [] : rawDeps.split(',').map(v => v.trim());
  milestones.set(id, { deps, status });
}
if (milestones.size !== 19) throw new Error(`Expected 19 milestones, found ${milestones.size}`);
const visited = new Set();
const active = new Set();
function walk(id) {
  if (active.has(id)) throw new Error(`Circular dependency at ${id}`);
  if (visited.has(id)) return;
  const entry = milestones.get(id);
  if (!entry) throw new Error(`Missing dependency ${id}`);
  active.add(id);
  for (const dep of entry.deps) walk(dep);
  active.delete(id);
  visited.add(id);
}
for (const id of milestones.keys()) walk(id);
for (const [id, value] of milestones) {
  if (value.status === 'completed') {
    for (const dep of value.deps) {
      if (milestones.get(dep).status !== 'completed') {
        throw new Error(`${id} completed before dependency ${dep}`);
      }
    }
  }
}
console.log(`Validated ${milestones.size} linked milestone prompts and acyclic dependencies.`);
