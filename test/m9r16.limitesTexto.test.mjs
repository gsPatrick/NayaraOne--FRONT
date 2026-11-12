// DI-M9R-16 (verificação do Marco 9, rodada 6) — tamanho máximo do texto livre das mensagens: parâmetros editáveis na aba "Registro de integrações".
import { test } from "node:test";
import assert from "node:assert/strict";
import { MENSAGERIA_GROUPS } from "@/app/painel/configuracoes/integracoesMensageriaGroups.js";

const campos = Object.fromEntries(MENSAGERIA_GROUPS.flatMap((g) => g.fields).map((f) => [f.key, f]));

// Padrão e faixa de cada parâmetro: os mesmos da API (whatsapp.settings.js, messaging.settings.js) e de Maturacao/demandas/parametros.csv.
const ESPERADO = {
  "integration.whatsapp.max_text_chars": { padrao: 4096, faixa: "De 1 a 4096" },
  "integration.whatsapp.max_caption_chars": { padrao: 1024, faixa: "De 1 a 1024" },
  "integration.whatsapp.max_template_var_chars": { padrao: 1024, faixa: "De 1 a 32768" },
  "integration.messaging.record_body_max_chars": { padrao: 65536, faixa: "De 1 a 1048576" },
};

test("m9r16 os quatro limites de texto aparecem na tela, inteiros, com o padrão e a faixa da API", () => {
  for (const [chave, { padrao, faixa }] of Object.entries(ESPERADO)) {
    const campo = campos[chave];
    assert.ok(campo, `${chave} na tela de configurações`);
    assert.equal(campo.type, "integer", chave);
    assert.equal(campo.defaultValue, padrao, chave);
    assert.ok(campo.helper.startsWith(faixa), `${chave}: a ajuda começa pela faixa aceita (${faixa})`);
    assert.match(campo.label, /\(caracteres\)$/, `${chave}: o rótulo diz a unidade`);
  }
});

test("m9r16 os limites do envio ficam no grupo do WhatsApp e o do registro manual no grupo da mensageria", () => {
  const grupoDe = (chave) => MENSAGERIA_GROUPS.find((g) => g.fields.some((f) => f.key === chave)).title;
  assert.match(grupoDe("integration.whatsapp.max_text_chars"), /^WhatsApp/);
  assert.match(grupoDe("integration.whatsapp.max_caption_chars"), /^WhatsApp/);
  assert.match(grupoDe("integration.whatsapp.max_template_var_chars"), /^WhatsApp/);
  assert.match(grupoDe("integration.messaging.record_body_max_chars"), /^Mensageria/);
});
