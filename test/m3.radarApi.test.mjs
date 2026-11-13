// M3-15 — Chamadas do Radar no lib/api (nunca fetch cru): a explicação do match vem de
// GET /radar/:id/matches/:propertyId/explain e criação/edição levam as quatro categorias do livro (§13) em criteriaJson.
import { test } from "node:test";
import assert from "node:assert/strict";
import * as radarApi from "@/lib/api/radar.js";

const CRITERIOS = {
  offerType: "SALE", city: "Campinas", maxPrice: 600000,
  preferences: [{ code: "MIN_BEDROOMS", value: 3, weight: 2 }],
  flexible: [{ code: "MAX_DISTANCE_KM", value: 5, lat: -22.9, lng: -47.06, weight: 1 }],
  exclusions: [{ code: "PROPERTY_TYPE", value: "LAND" }],
};
const EXPLICACAO = { propertyId: "p 9", matched: true, score: 1, criteria: { city: { category: "REQUIRED", matched: true } } };

function stubApi(data) {
  const calls = [];
  const storage = new Map();
  globalThis.window = { localStorage: { getItem: (k) => (storage.has(k) ? storage.get(k) : null), setItem: (k, v) => storage.set(k, String(v)), removeItem: (k) => storage.delete(k) }, location: { pathname: "/painel", search: "", href: "" } };
  globalThis.localStorage = globalThis.window.localStorage;
  globalThis.fetch = async (url, init) => {
    calls.push({ url, init });
    return { ok: true, status: 200, headers: { get: () => null }, text: async () => JSON.stringify({ success: true, data }) };
  };
  return calls;
}

test("m3 radar api: explainRadarMatch lê GET /radar/:id/matches/:propertyId/explain e devolve a explicação", async () => {
  const calls = stubApi(EXPLICACAO);
  assert.equal(typeof radarApi.explainRadarMatch, "function", "lib/api/radar.js precisa expor a explicação do match");
  const out = await radarApi.explainRadarMatch("r1", "p 9");
  assert.equal(calls.length, 1);
  assert.equal(calls[0].init.method, "GET");
  assert.match(calls[0].url, /\/radar\/r1\/matches\/p%209\/explain$/);
  assert.deepEqual(out, EXPLICACAO);
});

test("m3 radar api: createRadar (POST) e updateRadar (PATCH) enviam obrigatórios, preferências, flexíveis e exclusões", async () => {
  const calls = stubApi({ id: "r1", criteriaJson: CRITERIOS, matches: [] });
  await radarApi.createRadar({ personId: "p1", status: "ACTIVE", criteriaJson: CRITERIOS });
  await radarApi.updateRadar("r1", { criteriaJson: CRITERIOS });
  assert.deepEqual(calls.map((c) => c.init.method), ["POST", "PATCH"]);
  for (const c of calls) assert.deepEqual(JSON.parse(c.init.body).criteriaJson, CRITERIOS);
});
