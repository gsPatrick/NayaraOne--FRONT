// M9-D852 — tela de erro com o traceId: código visível, botão Copiar código, texto para o suporte e nunca stack.
import { test } from "node:test";
import assert from "node:assert/strict";
import { html } from "./_loader/render.mjs";
import SupportCode from "@/components/molecules/SupportCode/SupportCode.js";
import AsyncState from "@/components/molecules/AsyncState/AsyncState.js";
import { UI_STATE } from "@/lib/asyncState/states.js";

const TRACE = "3f1c9a52-8d4e-4b7a-9c11-5a6f2b9e0d34";

test("m9d852 tela de erro mostra traceId e botão copiar", () => {
  const out = html(SupportCode, { traceId: TRACE });
  assert.match(out, new RegExp(TRACE));
  assert.match(out, /Copiar código/);
  assert.match(out, /Informe este código ao suporte/);
  assert.equal(html(SupportCode, { traceId: null }), "", "sem traceId não desenha nada");
});

test("m9d852 erro inesperado no AsyncState mostra a frase em português, o código e o botão, sem stack", () => {
  for (const status of [UI_STATE.RETRY, UI_STATE.ERROR]) {
    const out = html(AsyncState, { result: { status, traceId: TRACE, error: { message: "Algo deu errado." } }, children: () => "CONTEUDO" });
    assert.match(out, new RegExp(TRACE), status);
    assert.match(out, /Copiar código/, status);
    assert.match(out, /Informe este código ao suporte/, status);
    assert.doesNotMatch(out, /at \w+ \(|\.js:\d+|SELECT |stack/i, `${status}: nunca stack, SQL ou caminho`);
  }
});
