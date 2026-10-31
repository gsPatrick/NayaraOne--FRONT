// M9-D850 — a varredura só via o import do AsyncState; este teste roda o no-undef do ESLint em app/painel, components e lib:
// variável usada sem existir (ex.: setLoadError removido na migração) quebra em tempo de execução, não de build.
import { test } from "node:test";
import assert from "node:assert/strict";
import { createRequire } from "node:module";
const require = createRequire(import.meta.url);
const { ESLint } = require("eslint");

test("m9d850 nenhum identificador indefinido em app/painel, components e lib (no-undef)", async () => {
  const eslint = new ESLint({
    useEslintrc: false,
    baseConfig: {
      parserOptions: { ecmaVersion: 2023, sourceType: "module", ecmaFeatures: { jsx: true } },
      env: { browser: true, node: true, es2023: true },
      rules: { "no-undef": "error" },
    },
  });
  const results = await eslint.lintFiles(["app/painel/**/*.js", "components/**/*.js", "lib/**/*.js"]);
  const problems = results.flatMap((r) => r.messages.filter((m) => m.ruleId === "no-undef" || m.fatal).map((m) => `${r.filePath.split("NayaraOne--FRONT/")[1] || r.filePath}:${m.line} ${m.message}`));
  assert.deepEqual(problems, []);
});
