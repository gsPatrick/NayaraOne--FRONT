'use strict';

/**
 * Criar e excluir papel COM MFA (step-up), só com teclado, na pilha DESCARTÁVEL (nunca homologação). Pré-requisitos: o admin de teste com MFA TOTP
 * ligado e o segredo em E2E_TOTP_SECRET; E2E_ZERAR_STEPUP = comando que apaga a janela de "MFA recente" (core.mfa_step_ups) para a exclusão pedir o
 * código de novo. Mede: modal de verificação (foco entra no campo, rótulo, aria-describedby, aria-invalid no erro, mensagem legível, foco volta ao campo,
 * Tab preso, Esc fecha e devolve o foco), criação do papel "QA-M9 Papel Teste" pela UI, exclusão pela UI com o código certo, papel some da lista.
 * Reprova com GOV_A11Y_MFA. Uso: E2E_EMAIL=... E2E_PASSWORD=... E2E_TOTP_SECRET=... E2E_ZERAR_STEPUP="node ..." node e2e/a11y-mfa-excluir-papel.spec.js
 */
const { execSync } = require('child_process');
const { BASE_URL, abrir, entrar, registro } = require('./_a11y-comum');
const { codigoAgora } = require('./_totp');
const { reg, estado } = registro('mfa');
const NOME = 'QA-M9 Papel Teste';
const SEGREDO = process.env.E2E_TOTP_SECRET;
const TECNICO = /MFA_[A-Z_]+|TOTP|\/users\/me|"code"|endpoint/;

const modais = (page) => page.locator('[role=dialog]');
const campo = (page) => page.getByRole('textbox', { name: 'Código do aplicativo autenticador' });
const estadoCampo = (page) => page.evaluate(() => {
  const el = document.getElementById('mfa-modal-codigo');
  const dlg = el && el.closest('[role=dialog]');
  const a = document.activeElement;
  const ids = (el.getAttribute('aria-describedby') || '').split(/\s+/).filter(Boolean);
  return { foco: a === el, dentro: dlg.contains(a), invalido: el.getAttribute('aria-invalid'), rotulo: el.getAttribute('aria-label'), descrito: ids.map((i) => (document.getElementById(i) || {}).innerText || '').join(' ').replace(/\s+/g, ' ').trim(), complete: el.getAttribute('autocomplete') };
});

async function pedirCodigo(page, codigo) {
  await campo(page).fill(codigo);
  await page.keyboard.press('Enter');
}

async function main() {
  if (!SEGREDO) throw new Error('Informe E2E_TOTP_SECRET (segredo TOTP do admin de teste, pilha descartável).');
  const { browser, page } = await abrir();
  try {
    if (process.env.E2E_ZERAR_STEPUP) execSync(process.env.E2E_ZERAR_STEPUP, { stdio: 'pipe' }); // sem janela de MFA recente: a criação também pede o código
    await entrar(page);
    await page.goto(`${BASE_URL}/painel/papeis`, { waitUntil: 'networkidle' });
    reg((await page.locator('tr', { hasText: NOME }).count()) === 0, `antes de começar não existe papel "${NOME}" (pilha limpa)`);
    // 1) Criar o papel pela UI (exige step-up)
    await page.goto(`${BASE_URL}/painel/papeis/novo`, { waitUntil: 'networkidle' });
    await page.waitForSelector('#role-name');
    await page.focus('#role-name'); await page.keyboard.type(NOME);
    await page.getByRole('button', { name: 'Criar papel' }).focus(); await page.keyboard.press('Enter');
    await page.waitForSelector('[role=dialog]');
    await page.waitForTimeout(300);
    let c = await estadoCampo(page);
    reg(c.foco && c.dentro, 'criar papel: o modal "Verificação em duas etapas" abre com o foco no campo do código');
    reg(c.rotulo === 'Código do aplicativo autenticador' && /Para alterar papéis e permissões/.test(c.descrito), `campo com nome acessível "${c.rotulo}" e descrição lida: "${c.descrito}"`);
    reg(c.complete === 'one-time-code', 'campo com autocomplete=one-time-code (gerenciadores de senha preenchem)');
    // Código inválido
    await pedirCodigo(page, '000000');
    await page.waitForSelector('#mfa-modal-erro');
    await page.waitForTimeout(400);
    c = await estadoCampo(page);
    reg(c.invalido === 'true' && c.foco, `código inválido: aria-invalid=${c.invalido} e o foco volta ao campo`);
    reg(/Não foi possível verificar/.test(c.descrito) && !TECNICO.test(c.descrito) && c.descrito.length > 30, `mensagem lida junto do campo: "${c.descrito}"`);
    // Tab preso, Esc fecha e devolve o foco
    let fora = 0;
    for (let i = 0; i < 8; i += 1) { await page.keyboard.press(i < 4 ? 'Tab' : 'Shift+Tab'); if (!(await estadoCampo(page)).dentro) fora += 1; }
    reg(fora === 0, `8 Tab/Shift+Tab no modal de MFA: ${fora} vezes com o foco fora do diálogo`);
    await page.keyboard.press('Escape'); await page.waitForTimeout(300);
    const aviso = await page.evaluate(() => { const a = document.activeElement; return { texto: a.innerText.trim().replace(/\s+/g, ' ').slice(0, 120), alerta: !!a.querySelector('[role=alert]') }; });
    reg((await modais(page).count()) === 0 && aviso.alerta && /Ação cancelada/.test(aviso.texto), `Esc fecha o modal de MFA e o foco vai ao aviso de ação cancelada: "${aviso.texto}"`);
    // Código certo
    await page.getByRole('button', { name: 'Criar papel' }).focus(); await page.keyboard.press('Enter'); await page.waitForSelector('[role=dialog]');
    await pedirCodigo(page, await codigoAgora(SEGREDO));
    await page.waitForURL(/\/painel\/papeis$/, { timeout: 20000 });
    await page.waitForSelector(`tr:has-text("${NOME}")`);
    reg(true, `código certo: o papel "${NOME}" foi criado e aparece na lista`);

    // 2) Excluir (a janela de MFA recente é zerada para a exclusão pedir o código)
    if (process.env.E2E_ZERAR_STEPUP) execSync(process.env.E2E_ZERAR_STEPUP, { stdio: 'pipe' });
    await page.reload({ waitUntil: 'networkidle' });
    const linha = page.locator('tr', { hasText: NOME });
    const excluir = linha.getByRole('button', { name: 'Excluir', exact: true });
    await excluir.focus(); await page.keyboard.press('Enter'); await page.waitForSelector('[role=dialog]');
    await page.getByRole('button', { name: 'Excluir papel' }).focus(); await page.keyboard.press('Enter');
    await page.waitForSelector('#mfa-modal-codigo');
    await page.waitForTimeout(400);
    reg((await modais(page).count()) === 2, `ao confirmar a exclusão abre o modal de MFA sobre o de exclusão (${await modais(page).count()} diálogos)`);
    c = await estadoCampo(page);
    reg(c.foco, 'exclusão: o foco entra no campo do código do MFA');
    fora = 0;
    for (let i = 0; i < 8; i += 1) { await page.keyboard.press(i < 4 ? 'Tab' : 'Shift+Tab'); if (!(await estadoCampo(page)).dentro) fora += 1; }
    reg(fora === 0, `exclusão: 8 Tab/Shift+Tab no modal de MFA: ${fora} vezes fora`);
    await pedirCodigo(page, '123456');
    await page.waitForSelector('#mfa-modal-erro'); await page.waitForTimeout(400);
    c = await estadoCampo(page);
    reg(c.invalido === 'true' && c.foco && !TECNICO.test(c.descrito), `exclusão, código inválido: aria-invalid, foco no campo, "${c.descrito}"`);
    await page.keyboard.press('Escape'); await page.waitForTimeout(300);
    const restam = await modais(page).count();
    const foco = await page.evaluate(() => { const a = document.activeElement; const d = a.closest('[role=dialog]'); return { dentro: !!d, nome: (a.getAttribute('aria-label') || a.textContent || a.tagName).trim().slice(0, 30) }; });
    reg(restam === 1 && foco.dentro, `Esc no MFA fecha só o modal de MFA: sobram ${restam} diálogo(s) e o foco continua dentro do de exclusão ("${foco.nome}")`);
    await page.getByRole('button', { name: 'Excluir papel' }).focus(); await page.keyboard.press('Enter');
    await page.waitForSelector('#mfa-modal-codigo');
    await pedirCodigo(page, await codigoAgora(SEGREDO));
    await page.waitForFunction(() => document.querySelectorAll('[role=dialog]').length === 0, null, { timeout: 20000 });
    await page.waitForTimeout(800);
    reg((await page.locator('tr', { hasText: NOME }).count()) === 0, `código certo: o papel "${NOME}" foi excluído e saiu da lista`);
    const f2 = await page.evaluate(() => { const a = document.activeElement; return { status: a.getAttribute('role') === 'status', texto: a.innerText.trim().replace(/\s+/g, ' ').slice(0, 80) }; });
    reg(f2.status && /foi excluído/.test(f2.texto), `depois da exclusão o foco vai ao aviso de sucesso (role=status): "${f2.texto}"`);
  } finally { await browser.close(); }
  if (estado.falhas) console.error('GOV_A11Y_MFA falha no fluxo de MFA ao criar/excluir papel.');
  process.exit(estado.falhas ? 1 : 0);
}
main().catch((e) => { console.error(e); process.exit(1); });
