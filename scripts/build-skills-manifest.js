#!/usr/bin/env node
/**
 * Build skills/manifest.json by scanning skills/*\/SKILL.md frontmatter,
 * parsing name / description / version, grouping by purpose for the skills page.
 *
 * Idempotent; safe to re-run. The output is committed; the build does not
 * strictly depend on this script (it only regenerates the manifest).
 *
 *   node scripts/build-skills-manifest.js
 */
const fs = require('fs');
const path = require('path');

const SKILLS_DIR = path.join(__dirname, '..', 'skills');

// group key -> display name + icon + color + member skill ids. Unmatched -> general.
const GROUPS = [
  { id: 'product-doc',   name: '产品文档',   icon: 'file-lines',      color: '#2563eb',
    members: ['product-prd-allinone', 'product-feature-spec', 'product-doc-to-word', 'md-export'] },
  { id: 'prototype',     name: '原型设计',   icon: 'window-maximize', color: '#7c3aed',
    members: ['prototype-generator', 'prototype-iterate'] },
  { id: 'report-image',  name: '汇报出图',   icon: 'image',           color: '#d97706',
    members: ['360-ppt-generator', 'business-architecture-image', 'fireworks-tech-graph', 'image-generator'] },
  { id: 'dataviz',       name: '数据可视化', icon: 'chart-column',    color: '#0891b2',
    members: ['dashboard-generator'] },
  { id: 'coach',         name: '教练陪练',   icon: 'headset',         color: '#059669',
    members: ['fde-coach'] },
  { id: 'thinking',      name: '思考协作',   icon: 'lightbulb',       color: '#ca8a04',
    members: ['brainstorming', 'collaborative-planning-board', 'first-principles-critic'] },
  { id: 'general',       name: '通用工具',   icon: 'toolbox',         color: '#64748b', members: [] },
];

// per-skill icon override (falls back to its group icon)
const SKILL_ICONS = {
  'product-prd-allinone': 'file-contract',
  'product-feature-spec': 'list-check',
  'product-doc-to-word': 'file-word',
  'md-export': 'file-export',
  'prototype-generator': 'wand-magic-sparkles',
  'prototype-iterate': 'pen-ruler',
  '360-ppt-generator': 'file-powerpoint',
  'business-architecture-image': 'sitemap',
  'fireworks-tech-graph': 'diagram-project',
  'image-generator': 'palette',
  'dashboard-generator': 'chart-line',
  'fde-coach': 'headset',
  'brainstorming': 'lightbulb',
  'collaborative-planning-board': 'chalkboard-user',
  'first-principles-critic': 'scale-balanced',
};

// Parse the first frontmatter block; supports | > block scalars, quotes.
function parseFrontmatter(rawText) {
  const text = rawText.replace(/\r\n/g, '\n').replace(/\r/g, '\n');
  const m = text.match(/^---\s*\n([\s\S]*?)\n---/);
  if (!m) return {};
  const lines = m[1].split('\n');
  const out = {};
  for (let i = 0; i < lines.length; i++) {
    const kv = lines[i].match(/^([A-Za-z0-9_-]+):\s*(.*)$/);
    if (!kv) continue;
    const key = kv[1];
    let val = kv[2];
    if (val === '|' || val === '>' || val === '|-' || val === '>-' || val === '') {
      const collected = [];
      for (let j = i + 1; j < lines.length; j++) {
        if (/^\s+\S/.test(lines[j])) { collected.push(lines[j].replace(/^\s+/, '')); i = j; }
        else if (lines[j].trim() === '') { collected.push(''); i = j; }
        else break;
      }
      if (collected.length) val = collected.join(val === '>' || val === '>-' ? ' ' : '\n').trim();
    }
    val = val.replace(/^["']|["']$/g, '').trim();
    if (val !== '') out[key] = val;
  }
  return out;
}

// One-line summary: first sentence of description, capped.
function toSummary(desc) {
  if (!desc) return '';
  let s = desc.replace(/\s+/g, ' ').trim();
  const cut = s.search(/[。.]/);
  if (cut > 8) s = s.slice(0, cut + 1);
  if (s.length > 90) s = s.slice(0, 88) + '…';
  return s;
}

function groupOf(id) {
  for (const g of GROUPS) if (g.members.includes(id)) return g.id;
  return 'general';
}

function groupMeta(gid) {
  return GROUPS.find((g) => g.id === gid) || GROUPS[GROUPS.length - 1];
}

function main() {
  const entries = fs.readdirSync(SKILLS_DIR, { withFileTypes: true })
    .filter((d) => d.isDirectory())
    .map((d) => d.name);

  const skills = [];
  for (const dir of entries) {
    const candidate = ['SKILL.md', 'skill.md']
      .map((f) => path.join(SKILLS_DIR, dir, f))
      .find((p) => fs.existsSync(p));
    if (!candidate) continue;
    const fm = parseFrontmatter(fs.readFileSync(candidate, 'utf-8'));
    const description = fm.description || '';
    const group = groupOf(dir);
    const meta = groupMeta(group);
    skills.push({
      id: dir,
      name: fm.name || dir,
      file: path.basename(candidate),
      group,
      icon: SKILL_ICONS[dir] || meta.icon,
      color: meta.color,
      version: fm.version || '',
      summary: toSummary(description),
      description,
    });
  }

  skills.sort((a, b) => a.group.localeCompare(b.group) || a.name.localeCompare(b.name));

  const groups = GROUPS
    .map((g) => ({ id: g.id, name: g.name, icon: g.icon, color: g.color,
      count: skills.filter((s) => s.group === g.id).length }))
    .filter((g) => g.count > 0);

  const manifest = {
    generatedAt: new Date().toISOString(),
    source: 'product-lobster-desktop/skills',
    groups,
    skills,
  };

  const outPath = path.join(SKILLS_DIR, 'manifest.json');
  fs.writeFileSync(outPath, JSON.stringify(manifest, null, 2) + '\n', 'utf-8');
  console.log(`[skills-manifest] wrote ${skills.length} skills, ${groups.length} groups -> ${outPath}`);
}

main();
