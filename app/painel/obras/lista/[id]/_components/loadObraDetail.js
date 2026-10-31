// Leitura da visão geral da obra (M9-D850): devolve tudo que a tela precisa numa chamada só, para o useAsyncState.
// Falha de qualquer leitura obrigatória sobe como erro (a tela mostra 403, offline ou "tentar de novo"); só o centro de custo é opcional.
import { getProject, listProjectStages, listDailyReports, listBudgetLines, listBudgets, listChangeOrders } from "@/lib/api/construction";
import { listProperties } from "@/lib/api/properties";
import { listCostCenters } from "@/lib/api/finance";
import { apiFetch } from "@/lib/api/client";
import { lookupFallback } from "@/lib/asyncState/lookup";

export async function loadObraDetail(id) {
  const [project, properties, users, costCenters] = await Promise.all([
    getProject(id).catch((err) => {
      if (err?.status === 404) return null;
      throw err;
    }),
    listProperties(),
    apiFetch("/users?status=ACTIVE"),
    // Centro de custo é opcional: sem finance:read a falha é registrada (aviso no topo) e a página abre.
    listCostCenters().catch(lookupFallback("os centros de custo")),
  ]);
  if (!project) return { notFound: true };
  const [stages, reports, budgetLines, changeOrders, budgets] = await Promise.all([
    listProjectStages(project.id),
    listDailyReports(project.id),
    listBudgetLines(project.id),
    listChangeOrders(project.id),
    listBudgets(project.id),
  ]);
  return {
    project,
    properties: properties || [],
    users: users || [],
    costCenters: costCenters || [],
    stages: stages || [],
    reportsCount: (reports || []).length,
    budgetLinesCount: (budgetLines || []).length,
    changeOrdersCount: (changeOrders || []).length,
    budgetApproved: ((budgets || [])[0]?.status) === "APPROVED",
  };
}
