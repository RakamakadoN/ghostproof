import test from 'node:test';
import assert from 'node:assert/strict';
import { readFileSync, existsSync } from 'node:fs';
import path from 'node:path';
import { fileURLToPath } from 'node:url';
import { execFileSync } from 'node:child_process';

const repo = path.resolve(path.dirname(fileURLToPath(import.meta.url)), '..');
const codexPath = path.join(repo, '.agents/skills/ghostproof/SKILL.md');
const claudePath = path.join(repo, '.claude/skills/ghostproof/SKILL.md');
const contents = [codexPath, claudePath].map(p => readFileSync(p, 'utf8'));

function frontmatter(contents) {
  const match = contents.match(/^---\n([\s\S]*?)\n---\n/);
  assert.ok(match, 'SKILL.md must start with a YAML frontmatter block');
  const fields = {};
  for (const line of match[1].split('\n')) {
    const found = line.match(/^([a-z-]+):\s*(.+)$/);
    assert.ok(found, `Invalid or unsupported frontmatter syntax: ${line}`);
    fields[found[1]] = found[2];
  }
  return fields;
}

test('Codex and Claude Code skill paths exist and stay identical', () => {
  assert.equal(contents[0], contents[1]);
  assert.ok(contents[0].length > 1500);
});

test('both Agent Skills satisfy required specification frontmatter', () => {
  for (const [idx, text] of contents.entries()) {
    const fields = frontmatter(text);
    assert.equal(fields.name, 'ghostproof');
    assert.equal(path.basename(path.dirname([codexPath, claudePath][idx])), fields.name);
    assert.match(fields.name, /^[a-z0-9]+(?:-[a-z0-9]+)*$/);
    assert.ok(fields.name.length <= 64);
    assert.ok(fields.description.length >= 40 && fields.description.length <= 1024);
    assert.ok(fields.compatibility.length <= 500);
    assert.equal(fields.license, 'MIT');
    assert.deepEqual(Object.keys(fields).sort(), ['compatibility', 'description', 'license', 'name']);
  }
});

test('skill does not promote E0 or bundled E1-E3 to external proof', () => {
  const skill = contents[0];
  for (const token of ['E0 — candidate', 'E1 — mechanism', 'E2 — project reproduction', 'E3 — regression']) {
    assert.ok(skill.includes(token), `Missing evidence level: ${token}`);
  }
  assert.match(skill, /no automatic external-project E2\/E3/i);
  assert.match(skill, /untrusted data/i);
  assert.match(skill, /do not silently install/i);
  assert.match(skill, /separate.*permission/i);
  assert.match(skill, /not.*mean zero candidates/i);
});

test('documented executable commands are actually supported by the CLI', () => {
  const help = execFileSync(process.execPath, [path.join(repo, 'bin/ghostproof.mjs'), '--help'], { encoding: 'utf8' });
  for (const command of ['scan', 'check', 'experiment', 'proof', 'verify', 'study']) {
    assert.match(help, new RegExp(`ghostproof ${command}\\b`));
  }
  for (const flag of ['--format', '--fail-on', '--output']) assert.ok(help.includes(flag));
  assert.ok(help.includes('BW001'));
});

test('skill installation documentation and README integration exist', () => {
  const guide = path.join(repo, 'docs/AGENT_SKILL.md');
  assert.ok(existsSync(guide));
  const guideText = readFileSync(guide, 'utf8');
  const readme = readFileSync(path.join(repo, 'README.md'), 'utf8');
  for (const p of ['.agents/skills/ghostproof/SKILL.md', '.claude/skills/ghostproof/SKILL.md']) {
    assert.ok(guideText.includes(p), `Missing installation documentation for ${p}`);
    assert.ok(readme.includes(p), `Missing README integration for ${p}`);
  }
  assert.match(guideText, /copying the skill alone does not install/i);
});
