// M9-D609 / BI-013 / Guia §14 (Marco 9, BI) — selo e ocultamento de dado velho e vencido (lib/analytics/freshness.js e FreshnessBadge). O Front não calcula idade nem estado:
// desenha o bloco `freshness` que a API manda. STALE mostra o número com o selo "Desatualizado há X"; EXPIRED (e nunca atualizado) não mostra o número. Os limites exatos e o
// fator de expiração são os da API: o bloco é montado aqui pela função pura da API (computeFreshness, repositório irmão) nas bordas (limite 15 de TECH_AI, fator 4) e passa
// pela função do Front, como na tela. O padrão do limite e do fator na aba de Configurações é o mesmo da API.
import { test } from "node:test";
import assert from "node:assert/strict";
import fs from "node:fs";
import { createRequire } from "node:module";
import { freshnessDisplay, FRESHNESS_TONES } from "@/lib/analytics/freshness.js";
import FreshnessBadge from "@/components/molecules/analytics/FreshnessBadge/FreshnessBadge.js";
import { BI_QUALIDADE_GROUPS } from "@/app/painel/configuracoes/biQualidadeGroups.js";
import { html } from "./_loader/render.mjs";

const require = createRequire(import.meta.url);
const API_ROOT = ["../../API", "../../NayaraOne--API"].map((p) => new URL(p, import.meta.url).pathname).find((p) => fs.existsSync(`${p}/src/features/analytics/metrics/freshness.js`));
const metric = (state, label, extra = {}) => ({ value: "6.00", status: "OK", freshness: { state, label, ...extra } });

test("M9-D609 FRESH e STALE mostram o número; STALE com o selo de aviso escrito pelo servidor", () => {
  assert.deepEqual(freshnessDisplay(metric("FRESH", "Atualizado às 14:05")), { tone: "ok", text: "Atualizado às 14:05", showValue: true });
  assert.deepEqual(freshnessDisplay(metric("STALE", "Desatualizado há 16 min")), { tone: "warning", text: "Desatualizado há 16 min", showValue: true });
  assert.deepEqual(FRESHNESS_TONES, { FRESH: "ok", STALE: "warning", EXPIRED: "danger", UNKNOWN: "danger" });
});

test("M9-D609 EXPIRED e nunca atualizado escondem o número mesmo quando a API o manda; sem bloco de freshness também", () => {
  assert.deepEqual(freshnessDisplay(metric("EXPIRED", "Dado antigo, não use para decidir")), { tone: "danger", text: "Dado antigo, não use para decidir", showValue: false });
  assert.deepEqual(freshnessDisplay(metric("UNKNOWN", "Ainda sem atualização")), { tone: "danger", text: "Ainda sem atualização", showValue: false });
  assert.deepEqual(freshnessDisplay({ value: "6.00" }), { tone: "danger", text: "Sem informação de atualização", showValue: false });
  assert.deepEqual(freshnessDisplay(metric("ESTADO_NOVO", "x")), { tone: "danger", text: "x", showValue: true }, "estado desconhecido não ganha tom de dado bom");
  assert.equal(freshnessDisplay({ ...metric("FRESH", "Atualizado às 14:05"), value: null }).showValue, false, "sem valor não inventa número");
  assert.deepEqual(freshnessDisplay(metric("EXPIRED", "Registro de 27/10/2026", { historical: true })), { tone: "ok", text: "Registro de 27/10/2026", showValue: true }, "dia passado: o registro gravado");
});

test("M9-D609 o selo escreve o texto (não só a cor), leva o estado e avisa o leitor de tela quando o dado não está em dia", () => {
  const fresh = html(FreshnessBadge, { metric: metric("FRESH", "Atualizado às 14:05") });
  assert.match(fresh, /data-freshness-state="FRESH"/);
  assert.match(fresh, />Atualizado às 14:05</);
  assert.doesNotMatch(fresh, /role="status"/);
  for (const [state, label] of [["STALE", "Desatualizado há 16 min"], ["EXPIRED", "Dado antigo, não use para decidir"]]) {
    const out = html(FreshnessBadge, { metric: metric(state, label) });
    assert.match(out, new RegExp(`data-freshness-state="${state}"`));
    assert.match(out, /role="status"/);
    assert.match(out, new RegExp(`>${label}<`));
  }
  assert.match(html(FreshnessBadge, { metric: null }), /data-freshness-state="UNKNOWN"[^>]*>Sem informação de atualização</);
});

test("M9-D609 nas bordas exatas da API (limite 15 de TECH_AI, fator 4): 15 min mostra, 16 mostra com selo, 60 ainda mostra, 61 esconde", (t) => {
  if (!API_ROOT) return t.skip("repositório irmão da API ausente");
  const { computeFreshness } = require(`${API_ROOT}/src/features/analytics/metrics/freshness.js`);
  const source = new Date("2026-10-28T15:00:00Z");
  const at = (minutes) => {
    const block = computeFreshness({ sourceSnapshotAt: source, refreshedAt: source, maxStalenessMinutes: 15, factor: 4, now: new Date(source.getTime() + minutes * 60000) });
    const shown = freshnessDisplay({ value: "6.00", freshness: block });
    return [block.state, shown.showValue, shown.tone, shown.text];
  };
  assert.deepEqual(at(15), ["FRESH", true, "ok", "Atualizado às 12:00"], "idade igual ao limite ainda é atual");
  assert.deepEqual(at(16), ["STALE", true, "warning", "Desatualizado há 16 min"], "um minuto acima do limite: número com selo");
  assert.deepEqual(at(60), ["STALE", true, "warning", "Desatualizado há 1 h"], "idade igual a fator x limite (4 x 15) ainda é só desatualizado");
  assert.deepEqual(at(61), ["EXPIRED", false, "danger", "Dado antigo, não use para decidir"], "acima de fator x limite: vencido, sem número");
  const factor2 = computeFreshness({ sourceSnapshotAt: source, refreshedAt: source, maxStalenessMinutes: 15, factor: 2, now: new Date(source.getTime() + 31 * 60000) });
  assert.deepEqual([factor2.state, freshnessDisplay({ value: "6.00", freshness: factor2 }).showValue], ["EXPIRED", false], "com o fator 2 configurado, 31 min já é vencido");
});

test("M9-D609 a aba de Configurações oferece o limite de TECH_AI e o fator com o padrão da API (15 e 4)", (t) => {
  const fields = new Map(BI_QUALIDADE_GROUPS.flatMap((g) => g.fields).map((f) => [f.key, f]));
  const factor = fields.get("analytics.freshness.fator_expirado");
  const tech = fields.get("analytics.freshness.max_minutos.TECH_AI");
  assert.deepEqual([factor.type, factor.defaultValue, tech.type, tech.defaultValue], ["number", 4, "number", 15]);
  assert.match(factor.helper, /Acima de \(limite da área x este valor\) o dado vencido .* não aparece como atual\. Padrão: 4\./);
  if (!API_ROOT) return t.skip("repositório irmão da API ausente");
  const { DEFAULTS, K, FRESHNESS_DOMAINS } = require(`${API_ROOT}/src/features/analytics/quality/quality.settings.js`);
  assert.deepEqual([DEFAULTS[K.factor], FRESHNESS_DOMAINS.TECH_AI], [factor.defaultValue, tech.defaultValue]);
});
