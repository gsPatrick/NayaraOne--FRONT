// Liberação das chaves (Caderno M5 §10): o que falta no pedido antes de mandar para a API. A API é a fonte da regra (quantidade e
// identificação obrigatórias, via assinada do termo, fotos mínimas da política da empresa); a tela só antecipa para não enviar um
// pedido que seria recusado.
import { toNumber } from "@/lib/format";

/** Mesma foto escolhida duas vezes conta uma vez só (a API conta fotos diferentes). */
export function distinctFiles(files) {
  const seen = new Set();
  return (files || []).filter((file) => {
    const key = `${file.name}|${file.size}|${file.lastModified}`;
    if (seen.has(key)) return false;
    seen.add(key);
    return true;
  });
}

/** Mínimo de fotos pedido pela política da prévia do termo (0 quando a política não exige). */
export function minPhotosOf(preview) {
  if (!preview || !preview.photosRequired) return 0;
  const min = Number(preview.minPhotos);
  return Number.isInteger(min) && min > 0 ? min : 1;
}

/** Frase da exigência de fotos ("mínimo de 2 fotos"). */
export function minPhotosText(min) {
  return `mínimo de ${min} ${min === 1 ? "foto" : "fotos"}`;
}

/**
 * Pendências do pedido de liberação, em português. Lista vazia = pode enviar.
 * @param {{ keysCount: string, keysIdentification: string, hasTermFile: boolean, photoCount: number, minPhotos: number }} input
 */
export function keyReleaseProblems({ keysCount, keysIdentification, hasTermFile, photoCount, minPhotos }) {
  const problems = [];
  const count = toNumber(keysCount);
  if (!Number.isInteger(count) || count <= 0) problems.push("Informe a quantidade de chaves e controles (número inteiro maior que zero).");
  if (!String(keysIdentification || "").trim()) problems.push("Informe a identificação das chaves e controles entregues.");
  if (!hasTermFile) problems.push("Anexe a via do termo assinada pelo recebedor.");
  if (minPhotos > 0 && (photoCount || 0) < minPhotos) {
    problems.push(`Anexe pelo menos ${minPhotos} ${minPhotos === 1 ? "foto diferente" : "fotos diferentes"} do imóvel (anexadas: ${photoCount || 0}).`);
  }
  return problems;
}
