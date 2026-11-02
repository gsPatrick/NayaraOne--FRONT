// M9-D851 — contraste dos tokens de cor (WCAG 2.1 AA): texto normal >= 4,5:1, componentes e anel de foco >= 3:1, nos temas padrão e Onyx.
import { test } from "node:test";
import assert from "node:assert/strict";
import fs from "node:fs";
import { contrastRatio, readTokens, resolveToken, parseColor, MIN_TEXT, MIN_COMPONENT } from "@/lib/a11y/contrast.js";

const css = fs.readFileSync(new URL("../app/globals.css", import.meta.url), "utf8");
const light = readTokens(css, ":root");
const onyx = { ...light, ...readTokens(css, ':root[data-theme="onyx"]') };
const value = (tokens, name) => resolveToken(tokens, tokens[`--color-${name}`] ?? tokens[`--${name}`]);

// [texto, fundo, mínimo, descrição]
const TEXT_PAIRS = [
  ["ink", "canvas"], ["ink", "canvas-raised"], ["ink", "canvas-sunken"],
  ["ink-soft", "canvas"], ["ink-soft", "canvas-sunken"],
  ["ink-muted", "canvas"], ["ink-muted", "canvas-sunken"],
  ["brand-active", "canvas"], ["brand-active", "brand-soft"],
  ["brand-text", "canvas"], ["brand-text", "canvas-sunken"], ["ink-muted", "warning-soft"], ["sidebar-label-admin", "sidebar-bg"],
  ["success", "canvas"], ["success", "success-soft"],
  ["warning", "canvas"], ["warning", "warning-soft"],
  ["danger", "canvas"], ["danger", "danger-soft"],
  ["info", "canvas"], ["info", "info-soft"],
  ["text-inverse", "accent"], ["text-inverse", "danger"], ["text-inverse", "success"],
  ["cta-primary-ink", "cta-primary"], ["cta-primary-ink", "cta-primary-hover"], ["cta-primary-ink-active", "cta-primary-active"],
  ["sidebar-ink", "sidebar-bg"], ["sidebar-ink-soft", "sidebar-bg"], ["sidebar-ink-muted", "sidebar-bg"],
  ["sidebar-item-active-ink", "sidebar-item-active-bg"],
];

for (const [name, tokens] of [["tema padrão", light], ["tema Onyx", onyx]]) {
  test(`m9d851 contraste dos tokens de cor >= 4,5:1 (${name})`, () => {
    const failures = [];
    for (const [fg, bg] of TEXT_PAIRS) {
      const canvas = value(tokens, "canvas");
      const background = bg.startsWith("sidebar") || bg.startsWith("cta") ? value(tokens, bg) : value(tokens, bg);
      const ratio = contrastRatio(value(tokens, fg), background, bg.startsWith("sidebar") ? value(tokens, "sidebar-bg") : canvas);
      if (ratio < MIN_TEXT) failures.push(`${fg} sobre ${bg}: ${ratio.toFixed(2)}:1`);
    }
    assert.deepEqual(failures, [], "pares de texto abaixo de 4,5:1");
  });
}

test("m9d851 componentes de interface e anel de foco >= 3:1", () => {
  for (const [name, tokens] of [["padrão", light], ["Onyx", onyx]]) {
    const canvas = value(tokens, "canvas");
    assert.ok(contrastRatio(value(tokens, "control-border"), canvas) >= MIN_COMPONENT, `borda de campo (${name})`);
    assert.ok(contrastRatio(value(tokens, "control-border"), value(tokens, "canvas-sunken")) >= MIN_COMPONENT, `borda de campo sobre fundo rebaixado (${name})`);
    assert.ok(contrastRatio(value(tokens, "focus-ring"), canvas) >= MIN_COMPONENT, `anel de foco (${name})`);
    assert.ok(contrastRatio(value(tokens, "sidebar-ink"), value(tokens, "sidebar-bg")) >= MIN_COMPONENT, `anel de foco da sidebar (${name}): a sidebar o troca pela cor do próprio texto`);
  }
  assert.equal(light["--focus-ring-width"], "2px", "contorno de pelo menos 2 px");
  assert.ok(parseInt(light["--focus-ring-width"], 10) >= 2);
});

test("m9d851 a regra de foco global usa o token --focus-ring e a sidebar o redefine", () => {
  assert.match(css, /outline:\s*var\(--focus-ring-width\)\s+solid\s+var\(--focus-ring\)/);
  const sidebar = fs.readFileSync(new URL("../components/organisms/AppSidebar/AppSidebar.module.css", import.meta.url), "utf8");
  assert.match(sidebar, /--focus-ring:\s*var\(--color-sidebar-ink\)/);
  for (const file of ["atoms/Input/Input", "atoms/Select/Select", "atoms/OtpInput/OtpInput", "atoms/Checkbox/Checkbox", "atoms/Radio/Radio"]) {
    const text = fs.readFileSync(new URL(`../components/${file}.module.css`, import.meta.url), "utf8");
    assert.match(text, /var\(--focus-ring\)/, `${file} usa o anel de foco`);
  }
});

test("m9d851 exemplo do livro: #777 sobre branco reprova (4,48:1) e #757575 passa (4,6:1)", () => {
  assert.ok(Math.abs(contrastRatio("#777777", "#ffffff") - 4.48) < 0.01);
  assert.ok(contrastRatio("#777777", "#ffffff") < MIN_TEXT);
  assert.ok(Math.abs(contrastRatio("#757575", "#ffffff") - 4.6) < 0.05);
  assert.ok(contrastRatio("#757575", "#ffffff") >= MIN_TEXT);
  assert.deepEqual(parseColor("rgba(190, 145, 48, 0.12)"), { r: 190, g: 145, b: 48, a: 0.12 });
});
