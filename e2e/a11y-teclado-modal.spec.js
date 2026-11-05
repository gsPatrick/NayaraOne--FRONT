'use strict';

/**
 * Teclado no modal de excluir papel, atalho Ctrl/Cmd+K, anúncio de carregamento e resumo de erros (relatório do Claude Browser de 04/11/2026).
 * Usa o papel "QA-M9 Papel Teste" semeado na pilha DESCARTÁVEL (nunca homologação), testa com teclado real e tenta excluí-lo ao final.
 * Mede: foco dentro do diálogo em 20 Tab/Shift+Tab, Esc fecha e devolve o foco ao botão Excluir da linha (também por Cancelar e por "Fechar"),
 * Ctrl+K e Meta+K abrem a paleta com foco no campo e Esc devolve o foco, role=status/aria-busy durante "Carregando", e para onde vai o foco ao
 * disparar o formulário inválido de /painel/pessoas/novo (sem salvar). Reprova com GOV_A11Y_MODAL. Uso: E2E_EMAIL=... E2E_PASSWORD=... node e2e/a11y-teclado-modal.spec.js
 */
const { navegador, TAB, STAB } = require('./_a11y-comum'); // E2E_BROWSER=chromium|firefox|webkit
const { api, interceptarApi, interceptacaoFunciona } = require('./_a11y-comum');
const BASE_URL = process.env.E2E_BASE_URL || 'http://localhost:3000';
const NOME = 'QA-M9 Papel Teste';
const achados = []; let falhas = 0;
const reg = (ok, texto) => { if (!ok) falhas += 1; achados.push(`${ok ? '[OK ]' : '[FALHA]'} ${texto}`); console.log(achados[achados.length - 1]); };
const ativo = (page) => page.evaluate(() => { const a = document.activeElement; const d = document.querySelector('[role=dialog]'); return { nome: (a.getAttribute('aria-label') || a.textContent || a.tagName).trim().slice(0, 30), dentro: d ? d.contains(a) : null, dialogo: !!d }; });

async function main() {
  const email = process.env.E2E_EMAIL; const password = process.env.E2E_PASSWORD;
  if (!email || !password) throw new Error('Informe E2E_EMAIL e E2E_PASSWORD (usuário de teste QA-M9).');
  const browser = await navegador().launch();
  const page = await (await browser.newContext({ viewport: { width: 1280, height: 800 } })).newPage();
  page.setDefaultTimeout(30000);
  await page.goto(`${BASE_URL}/entrar`, { waitUntil: 'networkidle' });
  await page.getByRole('button', { name: /Sou da equipe/i }).click();
  await page.waitForSelector('input[type=email]');
  await page.fill('input[type=email]', email); await page.fill('input[type=password]', password);
  await page.click('button[type=submit]');
  await page.waitForURL((u) => !u.pathname.includes('/entrar'));
  const intercepta = await interceptacaoFunciona(page); // WebKit não intercepta a rede do Front (ver _a11y-comum.js)
  let papelId = null; let cliente = null;
  try {
    // Criar papel exige MFA: com E2E_TOTP_SECRET o papel é criado pela API (MFA recente pelo TOTP calculado na hora) e removido ao final.
    // Sem o segredo, o papel "QA-M9 Papel Teste" precisa estar semeado no banco descartável.
    if (process.env.E2E_TOTP_SECRET) { cliente = await api(); const c = await cliente.post('/roles', { name: NOME, description: 'Teste de teclado', permissionIds: [] }); papelId = c.json.data && c.json.data.id; }
    await page.goto(`${BASE_URL}/painel/papeis`, { waitUntil: 'networkidle' });
    const linha = page.locator('tr', { hasText: NOME });
    reg((await linha.count()) === 1, 'papel de teste semeado aparece na lista');
    const excluir = linha.getByRole('button', { name: 'Excluir', exact: true });
    const noExcluir = () => excluir.evaluate((el) => el === document.activeElement);

    await excluir.focus(); await page.keyboard.press('Enter'); await page.waitForSelector('[role=dialog]');
    const aberto = await ativo(page);
    reg(aberto.dentro === true, `ao abrir o modal o foco entra nele ("${aberto.nome}")`);
    let fora = 0; const ciclo = new Set();
    for (let i = 0; i < 10; i += 1) { await page.keyboard.press(TAB); const s = await ativo(page); ciclo.add(s.nome); if (!s.dentro) fora += 1; }
    for (let i = 0; i < 10; i += 1) { await page.keyboard.press(STAB); const s = await ativo(page); ciclo.add(s.nome); if (!s.dentro) fora += 1; }
    reg(fora === 0, `20 Tab/Shift+Tab: ${fora} vezes com o foco fora do diálogo (ciclo: ${[...ciclo].join(' > ')})`);
    await page.keyboard.press('Escape'); await page.waitForTimeout(300);
    reg(!(await ativo(page)).dialogo && (await noExcluir()), 'Esc fecha o modal e o foco volta ao botão Excluir da linha');
    await page.keyboard.press('Space'); await page.waitForSelector('[role=dialog]');
    await page.getByRole('button', { name: 'Cancelar' }).focus(); await page.keyboard.press('Enter'); await page.waitForTimeout(300);
    reg(!(await ativo(page)).dialogo && (await noExcluir()), 'Cancelar (Enter) fecha e devolve o foco ao botão Excluir');
    await page.keyboard.press('Enter'); await page.waitForSelector('[role=dialog]');
    await page.getByRole('button', { name: 'Fechar' }).focus(); await page.keyboard.press('Enter'); await page.waitForTimeout(300);
    reg(!(await ativo(page)).dialogo && (await noExcluir()), 'Fechar (X, Enter) fecha e devolve o foco ao botão Excluir');

    for (const combo of ['Control+k', 'Meta+k']) {
      await page.goto(`${BASE_URL}/painel`, { waitUntil: 'networkidle' }); await page.waitForTimeout(500);
      await page.locator('header button, nav a, main a').first().focus();
      const antes = await page.evaluate(() => { window.__gatilho = document.activeElement; return (document.activeElement.getAttribute('aria-label') || document.activeElement.textContent || '').trim().slice(0, 20); });
      await page.keyboard.press(combo); await page.waitForTimeout(500);
      const info = await page.evaluate(() => { const d = document.querySelector('[role=dialog]'); const a = document.activeElement; return d ? { modal: d.getAttribute('aria-modal'), foco: d.contains(a), campo: a.tagName === 'INPUT' } : null; });
      reg(!!info && info.foco && info.campo, `${combo} abre a paleta com o foco no campo de busca ${JSON.stringify(info)}`);
      await page.keyboard.press('Escape'); await page.waitForTimeout(300);
      reg(!(await ativo(page)).dialogo && (await page.evaluate(() => document.activeElement === window.__gatilho)), `${combo}: Esc fecha a paleta e o foco volta ao elemento que estava focado antes ("${antes}")`);
    }

    if (!intercepta) console.log('(pulado) carregamento e erro simulados: este navegador não intercepta a rede do Front (cobertos em Chromium e Firefox)');
    else {
      await interceptarApi(page, /\/people(\?.*)?$/, async (r) => { await new Promise((x) => setTimeout(x, 6000)); r.continue().catch(() => {}); });
      await page.goto(`${BASE_URL}/painel/pessoas`, { waitUntil: 'commit' }); await page.waitForSelector('[role=status][aria-busy=true]', { timeout: 5500 }).catch(() => {});
      const carregando = await page.evaluate(() => [...document.querySelectorAll('[role=status][aria-busy=true],[aria-live]')].map((e) => e.textContent.trim().slice(0, 40)));
      reg(carregando.length > 0, `durante o carregamento há região role=status/aria-busy com texto: ${JSON.stringify(carregando)}`);
      await page.waitForTimeout(6500); await page.unrouteAll({ behavior: 'wait' });
    }

    // Formulário inválido: o assistente valida no cliente (nada vai à API) e o foco vai ao resumo de erros (role=alert). Detalhe em a11y-formulario-erros.spec.js.
    await page.goto(`${BASE_URL}/painel/pessoas/novo`, { waitUntil: 'networkidle' });
    let posts = 0; page.on('request', (r) => { if (r.method() === 'POST' && /\/people$/.test(r.url())) posts += 1; });
    const botao = page.getByRole('button', { name: /Continuar/ });
    await botao.focus(); await page.keyboard.press('Enter'); await page.waitForTimeout(800);
    const val = await page.evaluate(() => { const a = document.activeElement; return { alerta: a.getAttribute('role') === 'alert', texto: a.innerText.trim().replace(/\s+/g, ' ').slice(0, 90), invalidos: document.querySelectorAll('[aria-invalid=true]').length }; });
    reg(posts === 0 && val.alerta && val.invalidos === 2, `envio inválido: nada vai à API (${posts} POST), o foco vai ao resumo "${val.texto}" e ${val.invalidos} campos têm aria-invalid`);
  } finally {
    try { if (cliente && papelId) { const d = await cliente.post(`/roles/${papelId}`, null, 'DELETE'); console.log(`(info) limpeza: papel de teste excluído pela API (${d.status})`); } } catch (e) { reg(false, `limpeza falhou: ${e.message.slice(0, 120)}`); }
    await browser.close();
  }
  if (falhas) console.error('GOV_A11Y_MODAL falha de teclado no modal/atalho/anúncio/erros.');
  process.exit(falhas ? 1 : 0);
}
main().catch((e) => { console.error(e); process.exit(1); });
