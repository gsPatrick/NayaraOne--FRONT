// Plano de gravação do bloco "Documentação" do imóvel (Marco 3 §6, verificação de 11/11/2026): o documento do imóvel é o
// ARQUIVO real (a API exige fileId e passa o arquivo pelo antivírus). Função pura, sem React nem rede: testável isoladamente.
import { toNumber } from "@/lib/format";

export const DOCUMENT_TYPE_LABELS = {
  IPTU: "IPTU",
  CONDO_FEE: "Condomínio",
  REGISTRY: "Matrícula",
  REGULARIZATION_CERTIFICATE: "Certidão de regularização",
};

const REGULARIZATION_TO_API = { Regularizado: "REGULARIZADO", "Em análise": "EM_ANALISE", Pendente: "PENDENTE" };

function payloadsFrom(docs) {
  const condo = docs.condoFee !== "" && docs.condoFee != null ? toNumber(docs.condoFee) : NaN;
  return {
    IPTU: docs.iptuNumber ? { documentType: "IPTU", valueNumber: String(docs.iptuNumber) } : null,
    CONDO_FEE: !Number.isNaN(condo) ? { documentType: "CONDO_FEE", valueAmount: condo } : null,
    REGISTRY: docs.registryNumber || docs.registryOffice
      ? { documentType: "REGISTRY", valueNumber: docs.registryNumber || null, label: docs.registryOffice || null }
      : null,
    REGULARIZATION_CERTIFICATE: REGULARIZATION_TO_API[docs.regularizationStatus]
      ? { documentType: "REGULARIZATION_CERTIFICATE", status: REGULARIZATION_TO_API[docs.regularizationStatus] }
      : null,
  };
}

const same = (a, b) => (a ?? null) === (b ?? null);
function samePayload(payload, row) {
  return same(payload.valueNumber, row.valueNumber || null)
    && same(payload.label, row.label || null)
    && same(payload.status, row.status || null)
    && (payload.valueAmount === undefined || Number(payload.valueAmount) === Number(row.valueAmount));
}

/**
 * docs: campos da tela; files: { TIPO: File } escolhidos agora; existing: documentos já gravados (mapDocument da API).
 * Devolve { rows: [{ type, payload, file|null, reuseFileId|null, replaceIds }], missingFiles: [{ type, label }] }.
 * - tipo sem dado e sem arquivo: não mexe no que existe;
 * - arquivo novo: grava com ele (e substitui a linha anterior do tipo);
 * - sem arquivo novo, mas o tipo já tem documento com arquivo: reaproveita o arquivo se o dado mudou; se não mudou, nada;
 * - dado sem arquivo nenhum: vai para missingFiles (a matrícula e o cartório também ficam no próprio imóvel, então só ela
 *   não exige arquivo).
 */
export function planDocumentation(docs, files = {}, existing = []) {
  const payloads = payloadsFrom(docs || {});
  const rows = [];
  const missingFiles = [];
  for (const type of Object.keys(DOCUMENT_TYPE_LABELS)) {
    const payload = payloads[type];
    const file = files[type] || null;
    const ofType = existing.filter((d) => d.documentType === type);
    const withFile = ofType.filter((d) => d.fileId).pop() || null;
    if (!payload && !file) continue;
    const finalPayload = payload || { documentType: type };
    if (file) {
      rows.push({ type, payload: finalPayload, file, reuseFileId: null, replaceIds: ofType.map((d) => d.id) });
    } else if (withFile) {
      if (!samePayload(finalPayload, withFile) || ofType.length > 1) {
        rows.push({ type, payload: finalPayload, file: null, reuseFileId: withFile.fileId, replaceIds: ofType.map((d) => d.id) });
      }
    } else if (type !== "REGISTRY") {
      missingFiles.push({ type, label: DOCUMENT_TYPE_LABELS[type] });
    }
  }
  return { rows, missingFiles };
}
