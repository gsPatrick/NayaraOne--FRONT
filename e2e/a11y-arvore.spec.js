'use strict';

/**
 * Árvore de acessibilidade (o que um leitor de tela recebe), medida com ARIA snapshot do Playwright, sem VoiceOver (M9-D851 §3.4).
 * Em /entrar, /painel, /painel/pessoas, /painel/pessoas/novo e /painel/papeis (+ modais de excluir papel e de MFA) confere:
 *  - regiões: um main, nav, banner; um h1 por tela; título da aba (document.title) não vazio e diferente entre telas;
 *  - nome acessível: nenhum botão, link, campo ou caixa de seleção sem nome (linha "- button" sem texto entre aspas no snapshot);
 *  - botões de ícone com o nome da ação ("Ver detalhes", "Editar", "Excluir");
 *  - tabela: columnheader para cada coluna com texto;
 *  - campos com erro: aria-invalid + descrição lida (a11y-formulario-erros.spec.js cobre o detalhe);
 *  - estados aria-live: "Carregando..." (role=status), sucesso (role=status), erro (role=alert);
 *  - navegação de rota: depois de ir de /painel/pessoas a /painel/pessoas/novo pelo teclado, o título da aba muda e onde o foco fica.
 * Grava os snapshots em docs/evidencias/a11y-arvore-<navegador>-<data>.json. Reprova com GOV_A11Y_ARVORE.
 * Uso: E2E_EMAIL=... E2E_PASSWORD=... E2E_TOTP_SECRET=... [E2E_BROWSER=webkit] node e2e/a11y-arvore.spec.js
 */
const fs = require('fs');
const path = require('path');
const { BASE_URL, abrir, entrar, registro, api } = require('./_a11y-comum');
const { reg, estado } = registro('arvore');
const NOME_PAPEL = 'QA-M9 Papel Arvore';

// Linhas "- role" sem nome (sem aspas) para papéis que PRECISAM de nome.
const PRECISAM_NOME = ['button', 'link', 'textbox', 'combobox', 'checkbox', 'radio', 'searchbox', 'switch', 'spinbutton', 'tab'];
function semNome(snapshot) {
  const ruins = [];
  for (const linha of snapshot.split('\n')) {
    const m = /^\s*- (\w+)(?: "([^"]*)")?(.*)$/.exec(linha);
    if (!m) continue;
    const [, papel, nome] = m;
    if (PRECISAM_NOME.includes(papel) && (nome === undefined || nome.trim() === '')) ruins.push(linha.trim().slice(0, 80));
  }
  return ruins;
}
const conta = (snapshot, papel) => snapshot.split('\n').filter((l) => new RegExp(`^\\s*- ${papel}\\b`).test(l)).length;

async function main() {
  const { browser, page } = await abrir();
  const dump = {};
  let cliente = null; let papelId = null;
  try {
    // /entrar (sem sessão)
    await page.goto(`${BASE_URL}/entrar`, { waitUntil: 'networkidle' });
    dump['/entrar'] = await page.locator('body').ariaSnapshot();
    reg(semNome(dump['/entrar']).length === 0, `/entrar: controles sem nome: ${JSON.stringify(semNome(dump['/entrar']))}`);
    reg(conta(dump['/entrar'], 'main') === 1, `/entrar: ${conta(dump['/entrar'], 'main')} região main`);
    reg(conta(dump['/entrar'], 'heading') >= 1, `/entrar: ${conta(dump['/entrar'], 'heading')} cabeçalhos`);
    const tituloEntrar = await page.title();
    reg(tituloEntrar.length > 3, `/entrar: título da aba "${tituloEntrar}"`);

    await entrar(page);
    if (process.env.E2E_TOTP_SECRET) { cliente = await api(); const c = await cliente.post('/roles', { name: NOME_PAPEL, description: 'Teste da árvore', permissionIds: [] }); papelId = c.json.data && c.json.data.id; }

    const titulos = {};
    for (const rota of ['/painel', '/painel/pessoas', '/painel/pessoas/novo', '/painel/papeis']) {
      await page.goto(`${BASE_URL}${rota}`, { waitUntil: 'networkidle' }); await page.waitForTimeout(800);
      const snap = await page.locator('body').ariaSnapshot();
      dump[rota] = snap;
      const ruins = semNome(snap);
      reg(ruins.length === 0, `${rota}: controles sem nome acessível: ${JSON.stringify(ruins)}`);
      reg(conta(snap, 'main') === 1 && conta(snap, 'navigation') >= 1 && conta(snap, 'banner') >= 1, `${rota}: regiões main=${conta(snap, 'main')} navigation=${conta(snap, 'navigation')} banner=${conta(snap, 'banner')}`);
      const h1 = await page.locator('h1').count();
      reg(h1 === 1, `${rota}: ${h1} cabeçalho de nível 1`);
      const t = await page.title(); titulos[rota] = t;
      reg(t.trim().length > 3, `${rota}: título da aba "${t}"`);
    }
    const unicos = new Set(Object.values(titulos));
    reg(unicos.size === Object.keys(titulos).length, `títulos da aba distintos por tela: ${JSON.stringify(titulos)}`);

    // Tabela de pessoas: cabeçalhos e botões de ícone
    await page.goto(`${BASE_URL}/painel/pessoas`, { waitUntil: 'networkidle' }); await page.waitForTimeout(800);
    const pessoas = dump['/painel/pessoas'] = await page.locator('body').ariaSnapshot();
    reg(conta(pessoas, 'columnheader') >= 2, `/painel/pessoas: ${conta(pessoas, 'columnheader')} cabeçalhos de coluna na tabela`);
    for (const nome of ['Ver detalhes', 'Editar']) reg(new RegExp(`button "${nome}"`).test(pessoas), `/painel/pessoas: botão de ícone "${nome}" tem nome acessível`);

    // Papéis: tabela, Editar/Excluir e modal
    await page.goto(`${BASE_URL}/painel/papeis`, { waitUntil: 'networkidle' }); await page.waitForTimeout(800);
    const papeis = dump['/painel/papeis'] = await page.locator('body').ariaSnapshot();
    reg(conta(papeis, 'columnheader') >= 2, `/painel/papeis: ${conta(papeis, 'columnheader')} cabeçalhos de coluna`);
    reg(/button "Editar"/.test(papeis) && /button "Excluir"/.test(papeis), '/painel/papeis: botões de ícone "Editar" e "Excluir" têm nome');
    await page.locator('tr', { hasText: NOME_PAPEL }).getByRole('button', { name: 'Excluir', exact: true }).click();
    await page.waitForSelector('[role=dialog]');
    const modal = dump['modal excluir papel'] = await page.locator('[role=dialog]').ariaSnapshot();
    reg(/dialog "Excluir papel"/.test(modal) && /button "Fechar"/.test(modal) && /button "Cancelar"/.test(modal) && /button "Excluir papel"/.test(modal) && semNome(modal).length === 0,
      `modal de exclusão: diálogo com nome "Excluir papel", botões Fechar, Cancelar e Excluir papel nomeados; sem nome: ${JSON.stringify(semNome(modal))}`);
    const modalAria = await page.evaluate(() => { const d = document.querySelector('[role=dialog]'); return { modal: d.getAttribute('aria-modal'), titulo: d.getAttribute('aria-label') || d.getAttribute('aria-labelledby') }; });
    reg(modalAria.modal === 'true' && !!modalAria.titulo, `modal: aria-modal=${modalAria.modal}, nome "${modalAria.titulo}"`);
    // MFA
    if (process.env.E2E_ZERAR_STEPUP) require('child_process').execSync(process.env.E2E_ZERAR_STEPUP, { stdio: 'pipe' });
    await page.getByRole('button', { name: 'Excluir papel' }).click();
    await page.waitForSelector('#mfa-modal-codigo');
    const mfa = dump['modal MFA'] = await page.locator('[role=dialog]').last().ariaSnapshot();
    reg(/textbox "Código do aplicativo autenticador"/.test(mfa) && semNome(mfa).length === 0, `modal de MFA: campo "Código do aplicativo autenticador" nomeado; sem nome: ${JSON.stringify(semNome(mfa))}`);
    await page.keyboard.press('Escape'); await page.waitForTimeout(300); await page.keyboard.press('Escape'); await page.waitForTimeout(300);

    // Estados aria-live: carregando
    await page.route(/\/api\/.*people|\/people/, async (r) => { await new Promise((x) => setTimeout(x, 2500)); r.continue().catch(() => {}); });
    await page.goto(`${BASE_URL}/painel/pessoas`, { waitUntil: 'commit' }); await page.waitForTimeout(1500);
    const vivo = await page.evaluate(() => [...document.querySelectorAll('[role=status],[role=alert],[aria-live]')].map((e) => `${e.getAttribute('role') || 'aria-live=' + e.getAttribute('aria-live')}${e.getAttribute('aria-busy') ? ' busy' : ''}: ${e.textContent.trim().slice(0, 40)}`));
    reg(vivo.some((v) => /Carregando/.test(v)), `carregamento anunciado por região viva: ${JSON.stringify(vivo)}`);
    await page.waitForTimeout(3000); await page.unrouteAll({ behavior: 'wait' });
    // erro de API (503 simulado) vira role=alert com texto em português
    await page.route(/\/people(\?|$)/, (r) => r.fulfill({ status: 503, contentType: 'application/json', body: JSON.stringify({ success: false, error: { code: 'SERVICE_UNAVAILABLE', message: 'Indisponível', traceId: 'arvore-1' } }) }));
    await page.goto(`${BASE_URL}/painel/pessoas`, { waitUntil: 'networkidle' }); await page.waitForTimeout(6000);
    const erro = await page.evaluate(() => [...document.querySelectorAll('[role=alert]')].map((e) => e.textContent.trim().replace(/\s+/g, ' ').slice(0, 120)));
    reg(erro.length >= 1 && erro.every((t) => !/SERVICE_UNAVAILABLE|undefined|null/.test(t)), `erro de carregamento em role=alert: ${JSON.stringify(erro)}`);
    await page.unrouteAll({ behavior: 'wait' });
    // sucesso (exclusão) coberto pelo role=status do a11y-mfa-excluir-papel.spec.js

    // Navegação de rota por teclado: título e foco
    await page.goto(`${BASE_URL}/painel/pessoas`, { waitUntil: 'networkidle' }); await page.waitForTimeout(800);
    const antes = await page.title();
    await page.getByRole('link', { name: /Novo contato/ }).first().focus(); await page.keyboard.press('Enter');
    await page.waitForURL(/pessoas\/novo/); await page.waitForTimeout(800);
    const depois = await page.title();
    const foco = await page.evaluate(() => { const a = document.activeElement; return { tag: a.tagName, nome: (a.getAttribute('aria-label') || a.textContent || '').trim().slice(0, 40), noTopo: a === document.body || !document.querySelector('main').contains(a) }; });
    reg(depois !== antes, `rota nova: título da aba mudou de "${antes}" para "${depois}"`);
    reg(foco.tag === 'H1' && /Novo contato/.test(foco.nome), `rota nova: o foco vai ao título da tela (<${foco.tag}> "${foco.nome}"), lido pelo leitor de tela`);
    dump.focoAposNavegar = foco;
  } finally {
    try { if (cliente && papelId) await cliente.post(`/roles/${papelId}`, null, 'DELETE'); } catch (e) { reg(false, `limpeza falhou: ${e.message}`); }
    await browser.close();
  }
  const dir = path.join(__dirname, '..', 'docs', 'evidencias');
  fs.mkdirSync(dir, { recursive: true });
  fs.writeFileSync(path.join(dir, `a11y-arvore-${process.env.E2E_BROWSER || 'chromium'}-${new Date().toISOString().slice(0, 10)}.json`), JSON.stringify(dump, null, 2));
  if (estado.falhas) console.error('GOV_A11Y_ARVORE falha na árvore de acessibilidade.');
  process.exit(estado.falhas ? 1 : 0);
}
main().catch((e) => { console.error(e); process.exit(1); });
