'use strict';

/**
 * Acessibilidade com navegador (M9-D851 §3.6): @axe-core/playwright nas telas-chave de e2e/a11y-pages.json, COM a regra de contraste
 * (que o axe sem navegador não calcula). Qualquer violação serious ou critical reprova com GOV_A11Y_VIOLATION. Grava o relatório em
 * docs/evidencias/a11y-axe-<data>.json. Executado em 05/11/2026 em Chromium, Firefox e WebKit, nos dois temas (Onyx e Clássico) e com a barra lateral;
 * o equivalente sem navegador roda no CI em test/m9d851.axe.test.mjs. Medidas extras no relatório: contraste do contorno de foco e do item ativo da barra lateral.
 *
 * Uso: E2E_BASE_URL=http://localhost:3000 E2E_EMAIL=... E2E_PASSWORD=... node e2e/a11y-axe.spec.js   (usuário de teste QA-M9; nunca credencial real;
 * E2E_BASE_URL aponta para a pilha local, com a API local e banco descartável; o padrão é http://localhost:3000)
 */
const fs = require('fs');
const path = require('path');
const playwright = require('playwright');
const AxeBuilder = require('@axe-core/playwright').default;

const BASE_URL = process.env.E2E_BASE_URL || 'http://localhost:3000';
const pages = JSON.parse(fs.readFileSync(path.join(__dirname, 'a11y-pages.json'), 'utf8')).paginas;

async function main() {
  const email = process.env.E2E_EMAIL;
  const password = process.env.E2E_PASSWORD;
  if (!email || !password) throw new Error('Informe E2E_EMAIL e E2E_PASSWORD (usuário de teste QA-M9).');
  const browser = await playwright[process.env.E2E_BROWSER || 'chromium'].launch();
  const report = [];
  let failed = 0;
  // Dois temas: "onyx" (preto+dourado, é o PADRÃO do sistema: data-theme="onyx" no <html>, lido de localStorage 'nayara-one:theme'; qualquer valor diferente
  // de 'default' = Onyx) e "classico" ('default' em localStorage, sem data-theme). Cada um roda todas as telas, com a barra lateral (escura no Onyx) dentro da página.
  try {
    for (const tema of ['onyx', 'classico']) {
      const context = await browser.newContext({ viewport: { width: 1280, height: 900 } }); // @axe-core/playwright 4.x recusa browser.newPage()
      await context.addInitScript((valor) => { try { window.localStorage.setItem('nayara-one:theme', valor); } catch (e) { /* sem storage */ } }, tema === 'onyx' ? 'onyx' : 'default');
      const page = await context.newPage();
      page.setDefaultTimeout(30000);
      const marca = async () => { const t = await page.evaluate(() => document.documentElement.getAttribute('data-theme')); if ((tema === 'onyx') !== (t === 'onyx')) throw new Error(`tema ${tema} não aplicado (data-theme=${t})`); };
      for (const target of pages.filter((item) => !item.painel)) {
        await page.goto(`${BASE_URL}${target.path}`, { waitUntil: 'networkidle' });
        await marca();
        report.push(await audit(page, { ...target, nome: `${target.nome} [${tema}]` }));
      }
      await page.goto(`${BASE_URL}/entrar`, { waitUntil: 'networkidle' }); // espera a hidratação: sem isso o clique em "Sou da equipe" cai antes do React e a tela não avança
      await page.getByRole('button', { name: /Sou da equipe/i }).click(); // a tela abre primeiro na escolha de perfil
      await page.waitForSelector('input[type=email]');
      report.push(await audit(page, { nome: `Login (formulário da equipe) [${tema}]`, path: '/entrar' }));
      await page.fill('input[type=email]', email);
      await page.fill('input[type=password]', password);
      await page.click('button[type=submit]');
      await page.waitForURL((url) => !url.pathname.includes('/entrar'));
      for (const target of [...pages.filter((item) => item.painel), { nome: 'Papéis', path: '/painel/papeis', painel: true }]) {
        await page.goto(`${BASE_URL}${target.path}`, { waitUntil: 'networkidle' });
        await marca();
        report.push(await audit(page, { ...target, nome: `${target.nome} [${tema}]` }));
      }
      report.push(await focoNaBarraLateral(page, tema));
      await context.close();
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
  fs.writeFileSync(path.join(dir, `a11y-axe-${process.env.E2E_BROWSER && process.env.E2E_BROWSER !== 'chromium' ? process.env.E2E_BROWSER + '-' : ''}${new Date().toISOString().slice(0, 10)}.json`), JSON.stringify(report, null, 2));
  process.exit(failed ? 1 : 0);
}

function lum([r, g, b]) { const f = (c) => { c /= 255; return c <= 0.03928 ? c / 12.92 : ((c + 0.055) / 1.055) ** 2.4; }; return 0.2126 * f(r) + 0.7152 * f(g) + 0.0722 * f(b); }
const razao = (a, b) => { const [x, y] = [lum(a), lum(b)].sort((p, q) => q - p); return (x + 0.05) / (y + 0.05); };
const rgba = (texto) => (texto.match(/[\d.]+/g) || []).map(Number);
// Fundo translúcido (ex.: rgba(190,145,48,0.12)) é composto sobre o fundo de baixo antes de medir o contraste.
const compor = (cima, baixo) => { const a = cima.length > 3 ? cima[3] : 1; return [0, 1, 2].map((i) => Math.round(cima[i] * a + baixo[i] * (1 - a))); };

/** Contorno de foco (3:1) e texto do item ativo/rótulo (4,5:1) medidos na barra lateral, onde o axe não vê o estado de foco. */
async function focoNaBarraLateral(page, tema) {
  await page.goto(`${BASE_URL}/painel`, { waitUntil: 'networkidle' });
  const m = await page.evaluate(() => {
    const nav = document.querySelector('aside, nav');
    const link = nav && nav.querySelector('a[href]');
    if (!link) return null;
    link.focus();
    const cs = getComputedStyle(link); const bg = getComputedStyle(nav);
    const ativo = nav.querySelector('[aria-current="page"]');
    const acs = ativo ? getComputedStyle(ativo) : null;
    return { anel: cs.outlineColor, larg: cs.outlineWidth, estilo: cs.outlineStyle, fundo: bg.backgroundColor, ativoCor: acs && acs.color, ativoFundo: acs && acs.backgroundColor };
  });
  const out = { pagina: `Barra lateral, foco e item ativo [${tema}]`, path: '/painel', violacoes: [], medidas: m };
  if (m) {
    const anel = rgba(m.anel); const fundo = rgba(m.fundo);
    const r1 = razao(anel.slice(0, 3), fundo.slice(0, 3));
    out.medidas.contrasteFoco = Number(r1.toFixed(2));
    if (m.estilo === 'none' || parseFloat(m.larg) < 2 || r1 < 3) out.violacoes.push({ regra: 'foco-barra-lateral', impacto: 'serious', alvos: [`contorno ${m.larg} ${m.estilo} ${m.anel} sobre ${m.fundo} = ${r1.toFixed(2)}:1`] });
    if (m.ativoCor && m.ativoFundo && !/rgba\(0, 0, 0, 0\)/.test(m.ativoFundo)) { const r2 = razao(rgba(m.ativoCor).slice(0, 3), compor(rgba(m.ativoFundo), fundo)); out.medidas.contrasteAtivo = Number(r2.toFixed(2)); if (r2 < 4.5) out.violacoes.push({ regra: 'item-ativo-barra-lateral', impacto: 'serious', alvos: [`${m.ativoCor} sobre ${m.ativoFundo} = ${r2.toFixed(2)}:1`] }); }
  }
  return out;
}

async function audit(page, target) {
  const results = await new AxeBuilder({ page }).withTags(['wcag2a', 'wcag2aa', 'wcag21a', 'wcag21aa']).analyze();
  return { pagina: target.nome, path: target.path, violacoes: results.violations.map((v) => ({ regra: v.id, impacto: v.impact, alvos: v.nodes.map((n) => n.target.join(' ')) })) };
}

main().catch((error) => { console.error(error); process.exit(1); });
