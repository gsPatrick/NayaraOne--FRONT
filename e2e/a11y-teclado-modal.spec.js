'use strict';

/**
 * Teclado no modal de excluir papel, atalho Ctrl/Cmd+K, anúncio de carregamento e resumo de erros (relatório do Claude Browser de 04/11/2026).
 * Usa o papel "QA-M9 Papel Teste" semeado na pilha DESCARTÁVEL (nunca homologação), testa com teclado real e tenta excluí-lo ao final.
 * Mede: foco dentro do diálogo em 20 Tab/Shift+Tab, Esc fecha e devolve o foco ao botão Excluir da linha (também por Cancelar e por "Fechar"),
 * Ctrl+K e Meta+K abrem a paleta com foco no campo e Esc devolve o foco, role=status/aria-busy durante "Carregando", e para onde vai o foco ao
 * disparar o formulário inválido de /painel/pessoas/novo (sem salvar). Reprova com GOV_A11Y_MODAL. Uso: E2E_EMAIL=... E2E_PASSWORD=... node e2e/a11y-teclado-modal.spec.js
 */
const { chromium } = require('playwright');
const BASE_URL = process.env.E2E_BASE_URL || 'http://localhost:3000';
const NOME = 'QA-M9 Papel Teste';
const achados = []; let falhas = 0;
const reg = (ok, texto) => { if (!ok) falhas += 1; achados.push(`${ok ? '[OK ]' : '[FALHA]'} ${texto}`); console.log(achados[achados.length - 1]); };
const ativo = (page) => page.evaluate(() => { const a = document.activeElement; const d = document.querySelector('[role=dialog]'); return { nome: (a.getAttribute('aria-label') || a.textContent || a.tagName).trim().slice(0, 30), dentro: d ? d.contains(a) : null, dialogo: !!d }; });

async function main() {
  const email = process.env.E2E_EMAIL; const password = process.env.E2E_PASSWORD;
  if (!email || !password) throw new Error('Informe E2E_EMAIL e E2E_PASSWORD (usuário de teste QA-M9).');
  const browser = await chromium.launch();
  const page = await (await browser.newContext({ viewport: { width: 1280, height: 800 } })).newPage();
  page.setDefaultTimeout(30000);
  await page.goto(`${BASE_URL}/entrar`, { waitUntil: 'networkidle' });
  await page.getByRole('button', { name: /Sou da equipe/i }).click();
  await page.waitForSelector('input[type=email]');
  await page.fill('input[type=email]', email); await page.fill('input[type=password]', password);
  await page.click('button[type=submit]');
  await page.waitForURL((u) => !u.pathname.includes('/entrar'));
  try {
    // Criar papel exige MFA habilitado (403 "Configuração de segurança necessária") e o admin de teste não tem MFA: o papel é semeado no banco
    // descartável (insert em core.roles, nome "QA-M9 Papel Teste") antes de rodar o spec.
    await page.goto(`${BASE_URL}/painel/papeis`, { waitUntil: 'networkidle' });
    const linha = page.locator('tr', { hasText: NOME });
    reg((await linha.count()) === 1, 'papel de teste semeado aparece na lista');
    const excluir = linha.getByRole('button', { name: 'Excluir', exact: true });
    const noExcluir = () => excluir.evaluate((el) => el === document.activeElement);

    await excluir.focus(); await page.keyboard.press('Enter'); await page.waitForSelector('[role=dialog]');
    const aberto = await ativo(page);
    reg(aberto.dentro === true, `ao abrir o modal o foco entra nele ("${aberto.nome}")`);
    let fora = 0; const ciclo = new Set();
    for (let i = 0; i < 10; i += 1) { await page.keyboard.press('Tab'); const s = await ativo(page); ciclo.add(s.nome); if (!s.dentro) fora += 1; }
    for (let i = 0; i < 10; i += 1) { await page.keyboard.press('Shift+Tab'); const s = await ativo(page); ciclo.add(s.nome); if (!s.dentro) fora += 1; }
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

    await page.route(/\/api\/.*people/, async (r) => { await new Promise((x) => setTimeout(x, 3000)); r.continue().catch(() => {}); });
    await page.goto(`${BASE_URL}/painel/pessoas`, { waitUntil: 'commit' }); await page.waitForTimeout(1500);
    const carregando = await page.evaluate(() => [...document.querySelectorAll('[role=status][aria-busy=true],[aria-live]')].map((e) => e.textContent.trim().slice(0, 40)));
    reg(carregando.length > 0, `durante o carregamento há região role=status/aria-busy com texto: ${JSON.stringify(carregando)}`);
    await page.waitForTimeout(3500); await page.unrouteAll({ behavior: 'wait' });

    // Formulário inválido: o wizard só valida no envio; com tudo vazio a API recusa (400) e NADA é salvo.
    await page.goto(`${BASE_URL}/painel/pessoas/novo`, { waitUntil: 'networkidle' });
    let status = null; page.on('response', (r) => { if (r.request().method() === 'POST' && /\/people$/.test(r.url())) status = r.status(); });
    for (let i = 0; i < 4; i += 1) {
      const botao = page.getByRole('button', { name: /Continuar|Criar contato/ });
      const ultimo = /Criar/.test(await botao.textContent());
      await botao.focus(); await page.keyboard.press('Enter'); await page.waitForTimeout(1500);
      if (ultimo) break;
    }
    const val = await page.evaluate(() => { const a = document.activeElement; return { foco: (a.className || a.tagName).toString().slice(0, 30), noAviso: !!a.querySelector('[role=alert]') || !!a.closest('[role=alert]'), alertas: [...document.querySelectorAll('[role=alert]')].map((e) => e.textContent.trim().slice(0, 70)) }; });
    reg(status === 400 && val.noAviso, `envio inválido (POST /people ${status}, nada salvo): o foco vai ao aviso de erro (foco "${val.foco}"), alertas ${JSON.stringify(val.alertas)}`);
  } finally {
    try {
      await page.goto(`${BASE_URL}/painel/papeis`, { waitUntil: 'networkidle' });
      const l = page.locator('tr', { hasText: NOME });
      if (await l.count()) {
        await l.getByRole('button', { name: 'Excluir', exact: true }).focus(); await page.keyboard.press('Enter'); await page.waitForSelector('[role=dialog]');
        await page.getByRole('button', { name: 'Excluir papel' }).focus(); await page.keyboard.press('Enter'); await page.waitForTimeout(2500);
        const titulo = await page.locator('[role=dialog]').first().getAttribute('aria-label').catch(() => null);
        console.log(`(info) após confirmar, diálogo aberto: "${titulo}" (excluir papel exige MFA; sem MFA no admin de teste o papel é removido do banco descartável por SQL)`);
        if (titulo) { await page.keyboard.press('Escape'); await page.waitForTimeout(300); reg((await page.locator('[role=dialog]').count()) === 0, `Esc fecha o diálogo seguinte ("${titulo}")`); }
      }
    } catch (e) { reg(false, `limpeza falhou: ${e.message.slice(0, 120)}`); }
    await browser.close();
  }
  if (falhas) console.error('GOV_A11Y_MODAL falha de teclado no modal/atalho/anúncio/erros.');
  process.exit(falhas ? 1 : 0);
}
main().catch((e) => { console.error(e); process.exit(1); });
