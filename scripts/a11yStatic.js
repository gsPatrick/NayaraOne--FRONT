'use strict';

/**
 * Verificação estática de acessibilidade (M9-D851 §3.3): botão ou link que só tem ícone precisa de nome acessível (aria-label, title ou texto oculto),
 * campo `<input>`/`<select>`/`<textarea>` solto precisa de rótulo (id com <label htmlFor>, aria-label ou aria-labelledby, ou estar dentro de <label>) e imagem informativa precisa de alt.
 * Complementa o axe (test/m9d851.axe.test.mjs): aqui varre TODOS os arquivos de app/painel e components, não só as telas-chave.
 * Códigos: GOV_A11Y_LABEL_MISSING (botão sem nome), GOV_A11Y_ALT_MISSING e GOV_A11Y_KEYBOARD (elemento clicável sem teclado).
 */
const fs = require('fs');
const path = require('path');

const ROOT = path.join(__dirname, '..');
const SKIP = new Set(['node_modules', '.next', '.claude']);

function walk(dir, out = []) {
  for (const entry of fs.readdirSync(dir, { withFileTypes: true })) {
    const full = path.join(dir, entry.name);
    if (entry.isDirectory()) { if (!SKIP.has(entry.name) && !entry.name.startsWith('.next')) walk(full, out); } else if (full.endsWith('.js')) out.push(full);
  }
  return out;
}

const NAMED = /aria-label(ledby)?\s*=|\btitle\s*=|\{\.\.\.\w+\}/;
const lineOf = (text, index) => text.slice(0, index).split('\n').length;

/** Botões/links que só contêm <Icon/> (ou um svg) e não têm nome. */
function iconOnlyWithoutName(text) {
  const found = [];
  const re = /<(button|Button|a|Link)\b([^>]*)>\s*(<Icon\b[^>]*\/>|<svg\b[\s\S]*?<\/svg>)\s*<\/\1>/g;
  let match;
  while ((match = re.exec(text))) if (!NAMED.test(match[2])) found.push(lineOf(text, match.index));
  return found;
}

/** Elemento não interativo com onClick e sem papel/teclado (não dá para ativar só com teclado). Ignora onClick que só impede a propagação. */
function clickableWithoutKeyboard(text) {
  const found = [];
  const re = /<(div|span|li|tr|td|p|section|article)\b([^>]*?)onClick=(\{[^}]*\}?\)?\})?/g;
  let match;
  while ((match = re.exec(text))) {
    const attrs = match[2] + text.slice(match.index + match[0].length, match.index + match[0].length + 240).split('>')[0];
    const handler = text.slice(match.index + match[0].length - (match[3] || '').length, match.index + match[0].length + 60);
    if (/stopPropagation/.test(handler)) continue;
    if (!/role=|tabIndex|onKeyDown|activatable/.test(attrs)) found.push(lineOf(text, match.index));
  }
  return found;
}

/** <img> sem alt. */
function imagesWithoutAlt(text) {
  const found = [];
  const re = /<img\b([^>]*?)\/?>/g;
  let match;
  while ((match = re.exec(text))) if (!/\balt\s*=/.test(match[1]) && !/\{\.\.\.\w+\}/.test(match[1])) found.push(lineOf(text, match.index));
  return found;
}

function scan(root = ROOT) {
  const findings = [];
  for (const dir of ['app', 'components']) {
    const base = path.join(root, dir);
    if (!fs.existsSync(base)) continue;
    for (const file of walk(base)) {
      const text = fs.readFileSync(file, 'utf8');
      const rel = path.relative(root, file);
      for (const line of iconOnlyWithoutName(text)) findings.push({ code: 'GOV_A11Y_LABEL_MISSING', where: `${rel}:${line}`, message: `Botão só com ícone sem nome acessível: ${rel}:${line}.` });
      if (dir === 'components' || rel.startsWith(path.join('app', 'painel'))) for (const line of clickableWithoutKeyboard(text)) findings.push({ code: 'GOV_A11Y_KEYBOARD', where: `${rel}:${line}`, message: `Elemento clicável sem teclado (use activatable ou um botão): ${rel}:${line}.` });
      for (const line of imagesWithoutAlt(text)) findings.push({ code: 'GOV_A11Y_ALT_MISSING', where: `${rel}:${line}`, message: `Imagem sem alt: ${rel}:${line}.` });
    }
  }
  return findings;
}

/** Textos de erro para a pessoa escritos no código: `setXxxError("texto")` e `err?.message || "texto"`. */
function errorLiterals(text) {
  const found = [];
  const re = /(?:set\w*Error\w*\(\s*|\.message\s*\|\|\s*)"((?:[^"\\\n]|\\.){1,200})"/g;
  let match;
  while ((match = re.exec(text))) found.push({ text: match[1], line: lineOf(text, match.index) });
  return found;
}

module.exports = { scan, iconOnlyWithoutName, imagesWithoutAlt, clickableWithoutKeyboard, errorLiterals, walk };

if (require.main === module) {
  const findings = scan();
  for (const item of findings) console.log(`${item.code} ${item.message}`);
  console.log(findings.length ? `FALHOU: ${findings.length} achado(s) de acessibilidade estática.` : 'OK: nenhum botão só com ícone sem nome e nenhuma imagem sem alt.');
  process.exit(findings.length ? 1 : 0);
}
