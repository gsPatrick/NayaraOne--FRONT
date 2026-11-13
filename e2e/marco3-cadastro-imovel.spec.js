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
 * Atualizado na rodada 8 da verificação do Marco 9 (12/11/2026): desde a auditoria Claude
 * Browser de 13/10/2026 o assistente valida cada etapa com campo obrigatório ao clicar
 * "Continuar" — "Preço" na etapa Oferta e "Proprietário" (vinculado a um contato) na etapa
 * Proprietários —, e o roteiro antigo, que só preenchia Nome, Código e endereço, parava na
 * etapa Oferta ("Preencha os campos obrigatórios desta etapa (Oferta)"). Agora o roteiro:
 * (1) cria pela tela o contato que será o proprietário (o assistente só aceita proprietário
 * já cadastrado); (2) percorre as 8 etapas preenchendo o que cada uma marca como obrigatório;
 * (3) confere que POST /properties, a oferta e o proprietário foram gravados (201), que a
 * tela foi para a ficha do imóvel e que a ficha mostra o código e o proprietário.
 *
 * Uso: `E2E_BASE_URL=... E2E_EMAIL=... E2E_PASSWORD=... node e2e/marco3-cadastro-imovel.spec.js`.
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
  const writes = [];
  page.on('response', async (res) => {
    const method = res.request().method();
    if (method === 'GET' || method === 'OPTIONS' || !/\/api\/v1\//.test(res.url())) return;
    const path = res.url().replace(/^.*\/api\/v1/, '').replace(/[0-9a-f]{8}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{12}/g, ':id');
    writes.push(`${method} ${path} ${res.status()}`);
    if (res.status() >= 400) {
      let body = '';
      try { body = await res.text(); } catch (_e) { /* ignore */ }
      networkErrors.push(`${res.status()} ${method} ${path} — ${body.slice(0, 300)}`);
    }
  });

  async function clickAvancar() {
    await page.getByRole('button', { name: /continuar|criar im[óo]vel/i }).first().click();
    await page.waitForTimeout(400);
  }
  async function etapaAtual() {
    return (await page.locator('[aria-current="step"]').first().textContent().catch(() => '')) || '';
  }

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

    // --- 2. O proprietário: um contato criado pela tela (o assistente de imóvel só aceita proprietário já cadastrado) ---
    const suffix = Date.now();
    const ownerName = `E2E Proprietario Cadastro ${suffix}`;
    await page.goto(`${BASE_URL}/painel/pessoas/novo`, { waitUntil: 'domcontentloaded' });
    await page.waitForSelector('#p-name', { timeout: 70000 });
    await page.fill('#p-name', ownerName);
    const cpfInput = page.locator('#p-doc');
    if (await cpfInput.count()) await cpfInput.fill(String(suffix).padStart(11, '2').slice(-11));
    for (let i = 0; i < 8 && /\/pessoas\/novo$/.test(page.url()); i++) {
      const btn = page.getByRole('button', { name: /salvar|criar contato|concluir|avançar|continuar/i }).first();
      await btn.waitFor({ state: 'visible', timeout: 10000 }).catch(() => {});
      if (await btn.isDisabled().catch(() => true)) { await page.waitForTimeout(500); continue; }
      // telefone único por execução: o cadastro recusa outro contato com o mesmo contato principal (PERSON_DUPLICATE), e o banco pode ser compartilhado com outros roteiros
      const telefone = `(11) 9${String(suffix).slice(-8, -4)}-${String(suffix).slice(-4)}`;
      const dados = { '#p-contact-value-0': telefone, '#p-zip': '01001000', '#p-street': 'Rua Teste', '#p-neighborhood': 'Centro', '#p-city': 'Sao Paulo', '#p-state': 'SP' };
      for (const [seletor, valor] of Object.entries(dados)) {
        const campo = page.locator(seletor);
        if ((await campo.count()) && !(await campo.inputValue().catch(() => 'x'))) await campo.fill(valor).catch(() => {});
      }
      const ultima = /criar contato/i.test((await btn.textContent().catch(() => '')) || '');
      await btn.click().catch(() => {});
      if (ultima) await page.waitForURL((url) => !/\/pessoas\/novo$/.test(String(url)), { timeout: 60000 }).catch(() => {});
      else await page.waitForTimeout(600);
    }
    record('Contato do proprietário criado pela tela', !/\/pessoas\/novo$/.test(page.url()), page.url());

    // --- 3. Novo imóvel: cada etapa com o que ela marca como obrigatório ---
    await page.goto(`${BASE_URL}/painel/imoveis/novo`, { waitUntil: 'domcontentloaded' });
    await page.waitForSelector('#n-name', { timeout: 70000 });
    record('Chegou no formulário de novo imóvel', true);
    const code = `E2E-${suffix}`;
    await page.fill('#n-name', `Imóvel Teste E2E ${suffix}`);
    await page.fill('#n-internal-code', code);
    await clickAvancar(); // Informações básicas -> Localização
    await page.waitForSelector('#n-zip', { timeout: 20000 });
    await page.fill('#n-zip', '01310-100');
    await page.fill('#n-addr-city', 'São Paulo');
    await page.fill('#n-street', 'Avenida Paulista');
    await page.fill('#n-addr-neighborhood', 'Bela Vista');
    await page.fill('#n-addr-state', 'SP');
    await clickAvancar(); // Localização -> Características
    await clickAvancar(); // Características -> Documentação
    await clickAvancar(); // Documentação -> Mídia
    await clickAvancar(); // Mídia -> Oferta
    await page.waitForSelector('#n-offer-price', { timeout: 20000 });
    await page.fill('#n-offer-price', '3200');
    await clickAvancar(); // Oferta -> Proprietários
    await page.waitForSelector('#n-owner-name-0', { timeout: 20000 });
    record('Passou da etapa Oferta com o preço preenchido', true, await etapaAtual());
    const ownerWrap = page.locator('#n-owner-name-0').locator('xpath=ancestor::*[self::div][2]');
    await page.fill('#n-owner-name-0', ownerName);
    const option = ownerWrap.locator('ul li button', { hasText: ownerName });
    await option.first().waitFor({ state: 'visible', timeout: 30000 });
    await option.first().click();
    record('Proprietário escolhido na lista de contatos', true, ownerName);
    await clickAvancar(); // Proprietários -> Revisão
    const alertas = await page.locator('[role=alert]').allInnerTexts().catch(() => []);
    const bloqueio = alertas.find((t) => /Preencha os campos obrigatórios/.test(t));
    record('Nenhuma etapa bloqueou por campo obrigatório', !bloqueio, bloqueio || '');
    await page.getByRole('button', { name: /criar im[óo]vel/i }).first().click(); // Revisão -> Concluir

    await page.waitForURL(/\/painel\/imoveis\/[0-9a-f-]+$/, { timeout: 70000 });
    record('Imóvel criado com sucesso (redirecionou para a ficha)', true, page.url());
    await page.waitForSelector('text=Proprietários', { timeout: 40000 }).catch(() => {});
    await page.waitForFunction((nome) => document.body.innerText.includes(nome), ownerName, { timeout: 40000 }).catch(() => {});
    const ficha = await page.textContent('body');
    record('A ficha mostra o código interno e o proprietário', ficha.includes(code) && ficha.includes(ownerName), `código ${ficha.includes(code) ? 'sim' : 'não'}, proprietário ${ficha.includes(ownerName) ? 'sim' : 'não'}`);

    const gravou = (re) => writes.some((w) => re.test(w));
    record('POST /properties gravou (201)', gravou(/^POST \/properties 201$/), writes.join(' | '));
    record('Oferta gravada (201)', gravou(/^POST \/properties\/:id\/offers 201$/));
    record('Proprietário gravado (201)', gravou(/^POST \/properties\/:id\/owners 201$/));
    record('Nenhum erro 4xx/5xx nas gravações do fluxo', networkErrors.length === 0, networkErrors.join(' | '));
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
