// NAY Comercial no Front (Marco 3 §12 e §16, rodada M3CB): corpo do pedido por capacidade, rótulos em português, erros traduzidos,
// acompanhamento do run longo (202), tela renderizada sem código cru e os parâmetros novos da aba IA NAY.
import { test } from "node:test";
import assert from "node:assert/strict";
import fs from "node:fs";
import {
  AGENT_CODE, OPPORTUNITY_CAPABILITIES, TASKS, buildRunBody, sourceLabel, qualityClass, docStatus, sentiment, recommendationType,
  violationLabel, channelLabel, purposeLabel, occurrenceLabel, hasSensitiveRemoved, descriptionGuardIssues, nayErrorMessage, totalPagesOf,
} from "@/app/painel/crm/nay/nayComercial.format.js";
import { executeNayRun, pollRun } from "@/app/painel/crm/nay/nayComercial.run.js";
import { IA_COMERCIAL_GROUPS } from "@/app/painel/configuracoes/iaComercialGroups.js";
import { IA_COMERCIAL_CAPACIDADES_GROUPS } from "@/app/painel/configuracoes/iaComercialCapacidadesGroups.js";
import { IA_COMERCIAL_SENSIVEL_GROUPS } from "@/app/painel/configuracoes/iaComercialSensivelGroups.js";
import { allSettingLabels } from "@/lib/settings/allLabels.js";
import { plainMessageProblems } from "@/lib/a11y/plainMessage.js";
import { html } from "./_loader/render.mjs";
import ClassificacaoCadastro from "@/app/painel/crm/nay/ClassificacaoCadastro.js";
import ResumoMensagem from "@/app/painel/crm/nay/ResumoMensagem.js";
import NayAnswer from "@/app/painel/crm/nay/NayAnswer.js";

const OPP = "11111111-1111-4111-8111-111111111111";
const MSG = "22222222-2222-4222-8222-222222222222";
const PROP = "33333333-3333-4333-8333-333333333333";
const read = (rel) => fs.readFileSync(new URL(`../${rel}`, import.meta.url), "utf8");
const fields = [...IA_COMERCIAL_GROUPS, ...IA_COMERCIAL_CAPACIDADES_GROUPS, ...IA_COMERCIAL_SENSIVEL_GROUPS].flatMap((g) => g.fields);
const field = (key) => fields.find((f) => f.key === key);
const norm = (t) => String(t).normalize("NFD").replace(/[̀-ͯ]/g, "").toLowerCase();
const terms = (key) => field(key).defaultValue.split(",").map((t) => t.trim()).filter(Boolean);

test("m3cb corpo do pedido: agente, finalidade, tarefa e o assunto certo para cada capacidade", () => {
  const cases = [
    [TASKS.SUMMARY, { opportunityId: OPP }, { entityType: "crmOpportunity", entityId: OPP }],
    [TASKS.NEXT_ACTION, { opportunityId: OPP }, { entityType: "crmOpportunity", entityId: OPP }],
    [TASKS.RADAR, { opportunityId: OPP }, { entityType: "crmOpportunity", entityId: OPP }],
    [TASKS.QUALITY, { opportunityId: OPP }, { entityType: "crmOpportunity", entityId: OPP }],
    [TASKS.RECOVERY, { opportunityId: OPP }, { entityType: "crmOpportunity", entityId: OPP }],
    [TASKS.SEND, { opportunityId: OPP, channel: "EMAIL" }, { entityType: "crmOpportunity", entityId: OPP }],
    [TASKS.MESSAGE, { messageId: MSG }, { entityType: "crmMessage", entityId: MSG }],
    [TASKS.PROPERTY, { propertyId: PROP }, { entityType: "property", entityId: PROP }],
  ];
  for (const [task, params, context] of cases) {
    const body = buildRunBody(task, params);
    assert.equal(body.agentCode, AGENT_CODE, task);
    assert.equal(body.agentCode, "NAY_COMERCIAL");
    assert.equal(body.purpose, "Apoio comercial");
    assert.equal(body.taskType, task);
    assert.deepEqual(body.context, context, task);
  }
  const leads = buildRunBody(TASKS.FORGOTTEN, {});
  assert.equal(leads.taskType, "detectar_leads_esquecidos");
  assert.equal("context" in leads, false, "lead esquecido vai sem context: é a carteira de quem pede");
  assert.throws(() => buildRunBody(TASKS.SUMMARY, {}), /Escolha/);
  assert.throws(() => buildRunBody("criar_tarefa", { opportunityId: OPP }));
  assert.deepEqual(OPPORTUNITY_CAPABILITIES.map((c) => c.id), ["resumir_oportunidade", "sugerir_proxima_acao", "listar_imoveis_radar", "classificar_cadastro", "rascunhar_recuperacao_cliente", "propor_envio_mensagem"]);
});

test("m3cb o texto de cada pedido tem palavra do assunto e nenhuma frase de ação proibida (padrões da aba IA NAY)", () => {
  const scope = terms("ia.comercial.termos_escopo");
  const forbidden = ["criar_tarefa", "alterar_etapa", "enviar_mensagem", "publicar_descricao", "inferir_atributo_sensivel"].flatMap((k) => terms(`ia.comercial.proibicao.${k}`));
  const params = { opportunityId: OPP, messageId: MSG, propertyId: PROP };
  for (const task of Object.values(TASKS)) {
    for (const channel of ["WHATSAPP", "EMAIL", "SMS"]) {
      const input = norm(buildRunBody(task, { ...params, channel }).input);
      assert.ok(scope.some((t) => input.includes(t)), `${task}: sem palavra do assunto`);
      for (const f of forbidden) assert.ok(!input.includes(f), `${task}: frase proibida "${f}"`);
    }
  }
  assert.match(buildRunBody(TASKS.SEND, { opportunityId: OPP, channel: "WHATSAPP" }).input, /por WhatsApp$/);
  assert.match(buildRunBody(TASKS.SEND, { opportunityId: OPP, channel: "EMAIL" }).input, /por e-mail$/);
  assert.match(buildRunBody(TASKS.SEND, { opportunityId: OPP, channel: "SMS" }).input, /por SMS$/);
});

test("m3cb rótulos: classe, situação de documento, sentimento, recomendação, violação, canal, finalidade e fontes", () => {
  assert.deepEqual([qualityClass("BOM").label, qualityClass("REGULAR").label, qualityClass("RUIM").label], ["Bom", "Regular", "Ruim"]);
  assert.deepEqual(["OK", "PENDENTE_VERIFICACAO", "VENCIDO", "RECUSADO", "FALTANTE"].map((s) => docStatus(s).label), ["OK", "Aguardando verificação", "Vencido", "Recusado", "Faltante"]);
  assert.deepEqual(["NEGATIVO", "NEUTRO", "POSITIVO"].map((s) => sentiment(s).label), ["Negativo", "Neutro", "Positivo"]);
  assert.equal(recommendationType("LEAD_ESQUECIDO"), "Lead esquecido");
  assert.equal(recommendationType("RESUMO_MENSAGEM"), "Resumo de mensagem (apoio)");
  assert.equal(recommendationType("PROPOSTA_ENVIO_MENSAGEM"), "Proposta de mensagem");
  assert.equal(recommendationType("NEXT_ACTION"), "Próxima ação");
  assert.equal(violationLabel("METRAGEM_INVENTADA"), "Metragem fora do cadastro");
  assert.equal(violationLabel("QUANTIDADE_INVENTADA"), "Quantidade fora do cadastro");
  assert.equal(violationLabel("VALOR_INVENTADO"), "Valor fora do cadastro");
  assert.equal(violationLabel("CARACTERISTICA_AUSENTE"), "Característica que o cadastro não tem");
  assert.equal(channelLabel("EMAIL"), "E-mail");
  assert.equal(purposeLabel("MARKETING"), "Marketing");
  assert.equal(occurrenceLabel({ tipo: "COMPLAINT", rotulo: "reclamação" }), "Reclamação");
  assert.equal(occurrenceLabel(null), null);
  const titles = { "crm.opportunities": "Oportunidade", "crm.interactions": "Interações", "crm.messages": "Mensagem", people: "Cadastro da pessoa", "people.documents": "Documentos da pessoa", properties: "Fatos públicos do imóvel", "radar.matches": "Radar" };
  for (const [title, label] of Object.entries(titles)) assert.equal(sourceLabel({ title }), label, title);
  assert.equal(sourceLabel({ sourceRef: `crm.messages:${MSG}` }), "Mensagem", "run lido por GET: título pelo sourceRef");
  assert.equal(sourceLabel({ sourceRef: `properties.public:${PROP}` }), "Fatos públicos do imóvel");
  for (const code of ["XYZ_DESCONHECIDO", null]) for (const label of [qualityClass(code).label, docStatus(code).label, recommendationType(code), violationLabel(code), sourceLabel({ title: code })]) assert.doesNotMatch(label, /[A-Z]{3,}_/, "código desconhecido nunca vai cru para a tela");
});

test("m3cb dado sensível retirado e o que a guarda da descrição tirou", () => {
  assert.equal(hasSensitiveRemoved({ sensivelRemovido: [] }), false);
  assert.equal(hasSensitiveRemoved({ sensivelRemovido: ["saúde"] }), true);
  assert.equal(hasSensitiveRemoved({ sensivelRemovido: [], atributoSensivelRemovido: ["convicção religiosa"] }), true);
  assert.deepEqual(descriptionGuardIssues({ guardaDescricao: { aprovada: true, violacoes: [] } }), []);
  assert.deepEqual(descriptionGuardIssues({ guardaDescricao: { aprovada: false, violacoes: [{ tipo: "METRAGEM_INVENTADA", trecho: "120 m²" }, { tipo: "CARACTERISTICA_AUSENTE", trecho: "piscina" }] } }),
    [{ label: "Metragem fora do cadastro", trecho: "120 m²" }, { label: "Característica que o cadastro não tem", trecho: "piscina" }]);
  assert.deepEqual(descriptionGuardIssues(null), []);
});

test("m3cb erros: 403 sem permissão, 404 fora da carteira, 429 e 503 amigáveis, sem código técnico", () => {
  assert.equal(nayErrorMessage({ status: 403, code: "AI_PERMISSION_DENIED" }), "Você não tem permissão para consultar estes dados.");
  assert.equal(nayErrorMessage({ status: 404, code: "AI_CROSS_COMPANY_BLOCKED" }), "Oportunidade não encontrada na sua carteira.");
  assert.equal(nayErrorMessage({ status: 404, code: "AI_CROSS_COMPANY_BLOCKED" }, { notFound: "Imóvel não encontrado na sua empresa." }), "Imóvel não encontrado na sua empresa.");
  const others = [{ status: 429, code: "AI_RATE_LIMITED" }, { status: 429, code: "AI_BUDGET_EXHAUSTED" }, { status: 503, code: "AI_PROVIDER_UNAVAILABLE" }, { status: 503, code: "AI_FEATURE_DISABLED" }, { status: 409, code: "AI_AGENT_DISABLED" }, { status: 0, code: "NETWORK_ERROR" }, { code: "NAY_RUN_TIMEOUT" }, { status: 500 }];
  for (const err of others) {
    const text = nayErrorMessage(err);
    assert.deepEqual(plainMessageProblems(text), [], text);
    assert.doesNotMatch(text, /AI_|NAY_RUN|\b\d{3}\b/, text);
  }
  assert.match(nayErrorMessage({ status: 429, code: "AI_RATE_LIMITED" }), /Aguarde/);
  assert.match(nayErrorMessage({ status: 503, code: "AI_PROVIDER_UNAVAILABLE" }), /nada foi alterado/);
});

test("m3cb execução: 200 devolve a resposta; 202 acompanha o run até o fim; passando do limite avisa que ainda está em andamento", async () => {
  const ok = await executeNayRun({}, { createRun: async () => ({ httpStatus: 200, data: { runId: "r1", status: "COMPLETED", answer: "Resumo [1]", sources: [{ title: "crm.opportunities" }], structured: { classe: "BOM" }, snapshotAt: "2026-11-10T12:00:00.000Z" } }) });
  assert.equal(ok.answer, "Resumo [1]");
  assert.equal(ok.structured.classe, "BOM");
  assert.equal(ok.fromPolling, false);

  const seen = [];
  const states = ["RUNNING", "RUNNING", "COMPLETED"];
  const long = await executeNayRun({}, {
    createRun: async () => ({ httpStatus: 202, data: { runId: "r2", status: "RUNNING" } }),
    getRun: async (id) => { seen.push(id); return { id, status: states[seen.length - 1], outputSummary: "Resposta longa", sources: [{ sourceRef: "radar.matches:x" }], snapshotAt: "2026-11-10T12:00:00.000Z" }; },
    sleep: async () => {},
  });
  assert.deepEqual(seen, ["r2", "r2", "r2"]);
  assert.equal(long.status, "COMPLETED");
  assert.equal(long.answer, "Resposta longa");
  assert.equal(long.fromPolling, true);

  const blocked = await pollRun("r3", { getRun: async (id) => ({ id, status: "BLOCKED", message: "A NAY não pôde concluir: pedido fora do escopo." }), sleep: async () => {} });
  assert.equal(blocked.status, "BLOCKED");

  let calls = 0;
  await assert.rejects(
    executeNayRun({}, { createRun: async () => ({ httpStatus: 202, data: { runId: "r4", status: "RUNNING" } }), getRun: async () => { calls += 1; return { status: "RUNNING" }; }, sleep: async () => {}, maxAttempts: 4 }),
    (err) => err.code === "NAY_RUN_TIMEOUT"
  );
  assert.equal(calls, 4, "limite de tentativas respeitado");
});

test("m3cb paginação das recomendações: 20 por página, com ou sem total", () => {
  assert.equal(totalPagesOf({ total: 45, limit: 20, page: 1, count: 20 }), 3);
  assert.equal(totalPagesOf({ total: 0, limit: 20, page: 1, count: 0 }), 1);
  assert.equal(totalPagesOf({ total: null, limit: 20, page: 2, count: 20 }), 3);
  assert.equal(totalPagesOf({ total: null, limit: 20, page: 2, count: 7 }), 2);
});

test("m3cb a tela mostra classe, situação, sentimento, aviso de apoio e de LGPD, fontes e data, sem código cru", () => {
  const quality = html(ClassificacaoCadastro, { data: { classe: "REGULAR", nota: 62, notasDeCorte: { bom: 80, regular: 50 }, camposFaltantes: ["Endereço"], documentos: [{ exigido: "RG ou CIN", situacao: "PENDENTE_VERIFICACAO" }, { exigido: "CNH", situacao: "FALTANTE" }], documentosFaltantes: ["CNH (faltante)"], documentosPendentesFinanciamento: ["Comprovante de renda"] } });
  for (const text of ["Regular", "62 de 100", "Bom a partir de 80", "Aguardando verificação", "Faltante", "Comprovante de renda"]) assert.ok(quality.includes(text), text);
  assert.doesNotMatch(quality, /PENDENTE_VERIFICACAO|REGULAR\b|FALTANTE/);

  const message = html(ResumoMensagem, { data: { apoio: true, resumo: "Cliente reclama da demora.", sentimento: "NEGATIVO", ocorrenciaSugerida: { tipo: "COMPLAINT", rotulo: "reclamação" }, sensivelRemovido: ["saúde"] } });
  for (const text of ["Sugestão da NAY — não altera o cadastro nem abre ocorrência", "Negativo", "Reclamação", "Um trecho com dado pessoal sensível ficou de fora (LGPD)", "/painel/crm/feedback"]) assert.ok(message.includes(text), text);
  assert.doesNotMatch(message, /NEGATIVO|COMPLAINT/);

  const answer = html(NayAnswer, { state: { status: "done", taskType: TASKS.SUMMARY, result: { status: "COMPLETED", answer: "Resumo da oportunidade [1]", sources: [{ title: "crm.opportunities" }, { title: "crm.interactions" }], snapshotAt: "2026-11-10T12:00:00.000Z" } } });
  for (const text of ["Resumo da oportunidade [1]", "Oportunidade", "Interações", "Dados de "]) assert.ok(answer.includes(text), text);
  assert.doesNotMatch(answer, /crm\.opportunities|crm\.interactions/);
  const loading = html(NayAnswer, { state: { status: "loading", taskType: TASKS.SUMMARY } });
  assert.match(loading, /aria-busy="true"/);
});

test("m3cb aba IA NAY: parâmetros novos com chave, tipo, faixa e padrão do livro, registrados na aba e nos rótulos", () => {
  const expected = {
    "ia.comercial.lead_esquecido.ativo": ["boolean", true],
    "ia.comercial.lead_esquecido.dias_sem_contato": ["integer", 7, 1, 365],
    "ia.comercial.lead_esquecido.intervalo_horas": ["integer", 24, 1, 168],
    "ia.comercial.lead_esquecido.max_lista": ["integer", 20, 1, 100],
    "ia.comercial.cadastro.documentos_pf": ["text", "RG|CIN|CNH|RG_CPF"],
    "ia.comercial.cadastro.documentos_pj": ["text", "CNPJ"],
    "ia.comercial.cadastro.nota_bom": ["integer", 80, 1, 100],
    "ia.comercial.cadastro.nota_regular": ["integer", 50, 0, 100],
    "ia.comercial.mensagem.resumo_max_caracteres": ["integer", 280, 40, 2000],
    "ia.comercial.mensagem.termos_reclamacao": ["text", "reclamacao,reclamar,reclamo,insatisfeit,absurdo,pessimo,horrivel,descaso,decepcionad,nao gostei,problema"],
    "ia.comercial.mensagem.termos_elogio": ["text", "parabens,obrigad,excelente,otimo atendimento,muito bom,adorei,gostei muito,satisfeit,recomendo,maravilhos"],
    "ia.comercial.mensagem.termos_conflito": ["text", "vou processar,processar,procon,advogado,justica,cancelar tudo,devolucao do sinal,quero meu dinheiro,briga,discussao"],
    "ia.comercial.mensagem.termos_atendimento_inadequado": ["text", "grosseir,mal atendid,ninguem responde,sem resposta,me ignor,falta de respeito,demora no atendimento,atendimento ruim"],
    "ia.comercial.mensagem.termos_retorno_pendente": ["text", "aguardo retorno,aguardando retorno,ainda nao retornaram,me retorne,retorne,fico no aguardo,pode me ligar,me liga"],
    "ia.comercial.envio.finalidade_consentimento": ["enum", "MARKETING"],
    "ia.comercial.envio.canal_padrao": ["enum", "WHATSAPP"],
    "ia.comercial.redacao_por_modelo": ["boolean", false],
  };
  for (const [key, [type, def, min, max]] of Object.entries(expected)) {
    const f = field(key);
    assert.ok(f, `${key} ausente`);
    assert.equal(f.type, type, key);
    assert.equal(f.defaultValue, def, key);
    if (min !== undefined) assert.deepEqual([f.min, f.max], [min, max], key);
    assert.ok(f.label && f.helper, `${key} sem rótulo ou ajuda`);
  }
  assert.deepEqual(field("ia.comercial.envio.finalidade_consentimento").options.map((o) => o.value), ["MARKETING", "CADENCE", "CAMPAIGN", "COMMERCIAL", "TRANSACTIONAL"]);
  assert.deepEqual(field("ia.comercial.envio.canal_padrao").options.map((o) => o.value), ["WHATSAPP", "EMAIL", "SMS", "PHONE"]);
  assert.match(field("ia.comercial.descricao.termos_controlados").defaultValue, /^suite,piscina,churrasqueira,.*,arejad,iluminad$/);
  assert.match(field("ia.comercial.termos_escopo").defaultValue, /,tarefa,cadastro,classifi,mensagem,sentimento,esquecid,parad,envio$/);
  const sensitive = ["origem_racial_etnica", "conviccao_religiosa", "opiniao_politica", "filiacao_organizacao", "saude", "vida_sexual", "dado_genetico", "dado_biometrico"].map((k) => `ia.comercial.sensivel.${k}`);
  for (const key of [...sensitive, "ia.comercial.proibicao.inferir_atributo_sensivel"]) assert.ok(field(key) && field(key).type === "text" && field(key).defaultValue.length > 10, key);
  assert.match(field("ia.comercial.sensivel.conviccao_religiosa").defaultValue, /^religiao,religios,catolic,/);
  assert.equal(IA_COMERCIAL_SENSIVEL_GROUPS[0].title, "NAY Comercial: dado pessoal sensível");
  const labels = allSettingLabels();
  for (const key of [...Object.keys(expected), ...sensitive, "ia.comercial.descricao.termos_controlados"]) assert.ok(labels[key], `${key} fora de lib/settings/allLabels.js`);
  const tab = read("app/painel/configuracoes/IaNayTab.js");
  assert.match(tab, /\.\.\.IA_COMERCIAL_CAPACIDADES_GROUPS/);
  assert.match(tab, /\.\.\.IA_COMERCIAL_SENSIVEL_GROUPS/);
  assert.match(read("app/painel/configuracoes/IaNayField.js"), /field\.type === "enum"/);
});

test("m3cb a NAY Comercial está no menu do CRM e a tela não grava nada no CRM", () => {
  assert.match(read("app/painel/_nav.js"), /href: "\/painel\/crm\/nay"/);
  assert.match(read("components/molecules/CrmNavMenu/CrmNavMenu.js"), /href: "\/painel\/crm\/nay"/);
  const dir = new URL("../app/painel/crm/nay/", import.meta.url);
  for (const name of fs.readdirSync(dir).filter((n) => n.endsWith(".js"))) {
    const src = fs.readFileSync(new URL(name, dir), "utf8");
    assert.doesNotMatch(src, /createOpportunity|updateOpportunity|createFeedbackCase|createOpportunityTask|updateProperty|publishOffer|method: "(PATCH|PUT|DELETE)"/, name);
    assert.ok(src.split("\n").length <= 400, `${name} passa de 400 linhas`);
  }
});
