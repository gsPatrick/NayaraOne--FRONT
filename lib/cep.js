// Integração real (não mockada) com a BrasilAPI para autocomplete de endereço a partir do CEP.
// Assunção sobre o formato de resposta da BrasilAPI v2 (GET /api/cep/v2/{cep}):
//   { cep, state, city, neighborhood, street, service, location: { type, coordinates: { longitude, latitude } } }
// Ou seja, as partes de endereço (street/neighborhood/city/state) vêm nas chaves de topo — apenas as
// coordenadas ficam aninhadas em `location.coordinates`. Caso a API mude esse contrato, os campos abaixo
// simplesmente virão undefined e o autofill não terá efeito (nunca lança exceção).

/**
 * Busca um endereço a partir de um CEP usando a BrasilAPI.
 * Nunca lança: em qualquer falha (CEP inválido, não encontrado, rede fora do ar,
 * resposta não-OK, JSON inválido) retorna null para o chamador tratar como
 * "não encontrado / preencher manualmente".
 *
 * @param {string} cep
 * @returns {Promise<{ street: string, neighborhood: string, city: string, state: string } | null>}
 */
export async function fetchAddressByCep(cep) {
  const digits = String(cep || "").replace(/\D/g, "");
  if (digits.length !== 8) return null;

  try {
    const response = await fetch(`https://brasilapi.com.br/api/cep/v2/${digits}`);
    if (!response.ok) return null;

    const data = await response.json();
    if (!data || typeof data !== "object") return null;

    return {
      street: data.street || "",
      neighborhood: data.neighborhood || "",
      city: data.city || "",
      state: data.state || "",
    };
  } catch {
    return null;
  }
}
