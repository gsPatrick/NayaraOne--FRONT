// M9-D852 — ConfirmAction: níveis de confirmação, impacto com impedimento desabilitando o botão, corpo `confirmation` e o impactToken. Sem rede: o impacto vem pronto.
import { test } from "node:test";
import assert from "node:assert/strict";
import { html } from "./_loader/render.mjs";
import ConfirmActionView from "@/components/molecules/ConfirmAction/ConfirmActionView.js";
import { confirmState, buildConfirmation, impactSummary, impactLines, formatCents } from "@/lib/destructiveActions/state.js";

const impact = (over = {}) => ({
  actionKey: "legal.contract.terminate", level: 3, mfaRequired: false, impactToken: "tok.sig", counts: { openInstallments: 12, parties: 2 }, totalAmountCents: 1840000, blockers: [], items: [{ type: "BILLING_SCHEDULE", id: "b1", label: "Competência 2026-10" }],
  record: { id: "c1", code: "CT-2026-0042", label: "Contrato CT-2026-0042", codeLabel: "o número do contrato" }, confirm: { understood: true, typedCode: true, justification: true, justificationMin: 20 }, ...over,
});
const confirmButton = (markup) => /<button[^>]*data-confirm-button="true"[^>]*>/.exec(markup)[0];
const render = (props) => html(ConfirmActionView, { confirmLabel: "Rescindir", ...props });

test("m9d852 tela de confirmação mostra a lista de contagens, o valor e os itens afetados", () => {
  const out = render({ impact: impact() });
  assert.match(out, /Serão afetados: 12 parcelas em aberto; 2 partes do contrato; R\$\s18\.400,00\./);
  assert.match(out, /12 parcelas em aberto/);
  assert.match(out, /Valor envolvido/);
  assert.match(out, /Competência 2026-10/);
  assert.equal(formatCents(1840000).replace(/\s/g, " "), "R$ 18.400,00");
  assert.deepEqual(impactLines({ counts: { openInstallments: 0, orders: 3, byRecordType: { PROPERTY: 3 } } }), ["3 ordens de compra"]);
});

test("m9d852 ação nível 3 exige código digitado e justificativa: o botão fica desabilitado até preencher tudo", () => {
  const base = { impact: impact(), understood: true, typedCode: "", justification: "" };
  assert.match(confirmButton(render(base)), /disabled/);
  assert.match(render(base), /Digite o número do contrato para confirmar: CT-2026-0042/);
  assert.match(confirmButton(render({ ...base, typedCode: "CT-2026-0042", justification: "curta" })), /disabled/, "justificativa abaixo do mínimo");
  assert.match(confirmButton(render({ ...base, typedCode: "CT-2026-0041", justification: "Rescisão amigável por e-mail com o locatário." })), /disabled/, "código errado");
  assert.match(confirmButton(render({ ...base, understood: false, typedCode: "CT-2026-0042", justification: "Rescisão amigável por e-mail com o locatário." })), /disabled/, "sem Entendi o impacto");
  assert.doesNotMatch(confirmButton(render({ ...base, typedCode: "CT-2026-0042", justification: "Rescisão amigável por e-mail com o locatário." })), /disabled/);
  const state = confirmState(base);
  assert.equal(state.canConfirm, false);
  assert.equal(state.reasons.length, 2);
});

test("m9d852 impacto com impedimento desabilita o botão e mostra o motivo", () => {
  const blocked = impact({ blockers: [{ code: "RECONCILED_PAYMENT", message: "1 pagamento já conciliado impede o cancelamento." }] });
  const out = render({ impact: blocked, understood: true, typedCode: "CT-2026-0042", justification: "Rescisão amigável por e-mail com o locatário." });
  assert.match(confirmButton(out), /disabled/);
  assert.match(out, /Não é possível continuar: 1 pagamento já conciliado impede o cancelamento\./);
  assert.equal(confirmState({ impact: blocked, understood: true, typedCode: "CT-2026-0042", justification: "x".repeat(30) }).canConfirm, false);
});

test("m9d852 nível 2 pede só o Entendi o impacto e nível 1 só o resumo", () => {
  const two = impact({ level: 2, record: { ...impact().record }, confirm: { understood: true, typedCode: false, justification: false, justificationMin: 0 } });
  const out = render({ impact: two, understood: false });
  assert.match(out, /Entendi o impacto/);
  assert.doesNotMatch(out, /Digite o número do contrato|Justificativa/);
  assert.match(confirmButton(out), /disabled/);
  assert.doesNotMatch(confirmButton(render({ impact: two, understood: true })), /disabled/);
  const one = impact({ level: 1, confirm: { understood: false, typedCode: false, justification: false, justificationMin: 0 } });
  const outOne = render({ impact: one });
  assert.doesNotMatch(outOne, /Entendi o impacto/);
  assert.doesNotMatch(confirmButton(outOne), /disabled/);
});

test("m9d852 o corpo confirmation leva o impactToken e só os campos do nível", () => {
  const typed = { impact: impact(), understood: true, typedCode: " CT-2026-0042 ", justification: " Rescisão amigável por e-mail. " };
  assert.deepEqual(buildConfirmation(typed), { impactToken: "tok.sig", understood: true, typedCode: "CT-2026-0042", justification: "Rescisão amigável por e-mail." });
  assert.deepEqual(buildConfirmation({ impact: impact({ level: 2 }), understood: true }), { impactToken: "tok.sig", understood: true });
  assert.deepEqual(buildConfirmation({ impact: impact({ level: 1 }) }), { impactToken: "tok.sig" });
});

test("m9d852 sem impacto ainda, o botão está desabilitado; erro na simulação mostra o código de suporte", () => {
  assert.match(confirmButton(render({ impact: null, loading: true })), /disabled/);
  const out = render({ impact: null, loadError: { message: "Falhou.", traceId: "7d8f3c52-0000-4000-8000-000000000001" } });
  assert.match(out, /7d8f3c52-0000-4000-8000-000000000001/);
  assert.match(out, /Copiar código/);
});

test("m9d852 as telas de merge, lote e credencial de API usam o mesmo componente sobre o impacto do servidor", () => {
  const merge = impact({ actionKey: "data_quality.merge", counts: { feedbackCases: 2, contracts: 1 }, record: { code: "CAD-ABCD1234", codeLabel: "o código do cadastro que sai" } });
  assert.match(render({ impact: merge }), /Digite o código do cadastro que sai para confirmar: CAD-ABCD1234/);
  assert.match(impactSummary(merge), /2 feedbackCases; 1 contracts/);
  const bulk = impact({ actionKey: "data_quality.bulk", counts: { records: 5000, willChange: 4800 }, totalAmountCents: 0, record: { code: "EXECUTAR", codeLabel: "a palavra EXECUTAR" } });
  assert.match(render({ impact: bulk }), /5000 registros; 4800 registros que mudam/);
  const client = impact({ actionKey: "api_client.revoke", counts: { credentials: 1, scopes: 2, routesUsedLast30Days: 3 }, items: [{ type: "CONSUMER", id: "k", label: "Parceiro X" }, { type: "SCOPE", id: "properties:read", label: "properties:read" }], mfaRequired: true });
  const out = render({ impact: client });
  assert.match(out, /Parceiro X/);
  assert.match(out, /properties:read/);
  assert.match(out, /3 rotas usadas nos últimos 30 dias/);
  assert.match(out, /verificação em duas etapas/);
});
