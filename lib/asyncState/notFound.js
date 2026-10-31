// 404 da API em tela de detalhe (M9-D850): o registro não existe, então a tela chama notFound(); qualquer outra falha segue para o padrão de estados.
// Uso: getX(id).catch(nullOn404) -> null quando 404, relança o resto.
export function nullOn404(error) {
  if (error && error.status === 404) return null;
  throw error;
}
