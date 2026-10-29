// Roda o axe-core (regras estruturais) sobre o HTML renderizado de uma página ou componente, em jsdom.
// Contraste não roda aqui (jsdom não calcula estilo): é conferido por test/m9d851.contraste.test.mjs sobre os tokens.
import { JSDOM, VirtualConsole } from "jsdom";
import axe from "axe-core";
import { createElement } from "react";
import { html } from "./render.mjs";

export async function runAxe(Component, props = {}, { rules = {}, wrap = true } = {}) {
  const markup = html(Component, props);
  const virtualConsole = new VirtualConsole(); // o jsdom não implementa canvas: o aviso é ruído
  const dom = new JSDOM(wrap ? `<!doctype html><html lang="pt-BR"><head><title>Teste</title></head><body>${markup}</body></html>` : markup, { runScripts: "outside-only", pretendToBeVisual: true, virtualConsole });
  dom.window.eval(axe.source);
  const results = await dom.window.axe.run(dom.window.document, { rules: { "color-contrast": { enabled: false }, region: { enabled: false }, ...rules }, resultTypes: ["violations"] });
  dom.window.close();
  // JSON: os resultados nascem no "realm" do jsdom; a cópia deixa as listas comparáveis com as do Node.
  return { markup, violations: JSON.parse(JSON.stringify(results.violations.map((v) => ({ id: v.id, impact: v.impact, nodes: v.nodes.map((n) => n.target.join(" ")), help: v.help })))) };
}

export const serious = (violations) => violations.filter((v) => v.impact === "serious" || v.impact === "critical");

/** Página do painel com os provedores do layout (empresa ativa). */
export async function withPainelProviders(Page) {
  const { CompanyProvider } = await import("@/lib/context/CompanyContext.js");
  return function PainelPage(props) { return createElement(CompanyProvider, null, createElement(Page, props)); };
}
