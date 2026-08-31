#!/usr/bin/env node
/**
 * 生成 fde-handbook/manifest.json —— 工作台知识库/交付物的单一数据源。
 *
 * 扫描 fde-handbook/{01..05}/ 下的文件,按文件名规则归类:
 *   - 含「【知识】」→ category: knowledge
 *   - 含「【交付】」→ category: deliverable
 *   - 文件名以「0-」或「00-」开头(规范说明/导读)→ category: spec
 *   - 其余 → category: other
 *
 * 预览策略(转换均在构建时完成,应用运行时零额外依赖):
 *   - .md  → previewable:true,应用内 markdown 渲染。
 *   - .docx→ 用 mammoth 转成同名 .html 快照写入同目录,previewable:true,
 *            item.previewHtml 指向该快照;原 docx 仍供「用 Word 打开 / 下载」。
 *
 * 用法: node scripts/build-handbook-manifest.js
 * 拷贝源文件更新后重新运行即可。
 */
const fs = require('fs');
const path = require('path');
const mammoth = require('mammoth');

const HANDBOOK_DIR = path.join(__dirname, '..', 'fde-handbook');

// 阶段元数据(与 src/renderer/data/fde-stages.js 对齐,脚本内独立一份避免 ESM 依赖)
const STAGE_META = {
  '01': { id: 1, key: 'research', name: '调研准备 + 备弹知识', short: '调研备弹' },
  '02': { id: 2, key: 'requirement-prototype', name: '需求沟通 + 原型设计', short: '沟通·原型' },
  '03': { id: 3, key: 'confirm-agent', name: '需求确认 + 智能体设计', short: '需求确认·智能体' },
  '04': { id: 4, key: 'nano-workbench', name: '纳米Work 行业工作台', short: '工作台上线' },
  '05': { id: 5, key: 'trial-optimize', name: '客户试用 + 智能体优化', short: '试用·定稿' },
};

function classify(fileName) {
  if (fileName.includes('【知识】')) return 'knowledge';
  if (fileName.includes('【交付】')) return 'deliverable';
  if (/^0{1,2}-/.test(fileName)) return 'spec';
  return 'other';
}

// 去掉「N-」序号前缀和【标签】,得到干净展示名
function displayName(fileName) {
  const base = fileName.replace(/\.(md|docx)$/i, '');
  return base
    .replace(/^[\d.]+-/, '')             // 去序号前缀(支持 0- / 00- / 2.5- 等)
    .replace(/【知识】|【交付】/g, '')     // 去分类标签
    .replace(/（含组织关系）/g, ' (含组织关系)')
    .trim();
}

// 把 docx 转成同目录下的 .html 快照,返回快照文件名(失败返回 null)
async function convertDocxToHtml(dir, docxFile) {
  const docxPath = path.join(dir, docxFile);
  const htmlFile = docxFile.replace(/\.docx$/i, '.html');
  const htmlPath = path.join(dir, htmlFile);
  try {
    const { value } = await mammoth.convertToHtml({ path: docxPath });
    fs.writeFileSync(htmlPath, value, 'utf-8');
    return htmlFile;
  } catch (err) {
    console.warn(`  ! docx 转换失败(${docxFile}): ${err.message}`);
    return null;
  }
}

async function buildStage(stageDir) {
  const dir = path.join(HANDBOOK_DIR, stageDir);
  if (!fs.existsSync(dir)) return null;
  const files = fs.readdirSync(dir)
    .filter((f) => /\.(md|docx)$/i.test(f))
    .sort((a, b) => a.localeCompare(b, 'zh'));

  const items = [];
  for (const f of files) {
    const ext = path.extname(f).slice(1).toLowerCase();
    const item = {
      file: f,
      title: displayName(f),
      type: ext,                    // 'md' | 'docx'
      category: classify(f),        // spec | knowledge | deliverable | other
      previewable: ext === 'md',
    };
    if (ext === 'docx') {
      const htmlFile = await convertDocxToHtml(dir, f);
      if (htmlFile) {
        item.previewHtml = htmlFile;   // 构建时生成的 html 快照
        item.previewable = true;       // docx 也可内嵌预览(渲染 html 快照)
      }
    }
    items.push(item);
  }

  return {
    ...STAGE_META[stageDir],
    dir: stageDir,
    items,
    counts: {
      knowledge: items.filter((i) => i.category === 'knowledge').length,
      deliverable: items.filter((i) => i.category === 'deliverable').length,
    },
  };
}

async function main() {
  const stages = [];
  for (const stageDir of Object.keys(STAGE_META)) {
    const s = await buildStage(stageDir);
    if (s) stages.push(s);
  }

  const manifest = {
    generatedAt: new Date().toISOString(),
    source: '100 FDE作战手册(核心文档快照)',
    stages,
  };

  const outPath = path.join(HANDBOOK_DIR, 'manifest.json');
  fs.writeFileSync(outPath, JSON.stringify(manifest, null, 2), 'utf-8');
  const total = stages.reduce((n, s) => n + s.items.length, 0);
  const htmlCount = stages.reduce((n, s) => n + s.items.filter((i) => i.previewHtml).length, 0);
  console.log(`[handbook] manifest 生成完毕: ${stages.length} 个阶段, ${total} 个文件(其中 ${htmlCount} 份 docx 已转 html 快照) → ${outPath}`);
}

main();
