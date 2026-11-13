'use strict';

/**
 * E2E real (Playwright) — Radar explicável (Marco 3 §13 / Guia §9; matriz M3-15).
 * Prepara pela API (só dados de apoio): um contato e quatro imóveis com oferta ativa. Pela TELA: cria o radar com as quatro
 * categorias do livro (obrigatórios, preferências com peso, flexíveis com peso, exclusões), confere a lista de matches com o
 * score, abre a explicação por critério (GET /radar/:id/matches/:propertyId/explain), edita um peso e confere o novo score.
 *
 * Uso (pilha própria, nunca homologação): E2E_BASE_URL=http://localhost:<front> E2E_API_URL=http://localhost:<api>/api/v1
 *   E2E_EVIDENCIAS=<pasta> node e2e/marco3-radar-explicacao.spec.js
 */

const fs = require('fs');
const path = require('path');
const { chromium } = require('playwright');

const BASE_URL = process.env.E2E_BASE_URL || 'http://localhost:3000';
const API_URL = process.env.E2E_API_URL || 'http://localhost:4001/api/v1';
const EMAIL = process.env.E2E_EMAIL || 'admin@nayaraone.dev';
const PASSWORD = process.env.E2E_PASSWORD || 'DevAdmin#2026';
const OUT = process.env.E2E_EVIDENCIAS || path.join(__dirname, 'achados', 'radar-explicacao');

const results = [];
function record(step, ok, detail) {
  results.push({ step, ok: Boolean(ok), detail: detail || '' });
  console.log(`[${ok ? 'OK ' : 'FALHOU'}] ${step}${detail ? ' — ' + detail : ''}`);
}
const save = (name, data) => fs.writeFileSync(path.join(OUT, name), JSON.stringify(data, null, 2));

async function api(token, method, p, body) {
  const res = await fetch(`${API_URL}${p}`, { method, headers: { 'Content-Type': 'application/json', ...(token ? { Authorization: `Bearer ${token}` } : {}) }, body: body ? JSON.stringify(body) : undefined });
  const json = await res.json().catch(() => null);
  if (!res.ok) throw new Error(`${method} ${p} -> ${res.status} ${JSON.stringify(json && json.error)}`);
  return json.data;
}

async function prepararDados(suffix) {
  const login = await api(null, 'POST', '/auth/login', { email: EMAIL, password: PASSWORD });
  const token = login.accessToken;
  const city = `Radar E2E ${suffix}`;
  const pessoa = await api(token, 'POST', '/people', { personType: 'PF', legalName: `Cliente Radar E2E ${suffix}`, allowDuplicate: true });
  const imovel = async (code, extra, neighborhood, price) => {
    const p = await api(token, 'POST', '/properties', {
      title: `Radar E2E ${code} ${suffix}`, internalCode: `RE2E-${code}-${suffix}`, propertyType: 'RESIDENTIAL', city, state: 'SP',
      address: { zipCode: '13025000', street: `Rua ${code} ${suffix}`, number: '1', neighborhood, city, state: 'SP' }, ...extra,
    });
    await api(token, 'POST', `/properties/${p.id}/offers`, { offerType: 'SALE', askingPrice: price });
    return p.id;
  };
  const ids = {
    forte: await imovel('FORTE', { bedrooms: 4, latitude: -22.9056, longitude: -47.0608, attributesJson: { acabamento: 'alto padrão', elevator: true } }, 'Cambuí', 500000),
    medio: await imovel('MEDIO', { bedrooms: 3, latitude: -23.5505, longitude: -46.6333, attributesJson: { acabamento: 'simples', elevator: true } }, 'Centro', 450000),
    excluido: await imovel('SEMELEV', { bedrooms: 4, latitude: -22.9056, longitude: -47.0608, attributesJson: { acabamento: 'alto padrão', elevator: false } }, 'Cambuí', 480000),
    caro: await imovel('CARO', { bedrooms: 5, latitude: -22.9056, longitude: -47.0608, attributesJson: { elevator: true } }, 'Cambuí', 900000),
  };
  return { token, city, pessoa, ids };
}

async function main() {
  fs.mkdirSync(OUT, { recursive: true });
  const suffix = Date.now().toString(36);
  const dados = await prepararDados(suffix);
  record('0. dados de apoio pela API (contato + 4 imóveis com oferta ativa)', true, dados.city);

  const browser = await chromium.launch();
  const page = await browser.newPage({ viewport: { width: 1440, height: 1100 } });
  page.setDefaultTimeout(70000);
  try {
    await page.goto(`${BASE_URL}/entrar`, { waitUntil: 'networkidle' });
    // Com o `next dev` a página pode ainda não estar hidratada no primeiro clique: repete até o formulário aparecer.
    for (let i = 0; i < 10 && !(await page.locator('input[type=email]').count()); i += 1) {
      const teamTab = page.getByText('Sou da equipe', { exact: false });
      if (await teamTab.count()) await teamTab.first().click();
      await page.waitForTimeout(1500);
    }
    await page.fill('input[type=email]', EMAIL);
    await page.fill('input[type=password]', PASSWORD);
    await page.click('button[type=submit]');
    await page.waitForURL((url) => !url.pathname.includes('/entrar'));
    record('1. login pela tela', true, EMAIL);

    // --- 2. Formulário com as quatro categorias ---
    await page.goto(`${BASE_URL}/painel/radar/novo`, { waitUntil: 'domcontentloaded' });
    await page.fill('#rd-person', `Cliente Radar E2E ${suffix}`);
    await page.getByRole('button', { name: new RegExp(`Cliente Radar E2E ${suffix}`) }).first().click();
    await page.selectOption('#rd-type', 'RESIDENTIAL');
    await page.selectOption('#rd-offer-type', 'SALE');
    await page.fill('#rd-min-price', '300.000,00');
    await page.fill('#rd-max-price', '600.000,00');
    await page.fill('#rd-city', dados.city);
    await page.fill('#rd-state', 'sp');
    await page.getByRole('button', { name: 'Adicionar preferência' }).click();
    await page.selectOption('#rd-preferences-0-code', 'MIN_BEDROOMS');
    await page.fill('#rd-preferences-0-value', '3');
    await page.fill('#rd-preferences-0-weight', '2');
    await page.getByRole('button', { name: 'Adicionar preferência' }).click();
    await page.fill('#rd-preferences-1-value', 'Cambuí');
    await page.getByRole('button', { name: 'Adicionar critério flexível' }).click();
    await page.selectOption('#rd-flexible-0-key-choice', '__OUTRA__');
    await page.fill('#rd-flexible-0-key', 'acabamento');
    await page.fill('#rd-flexible-0-value', 'alto padrão');
    await page.getByRole('button', { name: 'Adicionar critério flexível' }).click();
    await page.selectOption('#rd-flexible-1-code', 'MAX_DISTANCE_KM');
    await page.fill('#rd-flexible-1-value', '5');
    await page.fill('#rd-flexible-1-lat', '-22,9099');
    await page.fill('#rd-flexible-1-lng', '-47,0626');
    await page.getByRole('button', { name: 'Adicionar exclusão' }).click();
    await page.selectOption('#rd-exclusions-0-value', 'LAND');
    await page.getByRole('button', { name: 'Adicionar exclusão' }).click();
    await page.selectOption('#rd-exclusions-1-code', 'ATTRIBUTE');
    await page.selectOption('#rd-exclusions-1-key-choice', 'elevator');
    await page.selectOption('#rd-exclusions-1-value', 'false');
    await page.screenshot({ path: path.join(OUT, '01-formulario-quatro-categorias.png'), fullPage: true });

    const postResp = page.waitForResponse((r) => r.url().endsWith('/radar') && r.request().method() === 'POST');
    await page.getByRole('button', { name: 'Salvar radar' }).click();
    const post = await postResp;
    const postBody = await post.json();
    const sent = JSON.parse(post.request().postData());
    save('02-post-radar-enviado.json', sent);
    save('02-post-radar-resposta.json', { status: post.status(), criteriaJson: postBody.data.criteriaJson, matches: postBody.data.matches.map((m) => ({ id: m.id, title: m.title, radarMatch: m.radarMatch })) });
    const cj = sent.criteriaJson;
    record('2. POST /radar enviado pela tela com as quatro categorias', post.status() === 201 && cj.preferences.length === 2 && cj.flexible.length === 2 && cj.exclusions.length === 2 && cj.minPrice === 300000 && cj.preferences[0].weight === 2,
      `status ${post.status()}; preferências ${cj.preferences.length}, flexíveis ${cj.flexible.length}, exclusões ${cj.exclusions.length}; minPrice ${cj.minPrice}`);

    // --- 3. Lista de matches com score ---
    await page.waitForURL(/\/painel\/radar\/[0-9a-f-]{36}$/);
    const radarId = page.url().split('/').pop();
    await page.waitForSelector('[data-radar-match]');
    const ids = await page.$$eval('[data-radar-match]', (els) => els.map((e) => e.getAttribute('data-radar-match')));
    const scores = await page.$$eval('[data-radar-match]', (els) => els.map((e) => (e.textContent.match(/Score \d+%/) || [''])[0]));
    record('3. matches na tela ordenados por score (excluído e fora do preço não aparecem)', JSON.stringify(ids) === JSON.stringify([dados.ids.forte, dados.ids.medio]), `ids na ordem ${ids.map((i) => (i === dados.ids.forte ? 'forte' : i === dados.ids.medio ? 'médio' : i)).join(', ')}; ${scores.join(', ')}`);
    record('3b. score mostrado no cartão do match', scores[0] === 'Score 100%' && scores[1] === 'Score 40%', scores.join(', '));
    await page.screenshot({ path: path.join(OUT, '03-detalhe-matches-score.png'), fullPage: true });

    // --- 4. Explicação por critério (GET /explain) ---
    const card = page.locator(`[data-radar-match="${dados.ids.medio}"]`);
    const expResp = page.waitForResponse((r) => r.url().includes(`/matches/${dados.ids.medio}/explain`));
    await card.getByRole('button', { name: 'Ver explicação' }).click();
    const exp = await expResp;
    save('04-explain-medio.json', { url: exp.url().replace(API_URL, ''), status: exp.status(), data: (await exp.json()).data });
    await card.locator('[data-radar-explanation]').waitFor();
    const texto = await card.locator('[data-radar-explanation]').innerText();
    const statuses = await card.locator('[data-radar-explanation] li').evaluateAll((els) => els.map((e) => `${e.getAttribute('data-category')}:${e.getAttribute('data-status')}`));
    save('04-explicacao-na-tela-medio.json', { texto, statuses });
    const todas = ['Obrigatório', 'Preferência', 'Flexível', 'Exclusão'].every((c) => texto.includes(c));
    record('4. explicação do imóvel médio: categorias, situação, peso e motivo em português', exp.status() === 200 && todas && /Não atendido/.test(texto) && /Atendido/.test(texto) && /Peso 2/.test(texto) && /Bairro é "Centro"/.test(texto) && !/\b(PREFERENCE|REQUIRED|MIN_BEDROOMS|elevator|SALE)\b/.test(texto),
      statuses.join(' '));
    await card.screenshot({ path: path.join(OUT, '04-explicacao-medio.png') });

    const forte = page.locator(`[data-radar-match="${dados.ids.forte}"]`);
    await forte.getByRole('button', { name: 'Ver explicação' }).click();
    await forte.locator('[data-radar-explanation]').waitFor();
    const textoForte = await forte.locator('[data-radar-explanation]').innerText();
    record('4b. explicação do imóvel forte: 100% e todos os critérios atendidos', /100%/.test(textoForte) && !/Não atendido/.test(textoForte), textoForte.split('\n').slice(0, 3).join(' | '));

    // Imóvel excluído: a mesma rota de explicação diz por que ele saiu (exclusão "sem elevador").
    const expExcl = await api(dados.token, 'GET', `/radar/${radarId}/matches/${dados.ids.excluido}/explain`);
    const expCaro = await api(dados.token, 'GET', `/radar/${radarId}/matches/${dados.ids.caro}/explain`);
    save('05-explain-excluido-e-caro.json', { excluido: expExcl, caro: expCaro });
    record('5. fora do radar: exclusão (sem elevador) e obrigatório (preço) explicados', expExcl.matched === false && expExcl.reasons.includes('EXCLUDED') && expCaro.reasons.includes('REQUIRED_FAILED'), `${expExcl.reasons} / ${expCaro.reasons}`);

    // --- 6. Edição: o peso do bairro sobe e o score do médio muda ---
    await page.getByRole('link', { name: /Editar critérios/ }).click();
    await page.waitForSelector('#rd-preferences-0-weight');
    const pesoLido = await page.inputValue('#rd-preferences-0-weight');
    await page.fill('#rd-preferences-0-weight', '1');
    const patchResp = page.waitForResponse((r) => r.url().endsWith(`/radar/${radarId}`) && r.request().method() === 'PATCH');
    await page.getByRole('button', { name: 'Salvar critérios' }).click();
    const patch = await patchResp;
    save('06-patch-radar-enviado.json', JSON.parse(patch.request().postData()));
    await page.waitForURL(new RegExp(`/painel/radar/${radarId}$`));
    await page.waitForSelector('[data-radar-match]');
    const scores2 = await page.$$eval('[data-radar-match]', (els) => els.map((e) => (e.textContent.match(/Score \d+%/) || [''])[0]));
    record('6. editar critérios pela tela (peso 2 -> 1) recalcula o score', pesoLido === '2' && patch.status() === 200 && scores2[1] === 'Score 25%', `peso lido ${pesoLido}; PATCH ${patch.status()}; scores ${scores2.join(', ')}`);
    await page.screenshot({ path: path.join(OUT, '06-detalhe-apos-edicao.png'), fullPage: true });
  } catch (err) {
    record('ERRO FATAL', false, err.stack || err.message);
    await page.screenshot({ path: path.join(OUT, 'erro.png'), fullPage: true }).catch(() => {});
  } finally {
    await browser.close();
  }

  const passed = results.filter((r) => r.ok).length;
  console.log(`\n=== Resumo: ${passed}/${results.length} passos OK ===`);
  save('00-resumo.json', results);
  if (results.some((r) => !r.ok)) process.exitCode = 1;
}

main().catch((err) => { console.error(err); process.exitCode = 1; });
