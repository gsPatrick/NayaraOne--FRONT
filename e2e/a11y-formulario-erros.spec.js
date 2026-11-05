'use strict';

/**
 * Erros de formulário em linguagem simples e acessíveis (M9-D851 §3.5), em /painel/pessoas/novo (assistente de 4 etapas), com teclado real:
 * 1) "Continuar" com tudo vazio: o foco vai ao resumo (role=alert), cada campo obrigatório fica com aria-invalid=true e aria-describedby apontando
 *    à mensagem do campo, sem texto técnico (groupId, companyId, legalName, nomes camelCase, aspas, códigos em maiúsculas).
 * 2) Corrigir o campo remove o erro dele (aria-invalid sai) e o resumo some quando não há mais erro.
 * 3) A API recusa (resposta simulada com a mensagem crua real "Os campos "groupId", "companyId" e "legalName" são obrigatórios."): a tela leva ao
 *    campo certo e mostra rótulo humano. Nada é salvo (a única chamada ao POST /people é interceptada).
 * Reprova com GOV_A11Y_FORM. Uso: E2E_EMAIL=... E2E_PASSWORD=... [E2E_BROWSER=firefox] node e2e/a11y-formulario-erros.spec.js
 */
const { BASE_URL, abrir, entrar, registro } = require('./_a11y-comum');
const { reg, estado } = registro('form');
const TECNICO = /groupId|companyId|legalName|taxIdNormalized|zipCode|[a-z]{2,}[A-Z][A-Za-z]+|"|[A-Z]{3,}_[A-Z_]{3,}/;

async function lerCampo(page, id) {
  return page.evaluate((fid) => {
    const el = document.getElementById(fid);
    if (!el) return null;
    const ids = (el.getAttribute('aria-describedby') || '').split(/\s+/).filter(Boolean);
    return { invalido: el.getAttribute('aria-invalid'), msg: ids.map((i) => (document.getElementById(i) || {}).textContent || '').join(' ').trim(), rotulo: (document.querySelector(`label[for="${fid}"]`) || {}).textContent };
  }, id);
}
const foco = (page) => page.evaluate(() => { const a = document.activeElement; return { alerta: a.getAttribute('role') === 'alert' && a.hasAttribute('data-error-summary'), texto: a.innerText.trim().replace(/\s+/g, ' ').slice(0, 200), itens: a.querySelectorAll('li').length }; });

async function main() {
  const { browser, page } = await abrir();
  try {
    await entrar(page);
    await page.goto(`${BASE_URL}/painel/pessoas/novo`, { waitUntil: 'networkidle' });
    await page.waitForSelector('#p-name');
    const clicar = async () => { const b = page.getByRole('button', { name: /Continuar|Criar contato/ }); await b.focus(); await page.keyboard.press('Enter'); await page.waitForTimeout(500); };

    // Etapa 1 vazia
    await clicar();
    let f = await foco(page);
    reg(f.alerta && f.itens === 2, `etapa 1 vazia: o foco vai ao resumo de erros (role=alert) com ${f.itens} itens: "${f.texto}"`);
    reg(!TECNICO.test(f.texto), 'resumo sem texto técnico');
    for (const id of ['p-name', 'p-doc']) {
      const c = await lerCampo(page, id);
      reg(c && c.invalido === 'true' && c.msg.length > 8 && !TECNICO.test(c.msg), `#${id} (${c && c.rotulo}): aria-invalid=${c && c.invalido}, mensagem lida pelo aria-describedby: "${c && c.msg}"`);
    }
    // Item do resumo leva o foco ao campo
    await page.locator('[data-error-summary] a').first().focus(); await page.keyboard.press('Enter');
    reg(await page.evaluate(() => document.activeElement.id === 'p-name'), 'Enter no 1º item do resumo leva o foco ao campo "Nome / Razão social"');
    // Corrigir
    await page.fill('#p-name', 'QA-M9 Erro Teste');
    reg((await lerCampo(page, 'p-name')).invalido === null, 'ao digitar o nome, o aria-invalid do campo some');
    await page.fill('#p-doc', '123.456.789-0');
    await clicar();
    const doc = await lerCampo(page, 'p-doc');
    reg(/11 dígitos/.test(doc.msg), `CPF incompleto: "${doc.msg}"`);
    await page.fill('#p-doc', '12345678909');
    await clicar();
    reg((await page.locator('[data-error-summary]').count()) === 0 && (await page.locator('text=Contatos e documentos').count()) > 0, 'com o CPF completo avança para a etapa 2 e o resumo some');

    // Etapa 2 sem contato
    await clicar();
    f = await foco(page);
    const ct = await lerCampo(page, 'p-contact-value-0');
    reg(f.alerta && ct.invalido === 'true' && /telefone ou e-mail/.test(ct.msg), `etapa 2 sem contato: foco no resumo; campo Valor com aria-invalid e "${ct.msg}"`);
    await page.fill('#p-contact-value-0', '(11) 90000-0000');
    await clicar();

    // Etapa 3 vazia
    await clicar();
    f = await foco(page);
    reg(f.alerta && f.itens === 5, `etapa 3 vazia: resumo com ${f.itens} itens`);
    for (const id of ['p-zip', 'p-street', 'p-neighborhood', 'p-city', 'p-state']) {
      const c = await lerCampo(page, id);
      reg(c && c.invalido === 'true' && c.msg.length > 8 && !TECNICO.test(c.msg), `#${id}: aria-invalid=${c && c.invalido}, "${c && c.msg}"`);
    }
    await page.fill('#p-zip', '01001000'); await page.fill('#p-street', 'Rua Teste'); await page.fill('#p-neighborhood', 'Centro'); await page.fill('#p-city', 'São Paulo'); await page.fill('#p-state', 'SP');
    await page.waitForTimeout(800);

    // API recusa com a mensagem crua: simulada, nada é salvo
    let chamadas = 0;
    await page.route(/\/people$/, async (r) => {
      if (r.request().method() !== 'POST') return r.continue();
      chamadas += 1;
      await r.fulfill({ status: 400, contentType: 'application/json', body: JSON.stringify({ success: false, error: { code: 'PERSON_VALIDATION', message: 'Os campos "groupId", "companyId" e "legalName" são obrigatórios.', traceId: 'e2e-sim' } }) });
    });
    await clicar(); // etapa 4 (revisão)
    await clicar(); // Criar contato
    await page.waitForTimeout(800);
    f = await foco(page);
    const nome = await lerCampo(page, 'p-name');
    reg(chamadas === 1, `a API (simulada) foi chamada ${chamadas} vez; nada foi salvo`);
    reg(f.alerta && nome && nome.invalido === 'true' && !TECNICO.test(f.texto + nome.msg), `erro da API levado ao campo certo: foco no resumo "${f.texto}", campo Nome com aria-invalid e "${nome && nome.msg}"`);
    const corpo = await page.evaluate(() => document.body.innerText);
    reg(!/groupId|companyId|legalName/.test(corpo), 'a tela inteira não mostra groupId, companyId nem legalName');
    await page.unroute(/\/people$/);
  } finally { await browser.close(); }
  if (estado.falhas) console.error('GOV_A11Y_FORM falha nos erros de formulário.');
  process.exit(estado.falhas ? 1 : 0);
}
main().catch((e) => { console.error(e); process.exit(1); });
