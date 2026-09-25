/**
 * Executes the *shipped* production bundle inside a DOM and reports what it
 * renders.
 *
 * This is not static analysis and not a re-implementation: the exact files in
 * `dist/assets/` that the browser would download are evaluated as ES modules in
 * a jsdom window, so React really mounts and the access gate really runs.
 *
 * Run as a child process because `vm.SourceTextModule` needs
 * `--experimental-vm-modules`, which cannot be enabled from inside a running
 * Node process. Prints one JSON object on stdout.
 */

import { readFile, readdir } from 'node:fs/promises';
import vm from 'node:vm';
import { JSDOM, VirtualConsole } from 'jsdom';

const DIST = 'dist';

export async function runProductionBundle() {
  const indexHtml = await readFile(`${DIST}/index.html`, 'utf8');

  const virtualConsole = new VirtualConsole();
  const consoleErrors = [];
  const fetchCalls = [];
  virtualConsole.on('jsdomError', (error) => consoleErrors.push(String(error.message || error)));
  virtualConsole.on('error', (...args) => consoleErrors.push(args.map(String).join(' ')));

  const dom = new JSDOM(indexHtml, {
    runScripts: 'dangerously',
    pretendToBeVisual: true,
    virtualConsole,
    url: 'https://psikolog.invalid/',
  });
  const context = dom.getInternalVMContext();

  // Browser APIs jsdom does not implement that the bundle touches at startup.
  dom.window.matchMedia = dom.window.matchMedia
    || (() => ({ matches: false, addEventListener() {}, removeEventListener() {} }));
  // jsdom has no fetch. The bundle's modulepreload polyfill calls it for its own
  // chunks; a resolved stub is enough, and every call is recorded so an attempt
  // to reach a real backend would be visible in the result.
  dom.window.fetch = (url) => {
    fetchCalls.push(String(url));
    return Promise.resolve({
      ok: true,
      status: 200,
      text: async () => '',
      json: async () => ({}),
      arrayBuffer: async () => new ArrayBuffer(0),
    });
  };

  const modules = new Map();
  for (const file of (await readdir(`${DIST}/assets`)).filter((name) => name.endsWith('.js'))) {
    const code = await readFile(`${DIST}/assets/${file}`, 'utf8');
    modules.set(`./assets/${file}`, new vm.SourceTextModule(code, { context, identifier: file }));
  }

  const entryMatch = /src="\/(assets\/[^"]+\.js)"/.exec(indexHtml);
  if (!entryMatch) throw new Error('index.html does not reference an entry chunk');
  const entry = `./${entryMatch[1]}`;
  const entryModule = modules.get(entry);
  if (!entryModule) throw new Error(`entry chunk ${entry} not found in dist/assets`);

  // Every chunk lives in dist/assets and imports its siblings as './<file>'.
  await entryModule.link((specifier) => {
    const target = modules.get(`./assets/${specifier.replace(/^\.\//, '')}`);
    if (!target) throw new Error(`unresolved import ${specifier}`);
    return target;
  });
  await entryModule.evaluate();

  // Let React flush the initial mount.
  await new Promise((resolve) => setTimeout(resolve, 1500));

  const html = dom.window.document.body.innerHTML;
  const result = {
    entry: entryMatch[1],
    text: (dom.window.document.body.textContent || '').replace(/\s+/g, ' ').trim(),
    contains: {
      notReady: html.includes('Çalışma alanı hazır değil'),
      dashboard: html.includes('Bugünün tahtası'),
      login: html.includes('Hoş geldiniz'),
      publicSignup: html.includes('Kayıt Ol'),
      clients: html.includes('Danışan Dosyaları'),
      formulation: html.includes('Vaka formülasyonu'),
      safetyPlan: html.includes('Güvenlik planı'),
      reports: html.includes('Raporlar'),
      appointments: html.includes('Randevular'),
    },
    fetchCalls,
    consoleErrors,
  };
  dom.window.close();
  return result;
}

// Direct invocation (child process entry point).
if (process.argv[1] && process.argv[1].endsWith('runProductionBundle.mjs')) {
  try {
    const result = await runProductionBundle();
    process.stdout.write(JSON.stringify(result));
    process.exit(0);
  } catch (error) {
    process.stdout.write(JSON.stringify({ failed: true, error: String(error && error.message || error) }));
    process.exit(1);
  }
}
