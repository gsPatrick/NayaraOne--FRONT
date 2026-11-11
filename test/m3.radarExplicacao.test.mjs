// M3-15 — Radar explicável na tela (livro §13 "matching determinístico + scoring explicável"; Guia §9 "Radar scoring"):
// cada match mostra o score e, por critério, a categoria do livro (obrigatório, preferência, flexível, exclusão), a situação
// (atendido, não atendido, ignorado), o peso e o motivo, sem código cru da API. A explicação vem de
// GET /radar/:id/matches/:propertyId/explain, no padrão de estados (carregando, erro, vazio).
import { test } from "node:test";
import assert from "node:assert/strict";
import { html } from "./_loader/render.mjs";
import RadarMatchExplanation, { RadarExplanationView, RadarScoreBadge } from "@/components/organisms/RadarMatchExplanation/RadarMatchExplanation.js";
import { explanationRows, scoreSummary, humanizeReason } from "@/lib/radarExplanation.js";
import { UI_STATE } from "@/lib/asyncState/states.js";

// Radar e explicação no formato exato que a API devolve (radarMatching.service.js explainMatch + radarScoring.js).
const CRITERIA = {
  propertyType: "RESIDENTIAL", offerType: "SALE", minPrice: 300000, maxPrice: 600000, city: "Campinas", state: "SP",
  preferences: [{ code: "MIN_BEDROOMS", value: 3, weight: 2 }, { code: "NEIGHBORHOOD", value: "Taquaral", weight: 1 }],
  flexible: [{ code: "ATTRIBUTE", key: "acabamento", value: "alto padrão", weight: 1 }, { code: "MAX_DISTANCE_KM", lat: -22.9, lng: -47.06, value: 5, weight: 1 }],
  exclusions: [{ code: "PROPERTY_TYPE", value: "LAND" }, { code: "ATTRIBUTE", key: "elevator", value: "false" }],
};
const EXPLICACAO = {
  propertyId: "p1", matched: true, matchedCount: 9, totalCriteria: 11, score: 0.6, requiredScore: 1, reasons: ["MIN_BEDROOMS", "ATTRIBUTE"],
  criteria: {
    propertyType: { category: "REQUIRED", matched: true },
    city: { category: "REQUIRED", matched: true },
    state: { category: "REQUIRED", matched: true },
    activeOffer: { category: "REQUIRED", matched: true },
    offerType: { category: "REQUIRED", matched: true },
    priceRange: { category: "REQUIRED", matched: true },
    "preference:MIN_BEDROOMS": { category: "PREFERENCE", code: "MIN_BEDROOMS", weight: 2, matched: true },
    "preference:NEIGHBORHOOD": { category: "PREFERENCE", code: "NEIGHBORHOOD", weight: 1, matched: false, reason: 'Bairro é "Cambuí", o radar prefere "Taquaral".' },
    "flexible:ATTRIBUTE:acabamento": { category: "FLEXIBLE", code: "ATTRIBUTE", weight: 1, matched: true },
    "flexible:MAX_DISTANCE_KM": { category: "FLEXIBLE", code: "MAX_DISTANCE_KM", weight: 1, matched: false, distanceKm: 7.12, reason: "Fica a 7.12 km do ponto, o radar aceita até 5 km." },
    "exclusion:PROPERTY_TYPE:LAND": { category: "EXCLUSION", code: "PROPERTY_TYPE", matched: true },
    "exclusion:ATTRIBUTE:elevator": { category: "EXCLUSION", code: "ATTRIBUTE", matched: true },
  },
};
const ENUM_CRU = /\b(REQUIRED|PREFERENCE|FLEXIBLE|EXCLUSION|MIN_BEDROOMS|NEIGHBORHOOD|MAX_DISTANCE_KM|PROPERTY_TYPE|ATTRIBUTE|RESIDENTIAL|LAND|SALE|RENT|REQUIRED_FAILED|EXCLUDED|elevator)\b/;
const textoVisivel = (out) => out.replace(/<[^>]+>/g, " ").replace(/&quot;/g, '"').replace(/&amp;/g, "&");

test("m3 radar explicação: o score e cada critério aparecem com categoria, situação e peso em português", () => {
  const out = html(RadarMatchExplanation, { explanation: EXPLICACAO, criteriaJson: CRITERIA });
  const texto = textoVisivel(out);
  assert.match(texto, /60%/);
  assert.match(texto, /Obrigatórios atendidos: 6 de 6/);
  assert.match(texto, /Pesos de preferências e flexíveis atendidos: 3 de 5/);
  for (const categoria of ["Obrigatório", "Preferência", "Flexível", "Exclusão"]) assert.match(texto, new RegExp(categoria));
  assert.match(texto, /Pelo menos 3 quarto\(s\)/);
  assert.match(texto, /Acabamento: alto padrão/);
  assert.match(texto, /Até 5 km do ponto/);
  assert.match(texto, /Peso 2 \(somado ao score\)/);
  assert.match(texto, /Bairro é "Cambuí", o radar prefere "Taquaral"/);
  assert.match(texto, /Peso 1 \(não somado\)/);
  assert.match(texto, /Não aceita Elevador: Não/);
  assert.match(texto, /Não aceita imóvel do tipo Terreno/);
  assert.match(texto, /Faixa de preço\s*:\s*R\$\s*300\.000,00 a R\$\s*600\.000,00/);
  assert.equal((out.match(/data-status="MET"/g) || []).length, 10);
  assert.equal((out.match(/data-status="UNMET"/g) || []).length, 2);
  assert.ok(!ENUM_CRU.test(texto), `nenhum código cru na tela: ${texto.match(ENUM_CRU)}`);
});

test("m3 radar explicação: linhas na ordem do livro (obrigatório, preferência, flexível, exclusão)", () => {
  const ordem = explanationRows(EXPLICACAO, CRITERIA).map((r) => r.category);
  const primeiraDe = (c) => ordem.indexOf(c);
  assert.ok(primeiraDe("REQUIRED") < primeiraDe("PREFERENCE"));
  assert.ok(primeiraDe("PREFERENCE") < primeiraDe("FLEXIBLE"));
  assert.ok(primeiraDe("FLEXIBLE") < primeiraDe("EXCLUSION"));
  assert.equal(ordem.lastIndexOf("REQUIRED"), 5);
});

test("m3 radar explicação: imóvel fora do radar (obrigatório falhou) mostra não atendido e preferências ignoradas, score 0", () => {
  const fora = {
    matched: false, score: 0, reasons: ["REQUIRED_FAILED"],
    criteria: {
      offerType: { category: "REQUIRED", matched: false, reason: 'Imóvel não tem oferta ATIVA do tipo "SALE".' },
      priceRange: { category: "REQUIRED", matched: false, reason: "Acima do máximo: preço 750000 > 600000." },
      "preference:MIN_BEDROOMS": { category: "PREFERENCE", code: "MIN_BEDROOMS", weight: 2, matched: true },
    },
  };
  const rows = explanationRows(fora, CRITERIA);
  assert.deepEqual(rows.map((r) => r.statusLabel), ["Não atendido", "Não atendido", "Ignorado"]);
  const texto = textoVisivel(html(RadarMatchExplanation, { explanation: fora, criteriaJson: CRITERIA }));
  assert.match(texto, /0%/);
  assert.match(texto, /Fora do radar: um critério obrigatório não foi atendido/);
  assert.match(texto, /oferta ativa do tipo "Venda"/);
  assert.match(texto, /preço R\$\s*750\.000,00, máximo R\$\s*600\.000,00/);
  assert.ok(!ENUM_CRU.test(texto));
  assert.equal(scoreSummary(fora).weightsMet, "0");
});

test("m3 radar explicação: exclusão que se aplica tira o imóvel e diz o motivo sem código", () => {
  const excluido = { matched: false, score: 0, reasons: ["EXCLUDED"], criteria: { "exclusion:PROPERTY_TYPE:RESIDENTIAL": { category: "EXCLUSION", code: "PROPERTY_TYPE", matched: false, reason: 'Excluído: o cliente não aceita imóvel do tipo "RESIDENTIAL".' } } };
  const [row] = explanationRows(excluido, { exclusions: [{ code: "PROPERTY_TYPE", value: "RESIDENTIAL" }] });
  assert.equal(row.categoryLabel, "Exclusão");
  assert.equal(row.statusLabel, "Não atendido");
  assert.equal(row.weightText, "Eliminatório");
  assert.equal(row.note, 'Excluído: o cliente não aceita imóvel do tipo "Residencial".');
  assert.match(scoreSummary(excluido).headline, /uma exclusão do cliente se aplica/);
  assert.equal(humanizeReason('"furnished" é "true"'), '"Mobiliado" é "Sim"');
  assert.equal(humanizeReason("Fica a 83.65 km do ponto, o radar aceita até 5 km."), "Fica a 83,65 km do ponto, o radar aceita até 5 km.");
});

test("m3 radar explicação: o cartão do match mostra o score que a listagem já traz (radarMatch)", () => {
  assert.match(html(RadarScoreBadge, { explanation: EXPLICACAO }), /Score 60%/);
  assert.equal(html(RadarScoreBadge, { explanation: null }), "");
});

test("m3 radar explicação: estados de carregando, erro e vazio no padrão AsyncState", () => {
  const carregando = html(RadarExplanationView, { result: { status: UI_STATE.LOADING, data: null }, criteriaJson: CRITERIA });
  assert.match(carregando, /data-ui-state="LOADING"/);
  assert.match(carregando, /Carregando a explicação do match/);
  const erro = html(RadarExplanationView, { result: { status: UI_STATE.RETRY, data: null, error: { status: 500 }, retry: () => {} }, criteriaJson: CRITERIA });
  assert.match(erro, /data-ui-state="RETRY"/);
  assert.match(erro, /Tentar novamente/);
  const vazio = html(RadarExplanationView, { result: { status: UI_STATE.EMPTY, data: { criteria: {} } }, criteriaJson: CRITERIA });
  assert.match(vazio, /Sem critérios para explicar/);
  const conteudo = html(RadarExplanationView, { result: { status: UI_STATE.CONTENT, data: EXPLICACAO }, criteriaJson: CRITERIA });
  assert.match(conteudo, /data-radar-explanation="true"/);
});
