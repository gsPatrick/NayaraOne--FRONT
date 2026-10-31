// Busca a obra da rota: 404 vira null (a tela mostra "não encontrada"); qualquer outra falha sobe para o padrão de estados (403, offline, tentar de novo).
import { getProject } from "@/lib/api/construction";

export function getProjectOrNull(id) {
  return getProject(id).catch((err) => {
    if (err?.status === 404) return null;
    throw err;
  });
}
