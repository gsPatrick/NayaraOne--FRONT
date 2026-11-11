// UAT automatizado do Marco 5 (cobrança + utilidades), três achados da tela de Locação corrigidos (agente M5VP):
//  UAT-C08 "Quem pagou" oferece a imobiliária; UAT-C12 a antecipação segue a máquina de estados da API (nasce em
//  ELIGIBILITY_PENDING); texto do pagamento com concordância ("pago pelo locador", "pago pela imobiliária").
import { test } from "node:test";
import assert from "node:assert/strict";
import fs from "node:fs";
import { PAID_BY_LABELS, paidByPhrase } from "@/lib/legal/obligationCycles.js";
import { RENT_ADVANCE_STATUS_LABEL, rentAdvanceAction, rentAdvanceStatusLabel } from "@/lib/legal/rentAdvanceStatus.js";

const read = (p) => fs.readFileSync(new URL(`../${p}`, import.meta.url), "utf8");
const CRU = /\b[A-Z]{2,}_[A-Z_]+\b/;

test("UAT-C08: 'Quem pagou' oferece Locatário, Locador e Imobiliária (COMPANY) e o modal de pagamento usa essa lista", () => {
  assert.deepEqual(Object.keys(PAID_BY_LABELS).sort(), ["COMPANY", "LANDLORD", "TENANT"]);
  assert.equal(PAID_BY_LABELS.COMPANY, "Imobiliária");
  const modal = read("app/painel/contratos/locacao/UtilityPaymentModal.js");
  assert.match(modal, /id="utility-pay-by"[\s\S]{0,200}PAID_BY_LABELS/, "o select de quem pagou é montado com PAID_BY_LABELS");
});

test("UAT-C12: a antecipação segue os estados da API — rótulo legível em todos e a ação de cada um, a partir de ELIGIBILITY_PENDING", () => {
  const estadosDaApi = ["ELIGIBILITY_PENDING", "PROPOSED", "ACCEPTED", "PAID", "RECOVERING", "RECOVERED", "REJECTED"];
  for (const s of estadosDaApi) {
    assert.ok(RENT_ADVANCE_STATUS_LABEL[s], `rótulo de ${s}`);
    assert.doesNotMatch(rentAdvanceStatusLabel(s), CRU);
  }
  assert.equal(rentAdvanceStatusLabel("ELIGIBILITY_PENDING"), "Elegibilidade em análise");
  assert.equal(rentAdvanceStatusLabel("XYZ_NOVO"), "Situação desconhecida", "código desconhecido nunca aparece cru");
  // O fluxo anda pela tela: elegibilidade -> proposta -> aceite -> pagamento -> recuperação.
  assert.deepEqual(["ELIGIBILITY_PENDING", "PROPOSED", "ACCEPTED", "PAID", "RECOVERING"].map((s) => rentAdvanceAction(s).kind), ["propose", "accept", "pay", "recover", "recover"]);
  assert.deepEqual(["ELIGIBILITY_PENDING", "PROPOSED", "ACCEPTED"].map((s) => rentAdvanceAction(s).label), ["Propor", "Aceitar", "Pagar"]);
  assert.equal(rentAdvanceAction("RECOVERED").text, "Recuperada — nada a fazer");
  assert.equal(rentAdvanceAction("REJECTED").text, "Recusada — nada a fazer");
  const tab = read("app/painel/contratos/locacao/RentAdvancesTab.js");
  assert.doesNotMatch(tab, /"ELIGIBLE"/, "a tela não espera mais um estado que a API não usa");
  assert.match(tab, /rentAdvanceAction\(row\.status\)/);
});

test("Texto do pagamento: concordância para todos os pagadores — nunca 'por o'", () => {
  assert.equal(paidByPhrase("LANDLORD"), "pelo locador");
  assert.equal(paidByPhrase("TENANT"), "pelo locatário");
  assert.equal(paidByPhrase("COMPANY"), "pela imobiliária");
  for (const p of Object.keys(PAID_BY_LABELS)) assert.doesNotMatch(`Pago ${paidByPhrase(p)}`, /\bpor o\b|\bpor a\b/);
  const ciclos = read("app/painel/contratos/locacao/UtilityCyclesModal.js");
  assert.match(ciclos, /paidByPhrase\(cycle\.paidByParty\)/);
  assert.doesNotMatch(ciclos, /\} por \$\{who/);
});
