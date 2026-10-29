// M9-D851 — axe-core (regras estruturais) nas telas-chave de e2e/a11y-pages.json, sem navegador; o contraste fica no teste dos tokens.
import { test } from "node:test";
import assert from "node:assert/strict";
import fs from "node:fs";
import { createElement } from "react";
import { runAxe, serious, withPainelProviders } from "./_loader/axe.mjs";
import RowActions from "@/components/molecules/RowActions/RowActions.js";
import Modal from "@/components/organisms/Modal/Modal.js";
import AsyncState from "@/components/molecules/AsyncState/AsyncState.js";
import FileDropInput from "@/components/molecules/FileDropInput/FileDropInput.js";

const pages = JSON.parse(fs.readFileSync(new URL("../e2e/a11y-pages.json", import.meta.url), "utf8")).paginas;
const report = [];

test("m9d851 axe sem violações serious ou critical nas telas-chave", async () => {
  assert.ok(pages.length >= 4 && pages.some((p) => p.path === "/entrar") && pages.some((p) => p.path === "/painel/pessoas/novo"));
  for (const page of pages) {
    const loaded = await import(`@/${page.module}`);
    const Component = page.painel ? await withPainelProviders(loaded.default) : loaded.default;
    const { violations } = await runAxe(Component);
    report.push({ pagina: page.nome, path: page.path, violacoes: violations.map((v) => ({ regra: v.id, impacto: v.impact, onde: v.nodes })) });
    const bad = serious(violations);
    assert.deepEqual(bad, [], `GOV_A11Y_VIOLATION: Violação de acessibilidade: ${bad.map((v) => v.id).join(", ")} em ${page.nome}.`);
    assert.deepEqual(violations.filter((v) => v.id === "label" || v.id === "button-name"), [], `GOV_A11Y_LABEL_MISSING: campo ou botão sem nome em ${page.nome}`);
  }
  console.log(`# relatório axe: ${JSON.stringify(report)}`);
});

test("m9d851 todo botão de ícone tem nome acessível", async () => {
  const withNames = await runAxe(RowActions, { onView: () => {}, onEdit: () => {}, onDelete: () => {} });
  assert.deepEqual(withNames.violations.filter((v) => v.id === "button-name"), []);
  assert.equal((withNames.markup.match(/<button/g) || []).length, 3);
  assert.equal((withNames.markup.match(/aria-label="(Ver detalhes|Editar|Excluir)"/g) || []).length, 3);
  // Controle negativo: o axe de fato reprova o botão de lixeira sem nome (button-name, crítico).
  const Broken = () => createElement("button", { type: "button" }, createElement("svg", { width: 16, height: 16 }));
  const broken = await runAxe(Broken);
  assert.ok(broken.violations.some((v) => v.id === "button-name" && v.impact === "critical"), "violação button-name");
  const unlabeled = await runAxe(() => createElement("input", { type: "text", name: "cpf" }));
  assert.ok(unlabeled.violations.some((v) => v.id === "label"), "campo sem rótulo reprova");
  const modal = await runAxe(Modal, { open: true, title: "Excluir papel", onClose: () => {}, children: createElement("p", null, "Confirma?") });
  assert.deepEqual(serious(modal.violations), [], "modal aberto: role=dialog com nome e botão Fechar com nome");
  const drop = await runAxe(FileDropInput, { id: "arquivo", accept: "image/*", onFiles: () => {}, uploading: false });
  assert.deepEqual(serious(drop.violations), [], "campo de arquivo escondido tem nome");
});

test("m9d851 os sete estados de UI não trazem violação serious ou critical", async () => {
  const error = (status, extra = {}) => Object.assign(new Error("x"), { status, ...extra });
  const states = [
    { status: "LOADING", data: null },
    { status: "EMPTY", data: [] },
    { status: "PERMISSION_DENIED", error: error(403, { details: { required: "legal:read" } }) },
    { status: "OFFLINE", error: error(0), data: [1], stale: true },
    { status: "RETRY", error: error(500, { traceId: "t-1" }) },
    { status: "VALIDATION_ERROR", error: error(422, { message: "Dados inválidos", details: { problems: [{ field: "email", reason: "Informe um e-mail válido" }] } }) },
    { status: "SUCCESS", message: "Contrato criado." },
  ];
  for (const result of states) {
    const { violations } = await runAxe(AsyncState, { result, children: () => "conteudo" });
    assert.deepEqual(serious(violations), [], result.status);
  }
});
