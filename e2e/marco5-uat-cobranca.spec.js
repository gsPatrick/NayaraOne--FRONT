// Marco 5 — UAT da cobrança de locação + utilidades (DoD do livro: "calculators determinísticos, adapters de índice, Finance
// events, closeout, idempotência, UAT"), Playwright clicando na UI, pilha descartável. Roteiro com passos, dados, resultado
// esperado e campo de aceite: Maturacao/fechamento-m3-m6/marco-5-uat-roteiro.md (passos UAT-C01 a UAT-C14). O aceite final é
// da cliente; esta execução é a parte automatizada do roteiro.
//
// Pré-condição: o contrato de locação assinado com chaves entregues pelo e2e/marco5-fechamento.spec.js na MESMA pilha
// (o UAT segue o contrato ponta a ponta: assinatura -> ativação -> cobrança -> encerramento).
//
// Uso: E2E_PASSWORD=<senha dos usuários fictícios> E2E_FRONT_URL=... E2E_API_URL=... node e2e/marco5-uat-cobranca.spec.js
"use strict";

const path = require("path");
const fs = require("fs");
const { chromium } = require("playwright");
const A = require("./_m5-apoio");

const OUT = path.join(__dirname, "prints-m5-uat");
const iso = (d) => d.toISOString().slice(0, 10);
const today = new Date();
const plusDays = (n) => iso(new Date(today.getTime() + n * 86400000));
const competencia = (offsetMeses) => {
  const d = new Date(today.getFullYear(), today.getMonth() + offsetMeses, 1);
  return `${String(d.getMonth() + 1).padStart(2, "0")}/${d.getFullYear()}`;
};
const results = [];
function record(id, label, ok, detail) {
  results.push({ id, label, ok: Boolean(ok), detail: detail || "" });
  console.log(`[${ok ? "OK " : "FAIL"}] ${id} ${label}${detail ? ` — ${detail}` : ""}`);
}
const dlg = (page) => page.locator('[role="dialog"]').last();
const shot = (page, name) => page.screenshot({ path: path.join(OUT, `${name}.png`), fullPage: true });
const alertText = async (page, filtro) => {
  const a = filtro ? page.locator('[role="alert"]').filter({ hasText: filtro }).first() : page.locator('[role="alert"]').last();
  return (await A.visible(a, 20000)) ? (await a.innerText()).replace(/\s+/g, " ") : "";
};
// Espera o texto da linha mudar até casar com a expressão (a tabela recarrega depois da ação).
async function esperarLinha(locator, re, ms = 30000) {
  const fim = Date.now() + ms;
  let t = "";
  while (Date.now() < fim) {
    t = (await locator.innerText().catch(() => "")).replace(/\s+/g, " ");
    if (re.test(t)) return { ok: true, t };
    await new Promise((r) => setTimeout(r, 500));
  }
  return { ok: false, t };
}

async function abrirAba(page, nome) {
  await page.getByRole("tab", { name: nome }).click();
}

async function irParaLocacao(page) {
  await page.goto(`${A.FRONT}/painel/contratos/locacao`, { waitUntil: "domcontentloaded" });
  await page.getByRole("tab", { name: "Cobranças" }).waitFor();
}

async function contratoDoFechamento(token) {
  const lista = await A.api(token, "GET", "/legal/contracts");
  const itens = Array.isArray(lista) ? lista : lista.items || [];
  const assinados = itens.filter((c) => c.contractType === "LEASE_RESIDENTIAL" && ["SIGNED", "ACTIVE"].includes(c.status));
  assinados.sort((a, b) => String(b.createdAt).localeCompare(String(a.createdAt)));
  if (!assinados.length) throw new Error("pré-condição: rode antes o e2e/marco5-fechamento.spec.js na mesma pilha (contrato assinado com chaves entregues)");
  return assinados[0];
}

async function ativar(page, contrato) {
  await page.goto(`${A.FRONT}/painel/contratos/lista/${contrato.id}`, { waitUntil: "domcontentloaded" });
  const botao = page.getByRole("button", { name: "Ativar contrato" });
  if (contrato.status === "SIGNED" && (await A.visible(botao))) {
    await botao.first().click();
    await dlg(page).getByRole("button", { name: "Ativar contrato", exact: true }).click();
  }
  const ativo = await A.visible(page.getByText('Contrato agora está em "Em vigor".').first(), 30000) || await A.visible(page.getByText("Em vigor", { exact: true }).first(), 5000);
  record("UAT-C01", "contrato assinado ativado pela tela (entra em vigor)", ativo);
  await shot(page, "c01-contrato-ativo");
}

async function cobranca(page, contrato) {
  await irParaLocacao(page);
  const comp = competencia(1);
  const gerar = async () => {
    await page.getByRole("button", { name: "Gerar cobrança" }).click();
    const d = dlg(page);
    await d.locator("select").nth(0).selectOption(contrato.id);
    await d.locator("input").nth(0).fill(comp);
    await d.locator('input[type="date"]').fill(plusDays(35));
    await d.locator("select").nth(1).selectOption("RENT");
    await d.locator("input").last().fill("2.500,00");
    await d.getByRole("button", { name: "Gerar", exact: true }).click();
  };
  await gerar();
  const linha = page.locator("tr", { hasText: comp }).first();
  const okLinha = (await A.visible(linha)) && /R\$\s?2\.500,00[\s\S]*R\$\s?2\.500,00/.test(await linha.innerText()) && /Em aberto/.test(await linha.innerText());
  record("UAT-C02", `cobrança da competência ${comp} gerada: total e saldo R$ 2.500,00, Em aberto`, okLinha, okLinha ? "" : (await linha.innerText().catch(() => "")).replace(/\s+/g, " "));
  await shot(page, "c02-cobranca-gerada");

  await gerar();
  const erro = await alertText(page, /Já existe|compet/i);
  await dlg(page).getByRole("button", { name: "Cancelar" }).click().catch(() => {});
  const linhas = await page.locator("tr", { hasText: comp }).count();
  record("UAT-C03", "a mesma competência do mesmo contrato é recusada (competência UNIQUE contrato+período) e não duplica", Boolean(erro) && linhas === 1, `${erro.slice(0, 140)}; ${linhas} linha(s)`);

  const pagar = async (valor) => {
    await page.locator("tr", { hasText: comp }).first().getByRole("button", { name: "Registrar pagamento" }).click();
    await dlg(page).locator("input").last().fill(valor);
    await dlg(page).getByRole("button", { name: "Registrar", exact: true }).click();
    await dlg(page).waitFor({ state: "detached", timeout: 30000 }).catch(() => {});
  };
  await pagar("1.000,00");
  const parcial = await esperarLinha(page.locator("tr", { hasText: comp }).first(), /R\$\s?1\.500,00.*Parcial/);
  record("UAT-C04", "pagamento parcial de R$ 1.000,00 recompõe o saldo: R$ 1.500,00 e status Parcial", parcial.ok, parcial.t);
  await shot(page, "c04-pagamento-parcial");
  await pagar("1.500,00");
  const quitada = await esperarLinha(page.locator("tr", { hasText: comp }).first(), /R\$\s?0,00.*Quitado/);
  record("UAT-C05", "o restante quita a competência: saldo R$ 0,00 e Quitado", quitada.ok, quitada.t);
}

async function reajuste(page, contrato) {
  await abrirAba(page, "Reajustes");
  await page.getByRole("button", { name: "Solicitar reajuste" }).click();
  const d = dlg(page);
  await d.locator("select").nth(0).selectOption(contrato.id);
  await d.locator("input").nth(0).fill(competencia(2));
  await d.locator("select").nth(1).selectOption("IGPM");
  await d.locator("input").last().fill("2.500,00");
  await d.getByRole("button", { name: "Solicitar", exact: true }).click();
  const linha = page.locator("tr", { hasText: competencia(2) }).first();
  const texto = (await A.visible(linha)) ? await linha.innerText() : "";
  record("UAT-C06", "reajuste IGPM sem fonte de índice fica Aguardando índice (PENDING_SOURCE), sem percentual inventado", /Aguardando índice/.test(texto), texto.replace(/\s+/g, " "));
  await shot(page, "c06-reajuste-sem-indice");
}

async function utilidades(page, contrato) {
  await abrirAba(page, "Obrigações (água/luz)");
  await page.getByRole("button", { name: "Nova obrigação" }).click();
  const d = dlg(page);
  await d.locator("#f-utility-contract").selectOption(contrato.id);
  await d.locator("#f-utility-type").selectOption("WATER");
  await d.locator("#f-utility-responsible").selectOption("TENANT");
  await d.locator("#f-utility-provider").fill("Companhia de Água Fictícia UAT");
  await d.getByRole("button", { name: "Criar", exact: true }).click();
  await dlg(page).waitFor({ state: "detached", timeout: 30000 }).catch(() => {});
  const linha = page.locator("tr", { hasText: "Água" }).first();
  record("UAT-C07", "obrigação de água com responsável (Locatário) e fornecedor cadastrada", (await A.visible(linha)) && /Locatário/.test(await linha.innerText()));

  await linha.getByRole("button", { name: "Registrar pagamento" }).click();
  // Pagamento de UM vencimento, com comprovante (livro §12; correção M5VP): quem pagou, vencimento, valor e comprovante.
  const opcoes = await dlg(page).locator("#utility-pay-by option").allInnerTexts();
  const temImobiliaria = opcoes.some((o) => /imobili|empresa/i.test(o));
  record("UAT-C08", "a tela permite registrar a conta paga pela IMOBILIÁRIA (livro: conta paga pela imobiliária gera reembolso)", temImobiliaria, `opções de "Quem pagou": ${opcoes.join(", ")}`);
  await dlg(page).locator("#utility-pay-by").selectOption(temImobiliaria ? { label: opcoes.find((o) => /imobili|empresa/i.test(o)) } : "LANDLORD");
  if (await A.visible(dlg(page).locator("#utility-pay-due"), 3000)) await dlg(page).locator("#utility-pay-due").fill(plusDays(0));
  await dlg(page).locator("#utility-pay-amount").fill("180,00");
  await dlg(page).locator("#utility-pay-proof").setInputFiles(A.testFiles().pdf);
  await A.visible(dlg(page).getByText("documento-ficticio.pdf").first(), 30000);
  await dlg(page).getByRole("button", { name: "Registrar", exact: true }).click();
  await dlg(page).waitFor({ state: "detached", timeout: 30000 }).catch(() => {});
  await page.goto(`${A.FRONT}/painel/financeiro/lancamentos`, { waitUntil: "domcontentloaded" });
  // Texto com concordância (correção M5VP): "pago pela imobiliária, a cobrar do locatário" — nunca "pago por o ...".
  const reembolso = page.locator("tr", { hasText: /Reembolso de água pago pela imobiliária, a cobrar do locatário/i }).filter({ hasText: /R\$\s?180,00/ }).first();
  const achou = await A.visible(reembolso, 30000);
  record("UAT-C09", "pagamento pela imobiliária gera o recebível de reembolso no Financeiro (R$ 180,00 a cobrar do locatário, texto com concordância)", achou, achou ? (await reembolso.innerText()).slice(0, 140) : "lançamento de reembolso não apareceu em Financeiro > Lançamentos");
  await shot(page, "c09-utilidade-reembolso");
}

async function garantidoEAntecipacao(page, contrato) {
  await irParaLocacao(page);
  await abrirAba(page, "Aluguel garantido");
  await page.getByRole("button", { name: "Matricular contrato" }).click();
  await dlg(page).locator("select").selectOption(contrato.id);
  await dlg(page).locator('input[type="date"]').fill(plusDays(0));
  await dlg(page).getByRole("button", { name: "Matricular", exact: true }).click();
  await dlg(page).waitFor({ state: "detached", timeout: 30000 }).catch(() => {});
  const linhaG = page.locator("tr", { hasText: "Ativo" }).filter({ has: page.getByRole("button") }).first();
  record("UAT-C10", "contrato matriculado no aluguel garantido (obrigação da empresa ao proprietário)", await A.visible(linhaG));
  await linhaG.getByRole("button").first().click();
  await dlg(page).locator("input").last().fill("2.500,00");
  await dlg(page).getByRole("button", { name: "Registrar", exact: true }).click();
  const erroG = await alertText(page);
  record("UAT-C11", "repasse do aluguel garantido ao proprietário registrado (crédito a recuperar do locatário)", !erroG || /sucesso/i.test(erroG), erroG.slice(0, 160));
  await dlg(page).getByRole("button", { name: "Cancelar" }).click().catch(() => {});

  await abrirAba(page, "Antecipação");
  await page.getByRole("button", { name: "Solicitar antecipação" }).click();
  await dlg(page).locator("select").selectOption(contrato.id);
  const inputs = dlg(page).locator("input");
  await inputs.nth(0).fill("3");
  await inputs.nth(1).fill("7.000,00");
  await inputs.nth(2).fill("350,00");
  await dlg(page).getByRole("button", { name: "Solicitar", exact: true }).click();
  await dlg(page).waitFor({ state: "detached", timeout: 30000 }).catch(() => {});
  for (const acao of ["Propor", "Aceitar", "Pagar"]) {
    const b = page.getByRole("button", { name: acao, exact: true }).first();
    if (await A.visible(b, 15000)) { await b.click(); await page.waitForTimeout(1200); }
  }
  const pago = await A.visible(page.locator("tr", { hasText: "Pago" }).first(), 20000);
  const linhaA = (await page.locator("tr", { hasText: "R$ 7.000,00" }).first().innerText().catch(() => "")).replace(/\s+/g, " ");
  record("UAT-C12", "antecipação é produto separado: elegível -> proposta -> aceita -> paga (principal R$ 7.000,00 e custo R$ 350,00 separados)", pago, pago ? "" : `linha na tela: ${linhaA}`);
  await shot(page, "c12-antecipacao-paga");
}

async function encerramento(page, contrato) {
  await abrirAba(page, "Encerramento");
  await page.locator("select").last().selectOption(contrato.id);
  await page.getByRole("button", { name: "Encerrar contrato" }).click();
  const bloqueio = page.getByText(/Bloqueado por \d+ pendência/);
  const bloqueado = await A.visible(bloqueio, 30000);
  const motivos = bloqueado ? (await bloqueio.innerText()).replace(/\s+/g, " ") : await alertText(page);
  record("UAT-C13", "encerramento com pendência crítica é bloqueado e a tela lista as pendências", bloqueado, motivos.slice(0, 220));
  await shot(page, "c13-encerramento-bloqueado");
  const sucesso = await A.visible(page.getByText("Contrato encerrado com sucesso."), 2000);
  record("UAT-C14", "o contrato NÃO foi encerrado com a pendência aberta", !sucesso);
}

(async () => {
  A.guard();
  fs.mkdirSync(OUT, { recursive: true });
  const { token } = await A.apiLogin();
  const browser = await chromium.launch();
  const page = await browser.newPage({ viewport: { width: 1440, height: 1000 } });
  page.setDefaultTimeout(45000);
  let contrato = null;
  try {
    contrato = await contratoDoFechamento(token);
    await A.uiLogin(page);
    record("UAT-C00", "login na tela (usuário fictício gestor da empresa A, sem MFA)", true);
    await ativar(page, contrato);
    await cobranca(page, contrato);
    await reajuste(page, contrato);
    await utilidades(page, contrato);
    await garantidoEAntecipacao(page, contrato);
    await encerramento(page, contrato);
  } catch (err) {
    record("UAT-C99", "execução interrompida", false, err.message.split("\n")[0]);
    await shot(page, "c99-erro").catch(() => {});
  } finally {
    await browser.close();
  }
  const falhas = results.filter((r) => !r.ok);
  fs.writeFileSync(path.join(OUT, "resultado.json"), JSON.stringify({ when: new Date().toISOString(), contrato: contrato && contrato.id, results }, null, 2));
  console.log(`\n=== ${results.length - falhas.length}/${results.length} passos OK`);
  process.exit(falhas.length ? 1 : 0);
})();
