// Aba "CRM" de Configurações (DI-M3CA-2, 5 e 6): campos, padrões iguais aos da API e conferência antes de gravar.
import { test } from "node:test";
import assert from "node:assert/strict";
import { CRM_FIELDS, CRM_PREFIXES } from "@/app/painel/configuracoes/crmGroups.js";
import { crmFieldError, crmApiValue, parseReasonList } from "@/app/painel/configuracoes/crmSettingsRules.js";

const byKey = Object.fromEntries(CRM_FIELDS.map((f) => [f.key, f]));

test("m3ca config: a aba tem as dez chaves do CRM com os padrões da API", () => {
  assert.deepEqual(CRM_FIELDS.map((f) => f.key).sort(), [
    "crm.gerencia.permissao", "crm.lead_automatico.responsavel_padrao", "crm.mensagens.finalidade_obrigatoria", "crm.motivos.desistencia", "crm.motivos.ganho", "crm.motivos.perda",
    "crm.ocorrencia.sla_horas.alta", "crm.ocorrencia.sla_horas.baixa", "crm.ocorrencia.sla_horas.media", "crm.tarefa_vencida.escalar_gerencia_apos_horas",
  ]);
  // M3-18 com o padrão do Marco 9 entregue: desligado (sem finalidade, a mensagem é tratada como transacional).
  assert.equal(byKey["crm.mensagens.finalidade_obrigatoria"].defaultValue, false);
  assert.equal(byKey["crm.mensagens.finalidade_obrigatoria"].type, "boolean");
  assert.deepEqual([byKey["crm.ocorrencia.sla_horas.alta"].defaultValue, byKey["crm.ocorrencia.sla_horas.media"].defaultValue, byKey["crm.ocorrencia.sla_horas.baixa"].defaultValue], [24, 72, 168]);
  assert.equal(byKey["crm.tarefa_vencida.escalar_gerencia_apos_horas"].defaultValue, 24);
  assert.equal(byKey["crm.gerencia.permissao"].defaultValue, "crm:dashboard:read");
  for (const k of ["crm.motivos.ganho", "crm.motivos.perda", "crm.motivos.desistencia"]) assert.ok(parseReasonList(byKey[k].defaultValue), `padrão válido em ${k}`);
  assert.deepEqual(CRM_PREFIXES, ["crm."]);
});

test("m3ca config: lista de motivos fora do formato, código repetido, faixa e permissão inválida são barrados antes de gravar", () => {
  const perda = byKey["crm.motivos.perda"];
  assert.equal(crmFieldError(perda, "IMOVEL_VENDIDO=Imóvel vendido,COMPETITOR=Concorrente"), null);
  assert.ok(crmFieldError(perda, "preço alto"));
  assert.ok(crmFieldError(perda, "A1=Um,A1=Dois"));
  const sla = byKey["crm.ocorrencia.sla_horas.alta"];
  assert.ok(crmFieldError(sla, "0"));
  assert.equal(crmFieldError(sla, "48"), null);
  assert.equal(crmApiValue(sla, "48"), 48);
  assert.throws(() => crmApiValue(sla, "9999"));
  assert.ok(crmFieldError(byKey["crm.gerencia.permissao"], "gerente"));
  assert.equal(crmFieldError(byKey["crm.gerencia.permissao"], "crm:opportunities:read:all"), null);
  assert.equal(crmApiValue(perda, "  A1=Um  "), "A1=Um");
});
