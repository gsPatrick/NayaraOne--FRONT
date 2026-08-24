// Integração real (não mockada) com a BrasilAPI para autocomplete de dados de empresa a partir do CNPJ.
// Assunção sobre o formato de resposta da BrasilAPI (GET /api/cnpj/v1/{cnpj}):
//   { razao_social, nome_fantasia, cnpj, descricao_situacao_cadastral, ... }
// Caso a API mude esse contrato, os campos abaixo simplesmente virão undefined e o autofill não
// terá efeito (nunca lança exceção).

/**
 * Busca dados de uma empresa a partir do CNPJ usando a BrasilAPI.
 * Nunca lança: em qualquer falha (CNPJ inválido, não encontrado, rede fora do ar,
 * resposta não-OK, JSON inválido) retorna null para o chamador tratar como
 * "não encontrado / preencher manualmente".
 *
 * @param {string} cnpj
 * @returns {Promise<{ legalName: string, name: string, active: boolean } | null>}
 */
export async function fetchCompanyByCnpj(cnpj) {
  const digits = String(cnpj || "").replace(/\D/g, "");
  if (digits.length !== 14) return null;

  try {
    const response = await fetch(`https://brasilapi.com.br/api/cnpj/v1/${digits}`);
    if (!response.ok) return null;

    const data = await response.json();
    if (!data || typeof data !== "object") return null;

    return {
      legalName: data.razao_social || "",
      name: data.nome_fantasia || "",
      active: (data.descricao_situacao_cadastral || "").toUpperCase() === "ATIVA",
    };
  } catch {
    return null;
  }
}
