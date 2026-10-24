'use strict';

/**
 * Agente de ponta a ponta do Marco 8 (Correspondente bancário).
 * Entra pela tela de login, percorre o fluxo como usuário e grava o que falhou
 * em e2e/achados/MARCO8_ACHADOS.md para correção.
 *
 * Uso: node e2e/marco8-agente-fluxo.spec.js
 *      npm run test:e2e:marco8
 *
 * Não testa homologação nem produção. Credencial só por variável de ambiente
 * (o padrão local é o usuário do seed). A senha não entra no markdown.
 */

const fs = require('fs');
const os = require('os');
const path = require('path');
const { chromium } = require('playwright');

const BASE_URL = process.env.E2E_BASE_URL || 'http://localhost:3000';
const EMAIL = process.env.E2E_EMAIL || 'admin@nayaraone.dev';
const PASSWORD = process.env.E2E_PASSWORD || 'DevAdmin#2026';
const OUT = process.env.E2E_ACHADOS || path.join(__dirname, 'achados', 'MARCO8_ACHADOS.md');

const passos = [];
const achados = [];
const respostasRuins = [];

function passo(nome, ok, detalhe) {
  passos.push({ nome, ok: Boolean(ok), detalhe: detalhe || '' });
  console.log(`[${ok ? 'OK ' : 'FALHOU'}] ${nome}${detalhe ? ' — ' + detalhe : ''}`);
}

function achar(titulo, evidencia) {
  achados.push({ titulo, evidencia: String(evidencia || '').slice(0, 800) });
  console.log(`[ACHADO] ${titulo}`);
}

function limpar(texto) {
  return String(texto || '')
    .replace(/Bearer\s+[A-Za-z0-9._\-]+/gi, 'Bearer [omitido]')
    .replace(/postgres:\/\/\S+/gi, 'postgres://[omitido]')
    .replace(PASSWORD, '[senha]');
}

async function texto(page) {
  return limpar(await page.locator('body').innerText().catch(() => ''));
}

async function vazarTecnico(page, onde) {
  const body = await texto(page);
  const marcas = [
    'Sequelize',
    'postgres://',
    'correspondent.financing_provider',
    'correspondent.sandbox_webhook_secret',
    'at Module.',
    'ECONNREFUSED',
    'stack',
  ].filter((m) => body.toLowerCase().includes(m.toLowerCase()));
  if (marcas.length) achar(`Texto técnico visível em ${onde}`, marcas.join(', '));
}

async function digitar(page, locator, valor) {
  await locator.click();
  await locator.fill('');
  await page.keyboard.type(valor, { delay: 20 });
  return locator.inputValue();
}

async function main() {
  const inicio = new Date();
  let browser;
  try {
    browser = await chromium.launch({ headless: true });
  } catch (err) {
    passo('abrir o navegador', false, limpar(err.message).slice(0, 300));
    achar('O agente não chegou a abrir o navegador', limpar(err.message).slice(0, 300));
    gravar(inicio, '', '');
    process.exitCode = 1;
    return;
  }
  const page = await browser.newPage({ viewport: { width: 1440, height: 1100 } });
  page.setDefaultTimeout(45000);
  const marca = `QA-M8-${inicio.getTime()}`;
  let pessoa = '';
  let casoUrl = '';

  page.on('dialog', async (dialog) => {
    const msg = dialog.message();
    if (dialog.type() === 'prompt') await dialog.accept(marca);
    else await dialog.accept();
    passos.push({ nome: `diálogo: ${dialog.type()}`, ok: true, detalhe: limpar(msg).slice(0, 180) });
  });

  page.on('response', async (res) => {
    const url = res.url();
    if (res.status() < 400) return;
    if (!url.includes('/financing-cases') && !url.includes('/correspondent') && !url.includes('/invoices') && !url.includes('/dimob') && !url.includes('/files')) return;
    let body = '';
    try { body = limpar(await res.text()).slice(0, 400); } catch { body = ''; }
    respostasRuins.push({ status: res.status(), url: url.replace(/https?:\/\/[^/]+/, ''), body });
  });

  try {
    await page.goto(`${BASE_URL}/entrar`, { waitUntil: 'domcontentloaded' });
    const equipe = page.getByText('Sou da equipe', { exact: false });
    if (await equipe.count()) await equipe.first().click();
    await page.waitForSelector('input[type=email]');
    await digitar(page, page.locator('input[type=email]'), EMAIL);
    await digitar(page, page.locator('input[type=password]'), PASSWORD);
    await page.click('button[type=submit]');
    await page.waitForURL((url) => !url.pathname.includes('/entrar'), { timeout: 60000 });
    passo('login pela tela', true, 'entrou no painel');

    await page.goto(`${BASE_URL}/painel`, { waitUntil: 'domcontentloaded' });
    const menu = page.locator('a[href="/painel/correspondente"]').first();
    await menu.waitFor({ state: 'visible' });
    await menu.click();
    await page.waitForURL(/\/painel\/correspondente\/?$/);
    await page.getByText('Casos de financiamento').waitFor({ state: 'visible' });
    passo('menu Financiamentos', true, page.url());
    await vazarTecnico(page, 'lista de financiamentos');

    const alertaNay = await page.getByText('sem atividade', { exact: false }).count();
    passo('aviso NAY de casos parados', true, alertaNay ? 'alerta visível' : 'nenhum caso parado, ou o aviso não carregou');

    await page.getByRole('button', { name: /Novo caso de financiamento/ }).click();
    await page.getByText('Proponente principal').waitFor({ state: 'visible' });
    const campoPessoa = page.locator('#fc-principal');
    await campoPessoa.click();
    await page.keyboard.type('a', { delay: 30 });
    const opcao = page.locator('#fc-principal').locator('xpath=../..//ul//button').first();
    const achouPessoa = await opcao.waitFor({ state: 'visible', timeout: 15000 }).then(() => true).catch(() => false);
    if (!achouPessoa) {
      passo('escolher proponente', false, 'nenhum contato apareceu na busca');
      achar('Não dá para abrir um caso', 'A busca do proponente não devolveu contato. O fluxo parou antes de criar o caso.');
    } else {
      pessoa = limpar((await opcao.innerText()).split('\n')[0]);
      await opcao.click();
      const vinculado = await page.getByText('Vinculado ao cadastro de Contatos').count();
      passo('escolher proponente', vinculado > 0, pessoa);
      const criar = page.getByRole('button', { name: 'Criar' });
      const habilitado = await criar.isEnabled();
      if (!habilitado) {
        passo('criar caso', false, 'botão Criar ficou desabilitado');
        achar('Botão Criar não habilita depois de escolher o contato', pessoa);
      } else {
        await criar.click();
        await page.getByRole('button', { name: 'Ver' }).first().waitFor({ state: 'visible', timeout: 30000 });
        const linha = page.locator('tr', { hasText: pessoa.split(' ')[0] }).first();
        const ver = (await linha.count()) ? linha.getByRole('button', { name: 'Ver' }) : page.getByRole('button', { name: 'Ver' }).first();
        await ver.click();
        await page.waitForURL(/\/painel\/correspondente\/[0-9a-f-]{36}/i);
        casoUrl = page.url();
        passo('criar caso e abrir a ficha', true, `${pessoa} · ${casoUrl.split('/').pop()}`);
        await page.getByText('Caso de financiamento').first().waitFor({ state: 'visible' });
        await vazarTecnico(page, 'ficha do caso');

        await page.locator('#new-requirement-type').selectOption('RG_CPF');
        await page.getByRole('button', { name: 'Adicionar ao checklist' }).click();
        const item = page.getByText('RG/CPF', { exact: true }).first();
        const itemOk = await item.waitFor({ state: 'visible', timeout: 20000 }).then(() => true).catch(() => false);
        passo('checklist RG/CPF', itemOk);
        if (!itemOk) achar('Checklist não mostrou o RG/CPF', await texto(page).then((t) => t.slice(0, 300)));

        const validar = await page.getByRole('button', { name: /Validar/i }).count();
        const consentimento = await page.getByText(/consentimento|autorização do cliente/i).count();
        if (validar === 0) {
          achar('Não existe ação de validar o documento na ficha', 'O caderno exige validação humana antes do envio. Na ficha só há envio de arquivo e o botão de enviar ao provider.');
        }
        passo('botão de validação humana', validar > 0, validar ? 'presente' : 'ausente');
        passo('consentimento do cliente na tela', consentimento > 0, consentimento ? 'presente' : 'ausente');

        const pdf = path.join(os.tmpdir(), `${marca}.pdf`);
        fs.writeFileSync(pdf, '%PDF-1.4\n1 0 obj<<>>endobj\ntrailer<<>>\n%%EOF\n');
        const fileInput = page.locator('input[type=file]').first();
        if (await fileInput.count()) {
          await fileInput.setInputFiles(pdf);
          const enviado = await page.getByText(/Arquivo atual:|Não foi possível enviar o documento/).first()
            .waitFor({ state: 'visible', timeout: 30000 }).then(() => true).catch(() => false);
          const corpo = await texto(page);
          const uploadOk = enviado && /Arquivo atual:/.test(corpo);
          passo('enviar arquivo do checklist', uploadOk, uploadOk ? 'arquivo vigente visível' : 'sem confirmação do arquivo');
          if (!uploadOk) achar('Upload do documento do caso não confirmou o arquivo', corpo.match(/Não foi possível[^\n]+/)?.[0] || 'sem mensagem');
        } else {
          passo('enviar arquivo do checklist', false, 'input de arquivo ausente');
          achar('Checklist sem campo de arquivo', '');
        }

        const valorDigitado = await digitar(page, page.locator('#sim-amount'), '1.546,73');
        passo('digitar valor com milhar 1.546,73', true, `campo ficou: ${valorDigitado}`);
        if (valorDigitado.replace(/\D/g, '') !== '154673') {
          achar('Valor com separador de milhar não permaneceu como digitado', `digitado 1.546,73; campo ficou ${valorDigitado}`);
        }
        await page.locator('#sim-term').selectOption('360');
        await page.getByRole('button', { name: 'Nova simulação' }).click();
        await page.waitForTimeout(1500);
        const erroSim = await page.locator('text=Não foi possível criar a simulação').count();
        const avisoSim = await page.getByText(/Informe o valor financiado/).count();
        const temLinha = await page.getByText('360 meses').count();
        passo('primeira simulação', temLinha > 0 && erroSim === 0 && avisoSim === 0, `campo=${valorDigitado}`);
        if (temLinha === 0) achar('Simulação com 1.546,73 não gerou linha', (await texto(page)).match(/Informe o valor[^\n]+|Não foi possível[^\n]+/)?.[0] || valorDigitado);

        await digitar(page, page.locator('#sim-amount'), '150000,50');
        const lido = await page.locator('#sim-amount').inputValue();
        passo('digitar 150000,50', lido.includes(','), `campo ficou: ${lido}`);
        await page.getByRole('button', { name: 'Nova simulação' }).click();
        await page.waitForTimeout(2000);
        const menor = await page.getByText('Menor parcela').count();
        passo('comparar duas simulações', menor > 0, menor ? 'selo Menor parcela visível' : 'selo ausente');
        if (menor === 0) achar('Duas simulações não mostraram a menor parcela', '');

        const negativo = await digitar(page, page.locator('#sim-amount'), '-10');
        const avisoNeg = await page.getByText('O valor deve ser maior que zero').count();
        passo('recusar valor negativo na simulação', avisoNeg > 0 && !negativo.includes('-'), `campo=${negativo || '(vazio)'}`);
        if (avisoNeg === 0) achar('Valor negativo na simulação não foi recusado na tela', `campo ficou ${negativo}`);

        const antesEnvio = await page.locator('table').nth(1).locator('tbody tr').count().catch(() => 0);
        await page.getByRole('button', { name: 'Enviar ao provider' }).click();
        await page.waitForTimeout(2500);
        const corpoEnvio = await texto(page);
        const msgEnvio = corpoEnvio.match(/Não foi possível enviar[^\n]+|Envio exige[^\n]+|checklist[^\n]+|consentimento[^\n]+/i);
        const enviou = /Enviado|Identificador no provider/.test(corpoEnvio) && !msgEnvio;
        passo('enviar ao provider', true, msgEnvio ? msgEnvio[0] : (enviou ? 'envio registrado' : 'sem mensagem clara'));
        if (msgEnvio) achar('O usuário não consegue concluir o envio pela tela', msgEnvio[0]);

        await page.getByRole('button', { name: 'Enviar ao provider' }).click().catch(() => {});
        await page.waitForTimeout(2000);
        const depoisEnvio = await page.locator('text=Enviado').count();
        passo('reenviar o mesmo caso', true, `menções a Enviado: ${depoisEnvio}; linhas antes: ${antesEnvio}`);

        await page.getByRole('button', { name: 'Solicitar avaliação' }).click();
        await page.waitForTimeout(2000);
        const avaliacao = await page.getByText(/Solicitada|Concluída|Não foi possível solicitar a avaliação/).first()
          .waitFor({ state: 'visible', timeout: 20000 }).then(() => true).catch(() => false);
        const corpoAv = await texto(page);
        const avOk = avaliacao && /Solicitada|Concluída/.test(corpoAv);
        passo('solicitar avaliação', avOk, avOk ? 'linha de avaliação visível' : (corpoAv.match(/Não foi possível solicitar[^\n]+/)?.[0] || 'sem linha'));
        if (!avOk) achar('Avaliação do imóvel não apareceu', corpoAv.match(/Não foi possível solicitar[^\n]+/)?.[0] || '');

        await digitar(page, page.locator('#commission-base-amount'), '150000,50');
        await page.getByRole('button', { name: 'Registrar direito à comissão' }).click();
        await page.waitForTimeout(2000);
        const prevista = await page.getByText('Prevista').count();
        passo('registrar comissão', prevista > 0, prevista ? 'status Prevista' : 'sem linha');
        if (prevista === 0) achar('Comissão não ficou prevista', (await texto(page)).match(/Não foi possível registrar[^\n]+|Informe um valor[^\n]+/)?.[0] || '');

        if (prevista > 0) {
          await page.getByRole('button', { name: 'Confirmar' }).first().click();
          await page.waitForTimeout(2500);
          const aReceber = await page.getByText('A receber').count();
          passo('confirmar comissão até a receber', aReceber > 0, aReceber ? 'lançamento previsto na tela' : 'não mudou para A receber');
          if (aReceber === 0) achar('Confirmar a comissão não chegou em A receber', (await texto(page)).match(/Não foi possível confirmar[^\n]+/)?.[0] || '');
        }

        const receber = await page.getByRole('button', { name: /^Receber$/ }).count();
        passo('registrar recebimento da comissão', receber > 0, receber ? 'botão presente' : 'ausente');
        if (receber === 0) achar('Não existe botão para marcar a comissão como recebida', 'A ficha tem Confirmar, Estornar e Emitir NFS-e. Não tem Receber.');

        const emitir = page.getByRole('button', { name: 'Emitir NFS-e' });
        if (await emitir.count()) {
          await emitir.first().click();
          await page.waitForTimeout(2500);
          const corpoNf = await texto(page);
          const nfOk = /NFS-e solicitada/.test(corpoNf);
          passo('solicitar NFS-e da comissão', nfOk, nfOk ? 'aviso de solicitação' : (corpoNf.match(/Não foi possível solicitar a NFS-e[^\n]+/)?.[0] || 'sem aviso'));
          if (!nfOk) achar('NFS-e da comissão não foi solicitada', corpoNf.match(/Não foi possível solicitar a NFS-e[^\n]+/)?.[0] || 'o alerta não apareceu');
        } else {
          passo('solicitar NFS-e da comissão', false, 'botão ausente no status atual');
        }

        await page.goto(`${BASE_URL}/painel/correspondente/fiscal`, { waitUntil: 'domcontentloaded' });
        await page.getByText('Notas fiscais de serviço').waitFor({ state: 'visible', timeout: 30000 });
        passo('abrir Fiscal pelo endereço do menu', true);
        await vazarTecnico(page, 'fiscal');
        await page.getByRole('button', { name: 'Gerar batch do ano' }).click();
        await page.locator('#dimob-year').waitFor({ state: 'visible' });
        const ano = String(new Date().getFullYear());
        await digitar(page, page.locator('#dimob-year'), ano);
        await page.getByRole('button', { name: 'Gerar' }).click();
        const dimobOk = await page.getByText(/Batch DIMOB gerado|Não foi possível gerar o batch DIMOB/).first()
          .waitFor({ state: 'visible', timeout: 30000 }).then(async () => /Batch DIMOB gerado/.test(await texto(page))).catch(() => false);
        passo('gerar batch DIMOB', dimobOk, dimobOk ? `ano ${ano}` : 'sem confirmação');
        if (!dimobOk) achar('Batch DIMOB não foi gerado pela tela', (await texto(page)).match(/Não foi possível gerar[^\n]+/)?.[0] || '');

        if (casoUrl) {
          await page.goto(casoUrl, { waitUntil: 'domcontentloaded' });
          await page.getByText('Caso de financiamento').first().waitFor({ state: 'visible' });
          const statusFicha = limpar((await page.locator('body').innerText()).split('\n').slice(0, 40).join(' | ')).slice(0, 400);
          passo('reler a ficha no fim', true, statusFicha);
        }
      }
    }
  } catch (err) {
    passo('interrupção', false, limpar(err.message).slice(0, 400));
    achar('O fluxo parou antes de terminar', limpar(err.message).slice(0, 400));
  } finally {
    await browser.close().catch(() => {});
    gravar(inicio, pessoa, casoUrl);
  }

  const falhas = passos.filter((p) => !p.ok);
  process.exitCode = falhas.length || achados.length ? 1 : 0;
}

function gravar(inicio, pessoa, casoUrl) {
  fs.mkdirSync(path.dirname(OUT), { recursive: true });
  const quando = inicio.toLocaleString('pt-BR', { timeZone: 'America/Sao_Paulo' });
  const linhas = [
    '# Achados do agente — fluxo do Marco 8',
    '',
    `Execução local em ${quando}. Login pela tela, contra ${BASE_URL}. Senha não registrada aqui.`,
    pessoa ? `Proponente usado: ${pessoa}.` : 'Nenhum proponente chegou a ser escolhido.',
    casoUrl ? `Ficha: ${casoUrl}` : 'Nenhuma ficha foi aberta.',
    '',
    'Isto é o que o agente viu na tela. Não é aceite do marco.',
    '',
    `## Achados (${achados.length})`,
    '',
  ];
  if (!achados.length) linhas.push('Nenhum achado nesta execução.', '');
  achados.forEach((a, i) => {
    linhas.push(`### ${i + 1}. ${a.titulo}`, '', a.evidencia || 'Sem texto adicional.', '');
  });
  linhas.push('## Passos', '');
  passos.forEach((p) => {
    linhas.push(`- ${p.ok ? 'ok' : 'falhou'} — ${p.nome}${p.detalhe ? `: ${p.detalhe}` : ''}`);
  });
  linhas.push('', '## Respostas HTTP 4xx/5xx do fluxo', '');
  if (!respostasRuins.length) linhas.push('Nenhuma.', '');
  respostasRuins.slice(0, 30).forEach((r) => {
    linhas.push(`- ${r.status} ${r.url}`, '', '```', r.body || '(vazio)', '```', '');
  });
  fs.writeFileSync(OUT, linhas.join('\n'));
  console.log(`\nMarkdown: ${OUT}`);
  console.log(`Achados: ${achados.length}. Passos com falha: ${passos.filter((p) => !p.ok).length}.`);
}

main();
