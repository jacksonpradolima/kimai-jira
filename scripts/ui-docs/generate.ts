import { createHash } from 'node:crypto';
import { existsSync } from 'node:fs';
import { mkdtemp, readdir, readFile, rm, writeFile } from 'node:fs/promises';
import { tmpdir } from 'node:os';
import { join, resolve } from 'node:path';
import { chromium } from '@playwright/test';
import type { UiDocumentationFixture } from './fixtures';

interface ForgeNode {
  type: string;
  props: Record<string, unknown>;
  children: ForgeNode[];
}

const generatedDirectory = resolve('docs/ui/generated');
const checkMode = process.argv.includes('--check');
const generatedReadme = '# Generated UI assets\n\n**AUTO-GENERATED — DO NOT EDIT MANUALLY.** Run `npm run docs:ui` to recreate every PNG in this directory from the production UI views and deterministic fixtures.\n';
let forgeReconciler: { render: (element: UiDocumentationFixture['element']) => void };
let fixtures: UiDocumentationFixture[];
const manifestFileName = 'manifest.json';
const documentationSources = [
  'scripts/ui-docs/generate.ts',
  'scripts/ui-docs/fixtures.tsx',
  'src/frontend/admin/AdminView.tsx',
  'src/frontend/issue-context/IssueContextView.tsx',
];

function escapeHtml(value: unknown): string {
  return String(value)
    .replace(/&/g, '&amp;')
    .replace(/</g, '&lt;')
    .replace(/>/g, '&gt;')
    .replace(/"/g, '&quot;')
    .replace(/'/g, '&#39;');
}

function readText(node: ForgeNode): string {
  if (node.type === 'String') return String(node.props.text ?? '');
  return node.children.map(readText).join('');
}

function renderTabs(node: ForgeNode): string {
  const selectedIndex = Number(node.props.defaultSelected ?? 0);
  const tabList = node.children.find((child) => child.type === 'TabList');
  const panels = node.children.filter((child) => child.type === 'TabPanel');
  const tabs = (tabList?.children ?? []).map((tab, index) =>
    `<span class="tab${index === selectedIndex ? ' tab--selected' : ''}">${escapeHtml(readText(tab))}</span>`,
  ).join('');
  return `<div class="tabs"><div class="tab-list">${tabs}</div><div class="tab-panel">${renderNode(panels[selectedIndex] ?? panels[0])}</div></div>`;
}

function renderNode(node: ForgeNode | undefined): string {
  if (!node) return '';
  if (node.type === 'String') return escapeHtml(node.props.text ?? '');
  const children = node.children.map(renderNode).join('');
  switch (node.type) {
    case 'Root': return children;
    case 'Stack': return `<div class="stack">${children}</div>`;
    case 'Box': return `<div style="border-top:1px solid #dfe1e6;padding-top:12px">${children}</div>`;
    case 'Inline': {
      const classes = [
        'inline',
        node.props.shouldWrap === false ? 'inline--time-row' : '',
        node.props.alignInline === 'center' ? 'inline--center' : '',
        node.props.grow === 'fill' && node.props.shouldWrap !== false ? 'inline--fill' : '',
      ].filter(Boolean).join(' ');
      return `<div class="${classes}">${children}</div>`;
    }
    case 'Tabs': return renderTabs(node);
    case 'TabList':
    case 'TabPanel': return children;
    case 'Text': return `<div class="text">${children}</div>`;
    case 'Select': {
      const value = node.props.value as { label?: unknown } | null;
      return `<div class="select">${escapeHtml(value?.label ?? node.props.placeholder ?? '')}<span>⌄</span></div>`;
    }
    case 'LoadingButton':
    case 'Button': return `<button class="button${node.props.appearance === 'primary' ? ' button--primary' : ''}"${node.props.shouldFitContainer ? ' style="width:100%"' : ''}>${children}</button>`;
    case 'FormSection': return `<section class="form-section">${children}</section>`;
    case 'Label': return `<label>${children}</label>`;
    case 'Textfield': {
      const value = node.props.type === 'password' ? '••••••••••••' : node.props.value ?? '';
      return `<input class="${node.props.isReadOnly ? 'input--readonly' : ''}" readonly value="${escapeHtml(value)}" />`;
    }
    case 'TextArea': return `<textarea readonly>${escapeHtml(node.props.value ?? '')}</textarea>`;
    case 'Checkbox': return `<label class="checkbox"><input type="checkbox"${node.props.isChecked ? ' checked' : ''} />${escapeHtml(node.props.label ?? '')}</label>`;
    case 'TagGroup': return `<div class="tag-group">${children}</div>`;
    case 'Tag': return `<span class="tag">${escapeHtml(node.props.text ?? '')}</span>`;
    default: return `<div class="forge-${escapeHtml(node.type).toLowerCase()}">${children}</div>`;
  }
}

function documentationShell(fixture: UiDocumentationFixture, content: string): string {
  const issueShell = fixture.kind === 'issue'
    ? `<main class="issue-page"><div class="issue-content"><p class="crumb">Projects / Kimai for Jira / KJ-142</p><h1>Implement Jira/Kimai synchronization</h1><div class="issue-rule"></div><h2>Issue information</h2><p>Track work for this Jira issue with the Kimai integration.</p></div><aside class="issue-sidebar"><p class="panel-title">Kimai</p><div class="forge-view">${content}</div></aside></main>`
    : `<main class="admin-page"><p class="crumb">Jira administration / Apps</p><h1>Kimai Integration</h1><p class="admin-intro">Configure the Kimai integration for this Jira site.</p><div class="forge-view admin-view">${content}</div></main>`;
  return `<!doctype html><html lang="en"><head><meta charset="utf-8"><style>
    * { box-sizing: border-box; } html { background: #f7f8f9; } body { margin: 0; min-width: 1000px; color: #172b4d; background: #f7f8f9; font: 15px -apple-system, BlinkMacSystemFont, "Segoe UI", sans-serif; } body::before { content: "Jira"; display: block; height: 58px; padding: 16px 52px; color: white; background: #0c66e4; font-size: 22px; font-weight: 700; } h1 { margin: 8px 0 18px; color: #172b4d; font-size: 29px; } h2 { font-size: 18px; } .crumb { margin: 0; color: #6b778c; font-size: 13px; } .issue-page { display: grid; grid-template-columns: minmax(0, 1fr) 410px; gap: 36px; max-width: 1336px; margin: 44px auto; padding: 0 38px; } .issue-content { padding: 12px; } .issue-rule { height: 1px; margin: 34px 0 26px; background: #dfe1e6; } .issue-sidebar { align-self: start; overflow: hidden; border: 1px solid #dfe1e6; border-radius: 5px; background: white; box-shadow: 0 1px 2px #091e4226; } .panel-title { margin: 0; padding: 15px 18px; border-bottom: 1px solid #dfe1e6; font-weight: 600; } .forge-view { padding: 18px; } .admin-page { max-width: 940px; margin: 42px auto; padding: 0 42px 48px; } .admin-intro { margin: -8px 0 24px; color: #5e6c84; } .admin-view { max-width: 720px; padding: 22px; border: 1px solid #dfe1e6; border-radius: 5px; background: white; box-shadow: 0 1px 2px #091e4226; } .stack { display: grid; gap: 10px; } .admin-view .stack { gap: 7px; } .tabs { margin: -18px; } .tab-list { display: flex; gap: 20px; padding: 0 18px; border-bottom: 1px solid #dfe1e6; } .tab { padding: 13px 2px 10px; color: #5e6c84; font-weight: 500; } .tab--selected { border-bottom: 2px solid #0c66e4; color: #0c66e4; } .tab-panel { padding: 18px; } .text { line-height: 1.45; } .select, input, textarea { min-height: 40px; width: 100%; border: 1px solid #8590a2; border-radius: 3px; padding: 9px 11px; color: #172b4d; background: white; font: inherit; } textarea { min-height: 64px; resize: none; } .input--readonly { color: #172b4d; background: #f1f2f4; font-weight: 600; } .admin-view input { min-height: 34px; padding: 6px 10px; } .select { display: flex; justify-content: space-between; } button { width: fit-content; min-height: 34px; padding: 7px 14px; border: 0; border-radius: 3px; color: #172b4d; background: #091e420f; font: inherit; font-weight: 500; } .button--primary { color: white; background: #0c66e4; } .form-section { display: grid; gap: 6px; } .admin-view .form-section { gap: 3px; } label { color: #172b4d; font-weight: 600; } .inline { display: flex; gap: 8px; } .inline--time-row { display: grid; grid-template-columns: repeat(3, minmax(0, 1fr)); align-items: start; } .inline--fill { align-items: end; } .inline--fill input { flex: 1; } .inline--center { justify-content: center; } .tag-group { display: flex; flex-wrap: wrap; gap: 6px; } .tag-group .inline { align-items: center; gap: 3px; } .tag { display: inline-flex; align-items: center; min-height: 28px; padding: 4px 8px; border-radius: 3px; color: #0055cc; background: #deebff; font-size: 13px; font-weight: 600; } .tag-group button { min-height: 28px; padding: 4px 7px; font-size: 12px; } .checkbox { display: flex; align-items: center; gap: 8px; } .checkbox input { min-height: auto; width: auto; } .admin-view > .stack > .text:first-child { font-size: 20px; font-weight: 600; } * { animation: none !important; transition: none !important; caret-color: transparent !important; }
  </style></head><body><div id="ui-docs-ready">${issueShell}</div></body></html>`;
}

async function renderForgeDocument(element: UiDocumentationFixture['element']): Promise<ForgeNode> {
  return new Promise((resolveDocument) => {
    (globalThis as unknown as { self: unknown }).self = {
      __bridge: {
        callBridge(command: string, data: { forgeDoc?: ForgeNode }) {
          if (command === 'reconcile' && data.forgeDoc) resolveDocument(data.forgeDoc);
        },
      },
    };
    forgeReconciler.render(element);
  });
}

async function createScreenshots(outputDirectory: string): Promise<void> {
  const browser = await chromium.launch();
  try {
    for (const fixture of fixtures) {
      const document = await renderForgeDocument(fixture.element);
      const page = await browser.newPage({
        deviceScaleFactor: 1,
        viewport: fixture.kind === 'issue' ? { width: 1440, height: 900 } : { width: 1440, height: 1000 },
      });
      await page.setContent(documentationShell(fixture, renderNode(document)), { waitUntil: 'domcontentloaded' });
      await page.locator('#ui-docs-ready').waitFor({ state: 'visible' });
      await page.screenshot({ animations: 'disabled', fullPage: fixture.fullPage ?? false, path: join(outputDirectory, fixture.fileName) });
      await page.close();
    }
  } finally {
    await browser.close();
  }
}

function hash(value: string): string {
  return createHash('sha256').update(value).digest('hex');
}

async function generatedManifest(): Promise<string> {
  const [sourceFiles, documents] = await Promise.all([
    Promise.all(documentationSources.map(async (file) =>
      (await readFile(resolve(file), 'utf8')).replace(/\r\n/g, '\n'),
    )),
    Promise.all(fixtures.map(async (fixture) => [
      fixture.fileName,
      hash(documentationShell(fixture, renderNode(await renderForgeDocument(fixture.element)))),
    ] as const)),
  ]);
  return `${JSON.stringify({
    schemaVersion: 1,
    sourceHash: hash(sourceFiles.join('\n--- UI DOC SOURCE ---\n')),
    fixtures: Object.fromEntries(documents),
  }, null, 2)}\n`;
}

async function generatedAssetsMatch(expectedManifest: string): Promise<boolean> {
  const expectedFiles = ['README.md', manifestFileName, ...fixtures.map((fixture) => fixture.fileName)].sort();
  const actualFiles = existsSync(generatedDirectory) ? (await readdir(generatedDirectory)).sort() : [];
  if (actualFiles.join('\n') !== expectedFiles.join('\n')) return false;
  const actualManifest = await readFile(join(generatedDirectory, manifestFileName), 'utf8');
  return actualManifest === expectedManifest;
}

async function main(): Promise<void> {
  // @forge/react imports @forge/bridge. A harmless bridge stub lets its
  // document reconciler load outside Jira; fixtures never invoke a resolver.
  (globalThis as typeof globalThis & { __bridge: { callBridge: () => undefined } }).__bridge = {
    callBridge: () => undefined,
  };
  ({ default: forgeReconciler } = await import('@forge/react'));
  ({ uiDocumentationFixtures: fixtures } = await import('./fixtures'));
  const manifest = await generatedManifest();
  if (checkMode) {
    if (!await generatedAssetsMatch(manifest)) {
      throw new Error('UI documentation is out of date. Run:\n\n  npm run docs:ui\n\nand commit the regenerated assets.');
    }
    return;
  }
  const temporaryDirectory = await mkdtemp(join(tmpdir(), 'kimai-jira-ui-docs-'));
  try {
    await createScreenshots(temporaryDirectory);
    await writeFile(join(temporaryDirectory, 'README.md'), generatedReadme);
    await writeFile(join(temporaryDirectory, manifestFileName), manifest);
    await rm(generatedDirectory, { recursive: true, force: true });
    // Rename is deliberately avoided because temp and workspace may be different volumes on Windows.
    const files = await readdir(temporaryDirectory);
    const { mkdir, copyFile } = await import('node:fs/promises');
    await mkdir(generatedDirectory, { recursive: true });
    await Promise.all(files.map((file) => copyFile(join(temporaryDirectory, file), join(generatedDirectory, file))));
  } finally {
    await rm(temporaryDirectory, { recursive: true, force: true });
  }
}

main().catch((error: unknown) => {
  console.error(error instanceof Error ? error.message : error);
  process.exitCode = 1;
});
