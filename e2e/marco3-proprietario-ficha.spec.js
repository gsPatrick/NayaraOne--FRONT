'use strict';

/**
 * E2E real (Playwright) — proprietário do imóvel aparece corretamente na ficha de detalhe
 * (auditoria Claude Browser, rodada final, 13/10/2026).
 *
 * BUGS REAIS CORRIGIDOS:
 * 1. O cartão "Proprietários" na ficha de detalhe mostrava "Proprietário · % de participação"
 *    com nome e avatar vazios — `getPerson` (mapPerson) devolve o nome em `legalName`, mas o
 *    código lia `person?.name` (campo inexistente no objeto mapeado), sempre vazio.
 * 2. O percentual era salvo como 0% — "100" no campo era só placeholder visual, nunca um valor
 *    de verdade; ao deixar vazio, o front mandava `undefined` pro backend, que persistia 0.
 * 3. Mensagem contraditória no picker de proprietário: "será salvo apenas como texto" (dica
 *    genérica do componente) aparecia ao lado de "texto livre não é salvo como proprietário"
 *    (validação real desta tela) — texto oposto um do outro.
 *
 * Este script cria um imóvel selecionando um proprietário real da lista, SEM preencher o
 * percentual manualmente (simula o usuário confiando no placeholder "100"), e confirma que a
 * ficha de detalhe mostra o nome do proprietário e "100% de participação" de verdade.
 *
 * Uso: `node e2e/marco3-proprietario-ficha.spec.js`.
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
    await page.getByRole('button', { name: /entrar/i }).click();
    await page.waitForURL(/\/painel/, { timeout: 70000 });
    record('Login', true);

    // --- 2. Criar um contato fictício pra usar como proprietário ---
    const suffix = Date.now();
    const ownerName = `AUDIT Proprietario Ficha ${suffix}`;
    await page.goto(`${BASE_URL}/painel/pessoas/novo`, { waitUntil: 'domcontentloaded' });
    await page.waitForSelector('#p-name', { timeout: 70000 });
    await page.fill('#p-name', ownerName);
    // CPF fictício único, SEMPRE com 11 dígitos (o backend recusa qualquer tamanho diferente,
    // `PERSON_DOCUMENT_INVALID_FORMAT`) — não precisa passar no dígito verificador real.
    const cpf = String(suffix).padStart(11, '1').slice(-11);
    const cpfInput = page.locator('#p-doc');
    if (await cpfInput.count()) await cpfInput.fill(cpf);
    // O assistente de pessoa tem 4 etapas; o botão final ("Criar contato") fica desabilitado
    // durante o envio (`loading`) — precisa esperar ele reabilitar/a URL mudar antes de seguir,
    // senão um clique "perdido" nesse meio-tempo deixa o fluxo preso na última etapa.
    for (let i = 0; i < 6; i++) {
      if (!/\/pessoas\/novo$/.test(page.url())) break;
      const btn = page.getByRole('button', { name: /salvar|criar contato|concluir|avançar|continuar/i }).first();
      await btn.waitFor({ state: 'visible', timeout: 10000 }).catch(() => {});
      const isDisabled = await btn.isDisabled().catch(() => true);
      if (isDisabled) { await page.waitForTimeout(500); i--; continue; }
      const isLastStep = /criar contato/i.test((await btn.textContent().catch(() => '')) || '');
      await btn.click().catch(() => {});
      // POST /people pode levar bem mais de 1s no ambiente de dev compartilhado sob carga.
      await page.waitForTimeout(isLastStep ? 16000 : 700);
    }
    const personCreated = !/\/pessoas\/novo$/.test(page.url());
    record('Contato fictício criado para servir de proprietário', personCreated, `${ownerName} / CPF ${cpf} / url final: ${page.url()}`);

    // --- 3. Criar imóvel selecionando esse proprietário, SEM mexer no percentual ---
    await page.goto(`${BASE_URL}/painel/imoveis/novo`, { waitUntil: 'domcontentloaded' });
    await page.waitForSelector('#n-name', { timeout: 70000 });
    const code = `AUD-PROP-${suffix}`;
    await page.fill('#n-name', `AUDIT Imovel Ficha Proprietario ${suffix}`);
    await page.fill('#n-internal-code', code);

    async function clickAvancar() {
      await page.getByRole('button', { name: /continuar/i }).first().click();
      await page.waitForTimeout(400);
    }

    await clickAvancar(); // básico -> localização
    await page.waitForSelector('#n-zip', { timeout: 20000 });
    await page.fill('#n-zip', '01310-100');
    await page.fill('#n-addr-city', 'São Paulo');
    await page.fill('#n-street', 'Avenida Paulista');
    await page.fill('#n-addr-neighborhood', 'Bela Vista');
    await page.fill('#n-addr-state', 'SP');

    await clickAvancar(); // localização -> características
    await clickAvancar(); // características -> documentação
    await clickAvancar(); // documentação -> mídia
    await clickAvancar(); // mídia -> oferta

    await page.fill('#n-offer-price', '2500');
    await clickAvancar(); // oferta -> proprietários

    // Buscar e selecionar o proprietário real pelo PersonPicker (NÃO digitar percentual).
    // Escopo pelo wrap do próprio input (não um <ul><li><button> genérico de outra parte da
    // tela, como o menu lateral) — o dropdown do PersonPicker é o único `ul` logo após o
    // input dentro do mesmo container `.wrap`.
    await page.waitForSelector('#n-owner-name-0', { timeout: 20000 });
    const ownerFieldWrap = page.locator('#n-owner-name-0').locator('xpath=ancestor::*[self::div][2]');
    // Busca pelo nome COMPLETO e único (com o sufixo de timestamp) — o banco de dev compartilhado
    // já tem vários contatos fictícios "AUDIT Proprietario..." de rodadas anteriores, e o
    // dropdown só mostra os 6 primeiros resultados (`matches.slice(0, 6)`); uma busca genérica
    // pode não trazer o contato recém-criado entre os 6.
    await page.fill('#n-owner-name-0', ownerName);
    // GET /people (sem paginação) demora vários segundos neste ambiente de dev compartilhado
    // sob carga — não é o bug sendo testado aqui, só a realidade do ambiente.
    const option = ownerFieldWrap.locator('ul li button', { hasText: ownerName });
    const optionText = await option.first().textContent();
    await option.first().click();
    record('Proprietário selecionado da lista (personId vinculado)', true, optionText.trim());

    // Confirma que a dica certa aparece (não a contraditória) quando HÁ vínculo
    const linkedHint = page.getByText('Vinculado ao cadastro de Contatos');
    const hasLinkedHint = await linkedHint.count();
    record('Dica "Vinculado ao cadastro de Contatos" aparece após selecionar', hasLinkedHint > 0);

    await clickAvancar(); // proprietários -> revisão
    await page.waitForTimeout(300);

    // Confirma que a revisão mostra 100% (não 0%) mesmo sem o usuário ter digitado nada
    const reviewText = await page.textContent('body');
    record('Revisão mostra 100% de participação (não 0%)', /100%/.test(reviewText));

    await page.getByRole('button', { name: /criar im[óo]vel/i }).first().click();
    await page.waitForURL(/\/painel\/imoveis\/[0-9a-f-]+$/, { timeout: 70000 });
    record('Imóvel criado, redirecionou para a ficha', true, page.url());

    // --- 4. Confirmar a ficha de detalhe mostra nome + percentual reais ---
    await page.waitForSelector('text=Proprietários', { timeout: 40000 });
    await page.waitForTimeout(6000); // aguarda o fetch assíncrono de getPerson terminar (lento neste ambiente)

    const detailText = await page.textContent('body');
    const nameAppears = detailText.includes(ownerName);
    record('Ficha de detalhe mostra o NOME real do proprietário', nameAppears, nameAppears ? '' : 'nome não encontrado na página');

    const pctAppears = /100%\s*de participa/i.test(detailText);
    record('Ficha de detalhe mostra "100% de participação" (não 0%)', pctAppears, pctAppears ? '' : 'percentual 100% não encontrado na página');

    const hasEmptyPlaceholder = /Proprietário\s*·\s*%\s*de participa/i.test(detailText.replace(ownerName, ''));
    record('Cartão NÃO mostra o placeholder vazio "Proprietário · % de participação"', !hasEmptyPlaceholder);
  } catch (err) {
    record('Fluxo completo sem exceção', false, err.message);
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
