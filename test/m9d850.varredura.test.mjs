// M9-D850 — varredura de app/painel: nenhuma tela troca falha por lista vazia; a linha de base só desce; o teste estrito "todas usam AsyncState" (critério 3) segue pendente e visível.
import { test } from "node:test";
import assert from "node:assert/strict";
import { createRequire } from "node:module";
import fs from "node:fs";
const require = createRequire(import.meta.url);
const { scan, swallowsIn } = require("../scripts/asyncStateSweep.js");
const baseline = JSON.parse(fs.readFileSync(new URL("../scripts/asyncstate-baseline.json", import.meta.url), "utf8"));

test("m9d850 nenhuma tela trata catch com lista vazia e a linha de base só desce (tela nova nasce no padrão)", () => {
  const { swallows, screens } = scan();
  assert.deepEqual(swallows, [], "catch que troca a falha por vazio sem avisar (o livro proíbe)");
  const outside = screens.filter((screen) => !screen.adopted).map((screen) => screen.file).sort();
  const unexpected = outside.filter((file) => !baseline.telas.includes(file));
  assert.deepEqual(unexpected, [], "tela nova ou alterada fora do padrão: use useAsyncState + AsyncState");
  const stale = baseline.telas.filter((file) => !outside.includes(file));
  assert.deepEqual(stale, [], "tela já migrada ainda listada na linha de base (a lista só desce)");
  assert.ok(screens.length - outside.length >= 3, "as telas migradas usam o padrão");
  // Registro de cobertura (saída da varredura): telas fora do padrão = o que resta na linha de base.
  console.log(`# cobertura M9-D850: ${screens.length - outside.length} de ${screens.length} telas no padrão; fora do padrão: ${outside.length}`);
});

// Critério 3 da demanda: ZERO telas fora do padrão. A linha de base esconde o resto no teste acima, por isso este teste não a consulta. Fica como `todo` (o runner o
// lista como pendente sem derrubar o CI) até a migração das telas da linha de base terminar; quando ela esvaziar, trocar `todo` por teste normal.
test("m9d850 todas as telas de app/painel que carregam dados usam AsyncState (sem linha de base)", { todo: "migrar as telas listadas em scripts/asyncstate-baseline.json" }, () => {
  const outside = scan().screens.filter((screen) => !screen.adopted).map((screen) => screen.file).sort();
  assert.deepEqual(outside, [], "telas de app/painel fora do padrão de estados");
});

test("m9d850 a varredura reconhece as formas que escondem falha e aceita as que avisam", () => {
  const bad = [
    "api().catch(() => []);",
    "api().catch(() => null);",
    "api().then(setX).catch(() => {});",
    "api().catch(() => setLista([]));",
    "try { x } catch (e) { setLista([]); }",
    "try { x } catch { return []; }",
  ];
  for (const code of bad) assert.equal(swallowsIn(code).length, 1, code);
  const good = [
    'api().catch(lookupFallback("os imóveis"));',
    "api().catch((error) => { reportLookupProblem('x', error); setLista([]); });",
    "api().catch((err) => setLoadError(err.message));",
    "try { x } catch (err) { setError(err.message); setLista([]); }",
    "try { x } catch (err) { if (err.status === 404) return null; throw err; }",
    "logout().catch(() => {});",
  ];
  for (const code of good) assert.equal(swallowsIn(code).length, 0, code);
});
