'use strict';

/**
 * Varredura do padrão de estados de UI (M9-D850 §3.3). Roda em app/painel e components e devolve:
 *  - swallows: `catch` que troca a falha por lista vazia ou valor vazio sem avisar (o que o livro proíbe: "UI endpoint 403 não vira tela vazia enganosa");
 *  - screens: as telas de app/painel (page.js que importam @/lib/api) e se usam o AsyncState / useAsyncState;
 * O handler é aceito quando registra a falha (lookupFallback, reportLookupProblem, setXxxError, setLoadError, AsyncState) ou relança.
 */
const fs = require('fs');
const path = require('path');

const ROOT = path.join(__dirname, '..');
const SKIP = new Set(['node_modules', '.next', '.claude']);
// O próprio módulo de listas auxiliares é quem registra a falha (não é uma tela).
const EXEMPT = [/lib\/asyncState\//];
const ADOPTION = /@\/components\/molecules\/AsyncState\/AsyncState|@\/lib\/asyncState\/useAsyncState/;

function walk(dir, out = []) {
  for (const entry of fs.readdirSync(dir, { withFileTypes: true })) {
    const full = path.join(dir, entry.name);
    if (entry.isDirectory()) { if (!SKIP.has(entry.name)) walk(full, out); } else if (full.endsWith('.js')) out.push(full);
  }
  return out;
}

// Formas que trocam a falha por vazio: `.catch(() => [])`, `.catch(() => null)`, `.catch(() => setX([]))`, `catch { setX([]) }`, `catch { return [] }` e `.then(setX).catch(() => {})` (a lista fica como estava, em silêncio).
const EMPTY_AFTER_CATCH = [
  /^catch\s*(\([^)]*\))?\s*(=>\s*)?\(?\s*(\[\s*\]|null|undefined)\s*\)?\s*[,)]/,
  /^catch\s*(\([^)]*\))?\s*(=>\s*)?\(?\s*set\w+\(\s*(\[\s*\]|null)\s*\)/,
  /^catch\s*(\([^)]*\))?\s*(=>\s*)?\{[^}]{0,140}?(\breturn\s*\[\s*\]|set\w+\(\s*(\[\s*\]|null)\s*\))/,
];
const REPORTS = /lookupFallback|reportLookupProblem|set\w*Error\w*\(|\bthrow\b|setNotice|showError|toast|setRuleMessage/i;

function swallowsIn(text) {
  const found = [];
  const re = /\bcatch\b/g;
  let match;
  while ((match = re.exec(text))) {
    const head = text.slice(match.index, match.index + 320);
    const before = text.slice(Math.max(0, match.index - 240), match.index);
    const statementStart = Math.max(before.lastIndexOf(';'), before.lastIndexOf('\n\n'));
    const chain = before.slice(statementStart + 1);
    const emptyHandler = /^catch\s*(\([^)]*\))?\s*(=>\s*)?\{\s*\}/.test(head) && /\.then\(\s*(set\w+|\([^)]*\)\s*=>\s*\{?\s*(?:if \([^)]*\)\s*)?set\w+)/.test(chain);
    if ((EMPTY_AFTER_CATCH.some((pattern) => pattern.test(head)) || emptyHandler) && !REPORTS.test(head.slice(0, 260))) found.push(text.slice(0, match.index).split('\n').length);
  }
  return found;
}

function scan(root = ROOT) {
  const swallows = [];
  for (const dir of ['app/painel', 'components']) {
    const base = path.join(root, dir);
    if (!fs.existsSync(base)) continue;
    for (const file of walk(base)) {
      const rel = path.relative(root, file);
      if (EXEMPT.some((pattern) => pattern.test(rel))) continue;
      for (const line of swallowsIn(fs.readFileSync(file, 'utf8'))) swallows.push(`${rel}:${line}`);
    }
  }
  const screens = [];
  const painel = path.join(root, 'app/painel');
  for (const file of fs.existsSync(painel) ? walk(painel) : []) {
    if (path.basename(file) !== 'page.js') continue;
    const text = fs.readFileSync(file, 'utf8');
    if (!/@\/lib\/api\//.test(text)) continue;
    screens.push({ file: path.relative(root, file), adopted: ADOPTION.test(text) });
  }
  return { swallows, screens };
}

module.exports = { scan, swallowsIn, ADOPTION };

if (require.main === module) {
  const { swallows, screens } = scan();
  const outside = screens.filter((screen) => !screen.adopted);
  console.log(`Telas de app/painel que carregam dados da API: ${screens.length}. Usam o padrão AsyncState: ${screens.length - outside.length}. Fora do padrão: ${outside.length}.`);
  console.log(`catch que troca a falha por vazio sem avisar: ${swallows.length}.`);
  for (const item of swallows) console.log(`  swallow ${item}`);
  process.exit(swallows.length ? 1 : 0);
}
