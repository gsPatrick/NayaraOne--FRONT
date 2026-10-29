// M9-D634 — rótulo legível de uma linha de barras ou tabela do painel de BI. O servidor manda `label` (o código sem sublinhado); aqui entram só as
// traduções que o Front já conhece (estágios do funil, motivos de perda) e o nome do usuário quando a linha é um corretor.
import { STAGE_LABELS_PT, LOST_REASON_LABELS } from "@/lib/api/crm";

const GROUP_LABELS = {
  estagio: (id) => STAGE_LABELS_PT[String(id).toUpperCase()] || null,
  motivo: (id) => LOST_REASON_LABELS[String(id).toUpperCase()] || (id === "NAO_INFORMADO" ? "Sem motivo" : null),
  origem: (id) => (id === "NAO_INFORMADA" ? "Não informada" : null),
};

const SHORT_ID = /^[0-9a-f]{8}-[0-9a-f]{4}-/i;

const projectName = (id, projects) => projects[id] || (SHORT_ID.test(id) ? `Obra ${id.slice(0, 8)}` : null);

/**
 * item = { id, label }; group = prefixo do grupo (`config.group`); users = { [id]: nome } já conhecido (pode estar vazio); projects = { [id]: nome da obra }.
 * Linha de widget com vários grupos (M9-D654) traz `group`, `groupLabel` e `rawId`: a obra aparece pelo nome ("Obra: Residencial Aurora").
 */
export function itemLabel(item, group, labelKind, users = {}, projects = {}) {
  if (item.group === "obra") return `${item.groupLabel}: ${projectName(item.rawId, projects) || item.label.replace(/^[^:]*: /, "")}`;
  if (labelKind === "PROJECT") return projectName(item.id, projects) || item.label;
  if (labelKind === "USER") {
    if (users[item.id]) return users[item.id];
    if (item.id === "SEM_CORRETOR" || item.id === "sem_corretor") return "Sem corretor";
    return SHORT_ID.test(item.id) ? `Corretor ${item.id.slice(0, 8)}` : item.label;
  }
  const translate = GROUP_LABELS[group];
  return (translate && translate(item.id)) || item.label;
}
