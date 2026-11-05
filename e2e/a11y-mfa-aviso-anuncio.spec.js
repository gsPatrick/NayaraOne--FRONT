'use strict';

/**
 * M9-D851 — achados do teste de teclado no Chrome real. Na pilha DESCARTÁVEL, com o admin de teste SEM MFA:
 * (1) "Criar papel" (pedido real à API, que recusa com MFA_REQUIRED_NOT_ENABLED e não cria nada), "Excluir papel" e "Salvar alterações" (respostas
 *     simuladas sobre um papel fictício, nada é gravado): o aviso recebe o foco, é anunciado (role=alert), "Ir para Meu perfil" e "Fechar aviso" se
 *     alcançam por Tab, Enter em "Fechar aviso" devolve o foco ao botão que disparou a ação (nunca ao <body>).
 * (2) /painel/pessoas: região viva persistente (role=status, aria-live=polite) existe ANTES do texto mudar; a sequência de mutações observada anuncia
 *     "Carregando contatos…", "N contatos encontrados" e, na busca, "Nenhum contato encontrado"; ariaSnapshot da região.
 * (5) Título da aba correto desde o HTML do servidor (nunca passa por "Painel").
 * Grava docs/evidencias/a11y-mfa-aviso-anuncio-<navegador>-<data>.json. Reprova com GOV_A11Y_AVISO.
 * Uso: E2E_EMAIL=... E2E_PASSWORD=... [E2E_BROWSER=firefox] node e2e/a11y-mfa-aviso-anuncio.spec.js (a parte simulada roda onde a interceptação funciona)
 */
const fs = require('fs');
const path = require('path');
const { BASE_URL, abrir, entrar, registro, TAB, interceptarApi, interceptacaoFunciona } = require('./_a11y-comum');
const { reg, achados, estado } = registro('aviso');
const FALSO = 'qa-m9-papel-aviso';
const NOME = 'QA-M9 Papel Aviso';
const MFA = { error: { code: 'MFA_REQUIRED_NOT_ENABLED', message: 'MFA obrigatório: configure em /users/me/mfa/setup' } };

const foco = (page) => page.evaluate(() => { const a = document.activeElement; return { body: a === document.body, aviso: a.hasAttribute('data-mfa-setup-notice'), alerta: !!(a.querySelector && a.querySelector('[role=alert]')), texto: (a.innerText || a.textContent || '').trim().replace(/\s+/g, ' ').slice(0, 140) }; });

async function avisoCompleto(page, rotulo, gatilho) {
  await page.waitForSelector('[data-mfa-setup-notice]'); await page.waitForTimeout(300);
  const f = await foco(page);
  reg(f.aviso && f.alerta && /Configuração de segurança necessária/.test(f.texto), `${rotulo}: o foco vai ao aviso (role=alert) e não ao body: "${f.texto.slice(0, 80)}"`);
  reg(!/MFA_|\/users\/me/.test(f.texto), `${rotulo}: aviso sem código técnico`);
  await page.keyboard.press(TAB);
  const link = await page.evaluate(() => ({ t: document.activeElement.textContent.trim(), href: document.activeElement.getAttribute('href') }));
  reg(link.t === 'Ir para Meu perfil' && link.href === '/painel/perfil', `${rotulo}: Tab a partir do aviso chega ao link "${link.t}" (${link.href})`);
  await page.keyboard.press(TAB);
  const fechar = await page.evaluate(() => document.activeElement.textContent.trim());
  reg(fechar === 'Fechar aviso', `${rotulo}: Tab seguinte chega a "${fechar}"`);
  await page.keyboard.press('Enter'); await page.waitForTimeout(300);
  const depois = await page.evaluate(() => ({ body: document.activeElement === document.body, nome: (document.activeElement.getAttribute('aria-label') || document.activeElement.textContent || '').trim().slice(0, 40), aviso: !!document.querySelector('[data-mfa-setup-notice]') }));
  reg(!depois.aviso && !depois.body && gatilho.test(depois.nome), `${rotulo}: "Fechar aviso" tira o aviso e devolve o foco a "${depois.nome}"`);
}

async function main() {
  const nav = process.env.E2E_BROWSER || 'chromium';
  const { browser, page } = await abrir();
  const registroAnuncios = {};
  try {
    // (5) título no HTML do servidor
    for (const [rota, titulo] of [['/painel/pessoas', 'Contatos'], ['/painel/pessoas/novo', 'Novo contato'], ['/painel/papeis', 'Papéis & Permissões'], ['/painel/papeis/novo', 'Novo papel']]) {
      const html = await (await fetch(`${BASE_URL}${rota}`)).text();
      const t = (/<title>([^<]*)<\/title>/.exec(html) || [])[1] || '';
      reg(t.replace('&amp;', '&') === `${titulo} — Nayara One`, `${rota}: título no primeiro HTML "${t}"`);
    }
    await page.addInitScript(() => {
      window.__titulos = []; window.__anuncios = []; window.__regiaoAntes = null;
      const anotar = () => { if (window.__titulos[window.__titulos.length - 1] !== document.title) window.__titulos.push(document.title); };
      new MutationObserver(() => {
        anotar();
        const r = document.querySelector('[data-async-announcer]');
        if (r && !r.__visto) { r.__visto = true; window.__regiaoAntes = r.textContent; new MutationObserver(() => { const t = r.textContent.trim(); if (t && window.__anuncios[window.__anuncios.length - 1] !== t) window.__anuncios.push(t); }).observe(r, { childList: true, characterData: true, subtree: true }); }
      }).observe(document, { childList: true, subtree: true, characterData: true });
    });
    await entrar(page);
    const simula = await interceptacaoFunciona(page);

    // (2) região viva em /painel/pessoas (carga lenta de propósito, quando dá para interceptar)
    if (simula) await interceptarApi(page, /\/api\/v1\/people(\?.*)?$/, async (r) => { await new Promise((s) => setTimeout(s, 1200)); await r.continue(); });
    await page.goto(`${BASE_URL}/painel/pessoas`, { waitUntil: 'networkidle' }); await page.waitForTimeout(800);
    if (simula) await page.unroute(/\/api\/v1\/people(\?.*)?$/);
    const t1 = await page.evaluate(() => ({ titulos: window.__titulos, anuncios: window.__anuncios.slice(), antes: window.__regiaoAntes }));
    reg(t1.titulos.every((t) => !/^Painel/.test(t)), `/painel/pessoas: títulos da aba durante a carga: ${JSON.stringify(t1.titulos)}`);
    reg(t1.antes === '', `a região viva aparece VAZIA (montada antes do texto): "${t1.antes}"`);
    reg(!simula || t1.anuncios.includes('Carregando contatos…'), `anúncio de carregamento observado: ${JSON.stringify(t1.anuncios)}`);
    reg(t1.anuncios.some((a) => /^(\d+ contatos? encontrados?|Nenhum contato encontrado)$/.test(a)), 'anúncio do resultado ("N contatos encontrados") observado');
    const regiao = page.locator('[data-async-announcer]');
    const snap = await regiao.ariaSnapshot();
    const attrs = await regiao.evaluate((r) => ({ role: r.getAttribute('role'), live: r.getAttribute('aria-live'), atomic: r.getAttribute('aria-atomic'), n: document.querySelectorAll('[aria-live],[role=status]').length }));
    reg(attrs.role === 'status' && attrs.live === 'polite' && attrs.atomic === 'true', `região: role=${attrs.role} aria-live=${attrs.live} aria-atomic=${attrs.atomic}; ariaSnapshot: ${snap.replace(/\n/g, ' ')}`);
    await page.getByRole('searchbox').first().fill('zzzz-ninguem-qa'); await page.waitForTimeout(900);
    const t2 = await page.evaluate(() => window.__anuncios.slice());
    reg(t2[t2.length - 1] === 'Nenhum contato encontrado', `busca sem resultado anuncia: "${t2[t2.length - 1]}"`);
    await page.getByRole('searchbox').first().fill(''); await page.waitForTimeout(900);
    const t3 = await page.evaluate(() => window.__anuncios.slice());
    reg(/contatos? encontrados?$/.test(t3[t3.length - 1]), `limpar a busca anuncia: "${t3[t3.length - 1]}"`);
    registroAnuncios.pessoas = { titulos: t1.titulos, anuncios: t3, ariaSnapshot: snap };

    // (1a) Criar papel, pedido real: admin sem MFA -> MFA_REQUIRED_NOT_ENABLED, nada criado
    await page.goto(`${BASE_URL}/painel/papeis/novo`, { waitUntil: 'networkidle' });
    await page.waitForSelector('#role-name');
    await page.focus('#role-name'); await page.keyboard.type('QA-M9 Papel MFA');
    const criar = page.getByRole('button', { name: 'Criar papel' });
    await criar.focus(); await page.keyboard.press('Enter');
    const qual = await Promise.race([page.waitForSelector('[data-mfa-setup-notice]').then(() => 'aviso'), page.waitForSelector('[role=dialog]').then(() => 'modal'), page.waitForURL(/\/painel\/papeis$/).then(() => 'criou')]);
    if (qual !== 'aviso') throw new Error(`esperado o aviso de MFA não configurado (admin sem MFA), veio: ${qual}. Desligue o MFA do admin (scripts/a11yMfaLocal.js desligar).`);
    await avisoCompleto(page, 'criar papel', /^Criar papel$/);

    if (simula) {
      // (1b) Excluir e (1c) editar: papel fictício e respostas simuladas (nenhum pedido de gravação chega à API)
      await interceptarApi(page, /\/api\/v1\/roles(\/[^/?]+)?(\?.*)?$/, async (r, cors) => {
        const req = r.request(); const url = new URL(req.url()); const id = url.pathname.split('/roles/')[1];
        if (req.method() === 'GET' && !id) { const res = await r.fetch(); const j = await res.json(); j.data = [...(j.data || []), { ...(j.data[0] || {}), id: FALSO, name: NOME, isSystem: false, description: 'Papel fictício do teste' }]; return r.fulfill({ status: 200, headers: { ...cors, 'content-type': 'application/json' }, body: JSON.stringify(j) }); }
        if (req.method() === 'GET' && id === FALSO) { const res = await page.request.fetch(req.url().replace(FALSO, ''), { headers: req.headers() }).catch(() => null); const lista = res ? await res.json() : { data: [] }; return r.fulfill({ status: 200, headers: { ...cors, 'content-type': 'application/json' }, body: JSON.stringify({ data: { ...(lista.data[0] || {}), id: FALSO, name: NOME, isSystem: false } }) }); }
        if (['DELETE', 'PATCH'].includes(req.method()) && id === FALSO) return r.fulfill({ status: 403, headers: { ...cors, 'content-type': 'application/json' }, body: JSON.stringify(MFA) });
        return r.continue();
      });
      await page.goto(`${BASE_URL}/painel/papeis`, { waitUntil: 'networkidle' });
      const linha = page.locator('tr', { hasText: NOME });
      await linha.getByRole('button', { name: 'Excluir', exact: true }).focus(); await page.keyboard.press('Enter');
      await page.waitForSelector('[role=dialog]');
      await page.getByRole('button', { name: 'Excluir papel' }).focus(); await page.keyboard.press('Enter');
      await page.waitForTimeout(400);
      reg((await page.locator('[role=dialog]').count()) === 0, 'excluir papel: a confirmação fecha quando a API exige MFA configurado');
      await avisoCompleto(page, 'excluir papel', /^Excluir$/);
      await page.goto(`${BASE_URL}/painel/papeis/${FALSO}`, { waitUntil: 'networkidle' });
      const salvar = page.getByRole('button', { name: 'Salvar alterações' });
      await salvar.waitFor(); await salvar.focus(); await page.keyboard.press('Enter');
      await avisoCompleto(page, 'editar papel', /^Salvar alterações$/);
      await page.unroute(/\/api\/v1\/roles(\/[^/?]+)?(\?.*)?$/);
    } else reg(true, `${nav}: interceptação indisponível; excluir/editar simulados rodam no Chromium e no Firefox`);
    await page.goto(`${BASE_URL}/painel/papeis`, { waitUntil: 'networkidle' });
    reg((await page.locator('tr', { hasText: 'QA-M9' }).count()) === 0, 'nenhum papel QA-M9 ficou gravado');
  } finally { await browser.close(); }
  const dir = path.join(__dirname, '..', 'docs', 'evidencias');
  fs.writeFileSync(path.join(dir, `a11y-mfa-aviso-anuncio-${nav}-${new Date().toISOString().slice(0, 10)}.json`), JSON.stringify({ navegador: nav, achados, ...registroAnuncios }, null, 2));
  if (estado.falhas) console.error('GOV_A11Y_AVISO falha no aviso de MFA / região viva / título.');
  process.exit(estado.falhas ? 1 : 0);
}
main().catch((e) => { console.error(e); process.exit(1); });
