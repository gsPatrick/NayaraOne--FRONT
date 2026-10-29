// Origem e comprovante de alteração de campo crítico (M9-D807). Pessoas, imóveis, fornecedores e contas bancárias exigem, ao mudar um
// campo crítico (CPF/CNPJ, nome, nascimento, matrícula, proprietário, conta e PIX), `changeEvidence` no corpo do PATCH. A lista de campos
// críticos é do administrador (Configurações > Governança): quem decide se a evidência é exigida é a API, que responde 422 com a mensagem.
import { uploadFile } from "@/lib/api/legal";

export const EVIDENCE_SOURCE_LABELS = {
  DOCUMENT: "Documento",
  PERSON_STATEMENT: "Declaração da pessoa",
  OFFICIAL_REGISTRY: "Registro oficial",
  OTHER: "Outra origem",
};

// Estas origens exigem o arquivo do comprovante (a API confere); as duas últimas exigem a descrição.
export const EVIDENCE_FILE_SOURCES = ["DOCUMENT", "OFFICIAL_REGISTRY"];
export const EVIDENCE_NOTE_SOURCES = ["OTHER", "PERSON_STATEMENT"];

export const EMPTY_EVIDENCE = { source: "", note: "", file: null };

// Cada arquivo escolhido é enviado uma única vez, mesmo que o salvamento seja tentado de novo depois de um erro.
const uploaded = new WeakMap();

// Converte o estado do formulário no `changeEvidence` da API (envia o arquivo antes). Sem origem escolhida devolve undefined.
export async function buildChangeEvidence(value) {
  if (!value || !value.source) return undefined;
  const evidence = { source: value.source };
  if (value.file) {
    if (!uploaded.has(value.file)) uploaded.set(value.file, (await uploadFile(value.file)).id);
    evidence.evidenceFileId = uploaded.get(value.file);
  }
  const note = String(value.note || "").trim();
  if (note) evidence.note = note;
  return evidence;
}
