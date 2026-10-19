'use strict';

/**
 * E2E (Playwright) — varredura de "código cru" visível ao usuário nos Marcos 4/5
 * (financeiro, contratos, jurídico/processos, cobrança/régua). Abre cada tela (e até 3 detalhes
 * por lista, pelos links da própria tela), lê o texto VISÍVEL e procura:
 *   - UUID
 *   - data ISO (2026-10-19 / 2026-10-19T...)
 *   - ENUM em maiúsculas com sublinhado (PENDING_CLASSIFICATION, SANDBOX_CONFIRMED...) ou códigos
 *     de status soltos conhecidos (PENDING, SETTLED, ACTIVE...)
 *   - número em formato americano (1,234.56 / 1234.56 em contexto de valor)
 * Não escreve nada; não chama MFA. Salva print de cada tela e um JSON com os achados.
 *
 * Uso: node e2e/m45-varredura-codigo-cru.spec.js  (E2E_SHOTS = pasta dos prints)
 */

const path = require('path');
const fs = require('fs');
const { chromium } = require('playwright');

const BASE_URL = process.env.E2E_BASE_URL || 'http://localhost:3000';
const EMAIL = process.env.E2E_EMAIL || 'admin@nayaraone.dev';
const PASSWORD = process.env.E2E_PASSWORD || 'DevAdmin#2026';
const SHOTS = process.env.E2E_SHOTS || path.join(__dirname, 'shots', 'm45-varredura');
fs.mkdirSync(SHOTS, { recursive: true });

const ROUTES = [
  '/painel/financeiro', '/painel/financeiro/antifraude', '/painel/financeiro/aprovacoes', '/painel/financeiro/centros',
  '/painel/financeiro/comissoes-repasses', '/painel/financeiro/conciliacao', '/painel/financeiro/consolidado-grupo',
  '/painel/financeiro/contas-bancarias', '/painel/financeiro/contas-bancarias/novo', '/painel/financeiro/extrato',
  '/painel/financeiro/fechamento', '/painel/financeiro/intencoes-pagamento', '/painel/financeiro/intercompany',
  '/painel/financeiro/lancamentos', '/painel/financeiro/lancamentos/novo', '/painel/financeiro/orcamento',
  '/painel/financeiro/plano-de-contas', '/painel/financeiro/regra-comissao', '/painel/financeiro/regua-cobranca',
  '/painel/financeiro/relatorio',
  '/painel/contratos', '/painel/contratos/clausulas', '/painel/contratos/entrega-chaves', '/painel/contratos/entrega-chaves/novo',
  '/painel/contratos/garantias', '/painel/contratos/garantias/novo', '/painel/contratos/lista', '/painel/contratos/lista/novo',
  '/painel/contratos/locacao', '/painel/contratos/notificacoes', '/painel/contratos/processos', '/painel/contratos/processos/novo',
  '/painel/contratos/vistorias', '/painel/contratos/vistorias/novo',
];
const DETAIL_FROM = {
  '/painel/financeiro/lancamentos': /\/painel\/financeiro\/lancamentos\/[0-9a-f-]{36}$/,
  '/painel/financeiro/contas-bancarias': /\/painel\/financeiro\/contas-bancarias\/[0-9a-f-]{36}$/,
  '/painel/contratos/lista': /\/painel\/contratos\/lista\/[0-9a-f-]{36}$/,
  '/painel/contratos/entrega-chaves': /\/painel\/contratos\/entrega-chaves\/[0-9a-f-]{36}$/,
  '/painel/contratos/garantias': /\/painel\/contratos\/garantias\/[0-9a-f-]{36}$/,
  '/painel/contratos/processos': /\/painel\/contratos\/processos\/[0-9a-f-]{36}$/,
  '/painel/contratos/vistorias': /\/painel\/contratos\/vistorias\/[0-9a-f-]{36}$/,
};

const PATTERNS = [
  { kind: 'UUID', re: /\b[0-9a-f]{8}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{12}\b/gi },
  { kind: 'DATA_ISO', re: /\b\d{4}-\d{2}-\d{2}(?:T\d{2}:\d{2}[^\s]*)?\b/g },
  { kind: 'ENUM', re: /\b[A-Z]{2,}(?:_[A-Z0-9]+)+\b/g },
  { kind: 'STATUS_CRU', re: /\b(?:PENDING|SETTLED|PARTIALLY|CANCELLED|CANCELED|ACTIVE|INACTIVE|DRAFT|SIGNED|RELEASED|APPROVED|REJECTED|SUBMITTED|SUBMITTING|EXECUTED|FAILED|PAID|OPEN|CLOSED|COMPLETED|RECEIVABLE|PAYABLE|CREDIT|DEBIT|LEASE|SALE|LANDLORD|TENANT|BUYER|SELLER|GUARANTOR|EXPIRED|BLOCKED|MANUAL|SANDBOX)\b/g },
  { kind: 'NUMERO_EUA', re: /(?:R\$\s?)?\b\d{1,3}(?:,\d{3})+\.\d{2}\b|R\$\s?\d+\.\d{2}\b/g },
];
// Siglas legítimas que não são código cru.
const ALLOW = new Set(['CPF', 'CNPJ', 'PIX', 'TED', 'DOC', 'CEP', 'SLA', 'PDF', 'CSV', 'MFA', 'DRE', 'IGPM', 'IPCA', 'INCC', 'SHA', 'API']);

async function main() {
  const browser = await chromium.launch();
  const page = await browser.newPage({ viewport: { width: 1440, height: 1000 } });
  page.setDefaultTimeout(60000);
  const findings = [];
  const visited = [];

  await page.goto(`${BASE_URL}/entrar`, { waitUntil: 'domcontentloaded' });
  const teamTab = page.getByText('Sou da equipe', { exact: false });
  if (await teamTab.count()) await teamTab.first().click();
  await page.waitForSelector('input[type=email]');
  await page.fill('input[type=email]', EMAIL);
  await page.fill('input[type=password]', PASSWORD);
  await page.click('button[type=submit]');
  await page.waitForURL((u) => !u.pathname.includes('/entrar'), { timeout: 60000 }).catch(() => {});
  if (page.url().includes('/entrar')) throw new Error('login falhou');

  async function scan(route) {
    await page.goto(`${BASE_URL}${route}`, { waitUntil: 'domcontentloaded' });
    await page.waitForLoadState('networkidle', { timeout: 20000 }).catch(() => {});
    await page.waitForTimeout(1500);
    // Texto visível; ignora o conteúdo de <pre> do termo (hash) e valores de input.
    const text = await page.evaluate(() => document.body.innerText);
    const name = route.replace(/^\/painel\//, '').replace(/[^a-z0-9]+/gi, '-');
    await page.screenshot({ path: path.join(SHOTS, `${name}.png`), fullPage: true });
    const lines = text.split('\n');
    for (const p of PATTERNS) {
      for (const line of lines) {
        const matches = line.match(p.re) || [];
        for (const m of matches) {
          if (ALLOW.has(m)) continue;
          // Dado digitado pelo usuário, não código do sistema: número de conta bancária
          // (ex.: "Conta M45-SANDBOX") e código de cláusula definido no cadastro de cláusulas.
          if (/conta|cc |ag\.? \d/i.test(line) && /SANDBOX/.test(m)) continue;
          if (route === '/painel/contratos/clausulas' && /^[A-Z0-9_]+$/.test(m) && p.kind === 'ENUM') continue;
          if (p.kind === 'DATA_ISO' && /SHA-256|integridade/i.test(line)) continue;
          if (/Código de integridade|SHA-256:/.test(line)) continue;
          const at = line.indexOf(m);
          findings.push({ route, kind: p.kind, match: m, line: line.slice(Math.max(0, at - 80), at + m.length + 80).trim() });
        }
      }
    }
    visited.push(route);
    return name;
  }

  for (const route of ROUTES) {
    try {
      await scan(route);
      const detailRe = DETAIL_FROM[route];
      if (detailRe) {
        const hrefs = await page.evaluate(() => Array.from(document.querySelectorAll('a[href]')).map((a) => a.getAttribute('href')));
        const details = [...new Set(hrefs.filter((h) => h && detailRe.test(h)))].slice(0, 3);
        for (const d of details) await scan(d).catch((e) => findings.push({ route: d, kind: 'ERRO', match: String(e.message).slice(0, 120), line: '' }));
      }
    } catch (err) {
      findings.push({ route, kind: 'ERRO', match: String(err.message).split('\n')[0], line: '' });
    }
  }
  await browser.close();
  const out = path.join(SHOTS, 'achados.json');
  fs.writeFileSync(out, JSON.stringify({ visited, findings }, null, 2));
  const byKind = findings.reduce((acc, f) => ({ ...acc, [f.kind]: (acc[f.kind] || 0) + 1 }), {});
  console.log(`telas: ${visited.length}; achados: ${findings.length} ${JSON.stringify(byKind)}`);
  for (const f of findings) console.log(`[${f.kind}] ${f.route} :: ${f.match} :: ${f.line}`);
  process.exit(findings.filter((f) => f.kind !== 'ERRO').length ? 1 : 0);
}

main().catch((err) => {
  console.error(err);
  process.exit(2);
});
