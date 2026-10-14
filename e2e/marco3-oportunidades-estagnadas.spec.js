'use strict';

/**
 * E2E real (Playwright) — painel de oportunidades estagnadas (Marco 3, Caderno Técnico §11).
 *
 * GAP CORRIGIDO (re-auditoria Nayara, round 2, 13/10/2026 — M3-R05): o backend calculava
 * `staleOpportunities`/`avgTimeInStageByStageDays` dentro da resposta de
 * `GET /crm/dashboard` desde o Marco 3 — Ciclo 1, mas NENHUMA tela usava esse campo. A
 * auditora confirmou isso testando pela interface; nossos testes anteriores só chamavam o
 * service/API direto e nunca verificavam se a tela realmente exibia o dado. Este script
 * prova, navegando de verdade, que a seção existe e renderiza.
 *
 * Uso: `node e2e/marco3-oportunidades-estagnadas.spec.js` (ou
 * `npm run test:e2e:marco3`). Mesmo padrão dos demais scripts desta pasta.
 */

const { chromium } = require('playwright');

const BASE_URL = process.env.E2E_BASE_URL || 'http://localhost:3000';
const EMAIL = process.env.E2E_EMAIL || 'admin@nayaraone.dev';
const PASSWORD = process.env.E2E_PASSWORD || 'DevAdmin#2026';

const results = [];
function record(step, ok, detail) {
  results.push({ step, ok, detail: detail || '' });
  console.log(`[${ok ? 'OK ' : 'FALHOU'}] ${step}${detail ? ' — ' + detail : ''}`);
}

async function main() {
  const browser = await chromium.launch();
  const page = await browser.newPage({ viewport: { width: 1440, height: 1100 } });
  page.setDefaultTimeout(70000);

  try {
    // --- 1. Login ---
    await page.goto(`${BASE_URL}/entrar`, { waitUntil: 'domcontentloaded' });
    const teamTab = page.getByText('Sou da equipe', { exact: false });
    if (await teamTab.count()) await teamTab.first().click();
    await page.waitForSelector('input[type=email]', { timeout: 70000 });
    await page.fill('input[type=email]', EMAIL);
    await page.fill('input[type=password]', PASSWORD);
    await page.click('button[type=submit]');
    await page.waitForURL((url) => !url.pathname.includes('/entrar'), { timeout: 70000 }).catch(() => {});
    record('1. login', true, EMAIL);

    // --- 2. Painel do CRM ---
    // O dashboard agrega várias consultas pesadas (contagens, motivos de perda, oportunidades
    // estagnadas) — "domcontentloaded" + 1500ms não bastava, a seção carregava depois.
    await page.goto(`${BASE_URL}/painel/crm/dashboard`, { waitUntil: 'networkidle' });
    await page.waitForTimeout(1000);

    const staleSection = page.getByText('Oportunidades estagnadas', { exact: false });
    const found = await staleSection.count();
    record('2. seção "Oportunidades estagnadas" presente na tela', found > 0,
      found > 0 ? 'título encontrado' : 'NÃO ENCONTRADO — gap real, confirmar correção');

    if (found > 0) {
      // Aceita tanto o estado vazio ("Nenhuma estagnada") quanto a lista real — o que importa
      // é que a seção exista e renderize algum conteúdo, não um placeholder quebrado.
      const emptyState = page.getByText('Nenhuma estagnada', { exact: false });
      const countText = page.getByText('oportunidade(s) sem atividade', { exact: false });
      const hasEmpty = (await emptyState.count()) > 0;
      const hasCount = (await countText.count()) > 0;
      record('3. seção renderiza estado real (vazio ou com dados), não placeholder quebrado',
        hasEmpty || hasCount,
        hasEmpty ? 'estado vazio' : hasCount ? 'com dados' : 'nenhum dos dois estados encontrado');
    }
  } catch (err) {
    record('ERRO FATAL', false, err.stack || err.message);
  } finally {
    await browser.close();
  }

  const passed = results.filter((r) => r.ok).length;
  console.log(`\n=== Resumo: ${passed}/${results.length} passos OK ===`);
  for (const r of results) console.log(`  ${r.ok ? '✔' : '✖'} ${r.step}${r.detail ? ' — ' + r.detail : ''}`);

  if (results.some((r) => !r.ok)) process.exitCode = 1;
}

main();
