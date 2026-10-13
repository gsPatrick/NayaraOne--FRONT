'use strict';

/**
 * E2E real (Playwright) — cadastro de imóvel pelo assistente de 8 etapas (Marco 3, M3-R01).
 *
 * BUG REAL CORRIGIDO (re-auditoria Nayara, round 2 + análise formal pós-manifestação,
 * 13/10/2026): o formulário de "Novo imóvel" marcava só "Nome" como obrigatório na etapa
 * "Informações básicas" — "Código interno" (internalCode) não tinha indicador `required` nem
 * validação de bloqueio, então o wizard deixava o usuário avançar pelas 8 etapas e só
 * descobria, no clique final de "Concluir", que o backend rejeitava com uma mensagem genérica
 * listando TODOS os 5 campos obrigatórios (groupId, companyId, title, internalCode,
 * propertyType) — inclusive os 2 que o próprio controller já injeta da sessão e nunca
 * aparecem no formulário. Isso reproduz exatamente o relato da auditora: "erro de campos
 * obrigatórios não exibidos no formulário... fluxo completamente quebrado".
 *
 * Fix: (1) front — "Código interno" agora é `required` e o clique final bloqueia ANTES de
 * chamar a API se "Nome" ou "Código interno" estiverem vazios, com mensagem clara apontando
 * a etapa certa; (2) backend — a mensagem de validação agora cita só o(s) campo(s)
 * realmente ausente(s), nunca mais os 5 juntos.
 *
 * Este script prova, preenchendo o formulário real como um usuário faria (só os campos
 * marcados obrigatórios), que um imóvel novo é criado com sucesso de ponta a ponta.
 *
 * Uso: `node e2e/marco3-cadastro-imovel.spec.js`.
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

  const networkErrors = [];
  page.on('response', async (res) => {
    if (res.url().includes('/properties') && res.request().method() === 'POST' && res.status() >= 400) {
      let body = '';
      try { body = await res.text(); } catch (_e) { /* ignore */ }
      networkErrors.push(`${res.status()} ${res.url()} — ${body}`);
    }
  });

  try {
    // --- 1. Login ---
    await page.goto(`${BASE_URL}/entrar`, { waitUntil: 'domcontentloaded' });
    const teamTab = page.getByText('Sou da equipe', { exact: false });
    if (await teamTab.count()) await teamTab.first().click();
    await page.waitForSelector('input[type=email]', { timeout: 70000 });
    await page.fill('input[type=email]', EMAIL);
    await page.fill('input[type=password]', PASSWORD);
    await page.getByRole('button', { name: /entrar/i }).click();
    await page.waitForURL(/\/painel/, { timeout: 70000 });
    record('Login', true);

    // --- 2. Navegar até Novo Imóvel (via URL direta, como um usuário clicando no menu faria) ---
    await page.goto(`${BASE_URL}/painel/imoveis/novo`, { waitUntil: 'domcontentloaded' });
    await page.waitForSelector('#n-name', { timeout: 70000 });
    record('Chegou no formulário de novo imóvel', true);

    // --- 3. Preencher SÓ os campos marcados como obrigatórios no visual (teste adversarial:
    //     um usuário real segue só os indicadores "required" da tela) ---
    const suffix = Date.now();
    const code = `E2E-${suffix}`;
    await page.fill('#n-name', `Imóvel Teste E2E ${suffix}`);
    await page.fill('#n-internal-code', code);

    async function clickAvancar() {
      const btn = page.getByRole('button', { name: /continuar|criar im[óo]vel/i });
      await btn.first().click();
    }

    // Informações básicas -> Localização
    await clickAvancar();
    await page.waitForSelector('#n-zip', { timeout: 20000 });
    await page.fill('#n-zip', '01310-100');
    await page.fill('#n-addr-city', 'São Paulo');
    await page.fill('#n-street', 'Avenida Paulista');
    await page.fill('#n-addr-neighborhood', 'Bela Vista');
    await page.fill('#n-addr-state', 'SP');

    // Localização -> Características -> Documentação -> Mídia -> Oferta -> Proprietários -> Revisão -> Concluir
    for (let i = 0; i < 7; i++) {
      await clickAvancar();
      await page.waitForTimeout(400);
    }

    await page.waitForURL(/\/painel\/imoveis\/[0-9a-f-]+$/, { timeout: 70000 });
    record('Imóvel criado com sucesso (redirecionou para a ficha)', true, page.url());

    if (networkErrors.length) {
      record('Nenhum erro 4xx/5xx em POST /properties durante o fluxo', false, networkErrors.join(' | '));
    } else {
      record('Nenhum erro 4xx/5xx em POST /properties durante o fluxo', true);
    }
  } catch (err) {
    record('Fluxo completo sem exceção', false, err.message);
    if (networkErrors.length) record('Erros de rede capturados', false, networkErrors.join(' | '));
  } finally {
    await browser.close();
  }

  const failed = results.filter((r) => !r.ok);
  console.log(`\n${results.length - failed.length}/${results.length} passos OK.`);
  if (failed.length) {
    console.log('FALHAS:', JSON.stringify(failed, null, 2));
    process.exitCode = 1;
  }
}

main();
