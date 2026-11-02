// M9-D850 (reabertura C6) — a decisão de permissão não espera a carga dos dados: no padrão compartilhado (useAsyncState + AsyncState),
// perfil sem a permissão renderiza "sem permissão" de imediato, sem passar pelo estado de carregamento e sem chamar a API.
import { test } from "node:test";
import assert from "node:assert/strict";
import { createElement } from "react";
import { html } from "./_loader/render.mjs";
import AsyncState from "@/components/molecules/AsyncState/AsyncState.js";
import { useAsyncState } from "@/lib/asyncState/useAsyncState.js";
import { accessStatus, deniedResult } from "@/lib/asyncState/access.js";
import { UI_STATE } from "@/lib/asyncState/states.js";

const semDicas = (out) => out.replace(/ (title|data-[a-z-]+|class|id|aria-[a-z]+)="[^"]*"/g, "");

function makeScreen(calls) {
  return function Tela({ permission, permissions }) {
    const result = useAsyncState(async () => { calls.push(1); return [{ id: 1 }]; }, { permission, permissions });
    return createElement(AsyncState, { result }, "CONTEUDO");
  };
}

test("m9d850 acesso: accessStatus aceita uma permissão ou uma lista (qualquer uma libera)", () => {
  assert.equal(accessStatus("analytics:read", ["analytics:read"]), "allowed");
  assert.equal(accessStatus(["finance:read", "analytics:read"], ["analytics:read"]), "allowed");
  assert.equal(accessStatus(["finance:read", "analytics:read"], ["people:read"]), "denied");
  assert.equal(accessStatus(null, []), "allowed");
  assert.equal(accessStatus([], []), "allowed");
  assert.equal(deniedResult(["finance:read", "analytics:read"]).status, UI_STATE.PERMISSION_DENIED);
});

test("m9d850 acesso: sem a permissão o primeiro render já é PERMISSION_DENIED, sem carregando e sem conteúdo", () => {
  const calls = [];
  const out = html(makeScreen(calls), { permission: "analytics:read", permissions: ["finance:read"] });
  assert.match(out, /data-ui-state="PERMISSION_DENIED"/);
  assert.match(semDicas(out), /Falta a permissão Painéis de BI: leitura\./);
  assert.doesNotMatch(out, /data-ui-state="LOADING"|aria-busy|role="status"|Carregando/i, "nunca passa pelo estado de carregamento");
  assert.doesNotMatch(out, /CONTEUDO/);
  assert.equal(calls.length, 0, "a API não é chamada");
});

test("m9d850 acesso: com a permissão o fluxo normal segue (carregando até o dado chegar)", () => {
  const out = html(makeScreen([]), { permission: "analytics:read", permissions: ["analytics:read"] });
  assert.match(out, /data-ui-state="LOADING"/);
  assert.doesNotMatch(out, /PERMISSION_DENIED/);
});

test("m9d850 acesso: sem exigência de permissão o comportamento antigo não muda", () => {
  const out = html(makeScreen([]), { permissions: [] });
  assert.match(out, /data-ui-state="LOADING"/);
});
