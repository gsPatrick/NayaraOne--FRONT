// Texto da ficha sobre a leitura automática de um documento de Pessoa (CAD-05, DI-M3PE-6): classificação (como o tipo foi decidido, e a
// pendência quando o conteúdo contradiz o tipo informado ou não dá para decidir) e os motores usados (laboratório ou indisponível).
const METODOS = {
  DECLARADO: "tipo informado no envio",
  NOME_DO_ARQUIVO: "tipo identificado pelo nome do arquivo",
  CONTEUDO: "tipo identificado pelo conteúdo do documento",
  NAO_CLASSIFICADO: "tipo não identificado",
};

export function textoClassificacao(extractedData) {
  const c = extractedData?.classification;
  if (!c) return "";
  const partes = [`Classificação: ${METODOS[c.metodo] || "tipo informado"}.`];
  if (c.pendencia) partes.push(c.pendencia);
  return partes.join(" ");
}

export function textoMotores(extractedData) {
  const m = extractedData?.engines;
  if (!m) return "";
  if (m.leitura === "INDISPONIVEL") return "Leitura automática indisponível neste servidor: confira os dados no documento original.";
  if (m.antivirus === "LABORATORIO" || m.leitura === "LABORATORIO") return "Atenção: lido com os motores de laboratório (ambiente de teste).";
  return "";
}
