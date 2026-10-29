// M9-D850 — varredura de app/painel: nenhuma tela troca falha por lista vazia e toda tela de dados usa o padrão de estados (com linha de base que só desce).
import { test } from "node:test";
import assert from "node:assert/strict";
import { createRequire } from "node:module";
import fs from "node:fs";
const require = createRequire(import.meta.url);
const { scan, swallowsIn } = require("../scripts/asyncStateSweep.js");
const baseline = JSON.parse(fs.readFileSync(new URL("../scripts/asyncstate-baseline.json", import.meta.url), "utf8"));

test("m9d850 nenhuma tela de lista trata catch com lista vazia e todas usam AsyncState", () => {
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
