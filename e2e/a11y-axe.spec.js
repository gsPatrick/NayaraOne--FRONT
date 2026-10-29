'use strict';

/**
 * Acessibilidade com navegador (M9-D851 §3.6): @axe-core/playwright nas telas-chave de e2e/a11y-pages.json, COM a regra de contraste
 * (que o axe sem navegador não calcula). Qualquer violação serious ou critical reprova com GOV_A11Y_VIOLATION. Grava o relatório em
 * docs/evidencias/a11y-axe-<data>.json. NÃO FOI EXECUTADO NO MARCO 9 (regra de operação: sem Playwright nesta rodada); o equivalente sem
 * navegador roda no CI em test/m9d851.axe.test.mjs, e a evidência de tela é o roteiro do Claude Browser em docs/a11y-checklist.md.
 *
 * Uso: E2E_EMAIL=... E2E_PASSWORD=... node e2e/a11y-axe.spec.js   (usuário de teste QA-M9; nunca credencial real)
 */
const fs = require('fs');
const path = require('path');
const { chromium } = require('playwright');
const AxeBuilder = require('@axe-core/playwright').default;

const BASE_URL = process.env.E2E_BASE_URL || 'http://localhost:3000';
const pages = JSON.parse(fs.readFileSync(path.join(__dirname, 'a11y-pages.json'), 'utf8')).paginas;

async function main() {
  const email = process.env.E2E_EMAIL;
  const password = process.env.E2E_PASSWORD;
  if (!email || !password) throw new Error('Informe E2E_EMAIL e E2E_PASSWORD (usuário de teste QA-M9).');
  const browser = await chromium.launch();
  const page = await browser.newPage({ viewport: { width: 1280, height: 900 } });
  page.setDefaultTimeout(30000);
  const report = [];
  let failed = 0;
  try {
    for (const target of pages.filter((item) => !item.painel)) {
      await page.goto(`${BASE_URL}${target.path}`, { waitUntil: 'networkidle' });
      report.push(await audit(page, target));
    }
    await page.goto(`${BASE_URL}/entrar`, { waitUntil: 'domcontentloaded' });
    await page.fill('input[type=email]', email);
    await page.fill('input[type=password]', password);
    await page.click('button[type=submit]');
    await page.waitForURL((url) => !url.pathname.includes('/entrar'));
    for (const target of pages.filter((item) => item.painel)) {
      await page.goto(`${BASE_URL}${target.path}`, { waitUntil: 'networkidle' });
      report.push(await audit(page, target));
    }
  } finally {
    await browser.close();
  }
  for (const item of report) {
    const bad = item.violacoes.filter((v) => v.impacto === 'serious' || v.impacto === 'critical');
    if (bad.length) { failed += 1; console.error(`GOV_A11Y_VIOLATION Violação de acessibilidade: ${bad.map((v) => v.regra).join(', ')} em ${item.pagina}.`); }
    else console.log(`[OK ] ${item.pagina}: ${item.violacoes.length} violação(ões) abaixo de serious`);
  }
  const dir = path.join(__dirname, '..', 'docs', 'evidencias');
  fs.mkdirSync(dir, { recursive: true });
  fs.writeFileSync(path.join(dir, `a11y-axe-${new Date().toISOString().slice(0, 10)}.json`), JSON.stringify(report, null, 2));
  process.exit(failed ? 1 : 0);
}

async function audit(page, target) {
  const results = await new AxeBuilder({ page }).withTags(['wcag2a', 'wcag2aa', 'wcag21a', 'wcag21aa']).analyze();
  return { pagina: target.nome, path: target.path, violacoes: results.violations.map((v) => ({ regra: v.id, impacto: v.impact, alvos: v.nodes.map((n) => n.target.join(' ')) })) };
}

main().catch((error) => { console.error(error); process.exit(1); });
