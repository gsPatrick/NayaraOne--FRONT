"use client";

// Verificação independente do Marco 6 (M6-17/M6-82/M6-42), Guia §3 "Nunca UPDATE no baseline aprovado": cada Change
// Order aprovado vira uma revisão nova do orçamento (append-only). A baseline aprovada continua a original; o total
// vigente é a baseline mais os aditivos aprovados.
import Card from "@/components/molecules/Card/Card";
import Table from "@/components/organisms/Table/Table";
import AsyncState from "@/components/molecules/AsyncState/AsyncState";
import { useAsyncState } from "@/lib/asyncState/useAsyncState";
import { listBudgetRevisions } from "@/lib/api/constructionConfig";
import { formatBRL, formatDateTime } from "@/lib/format";

export default function BudgetRevisionsCard({ projectId, baselineAmount, refreshKey = 0 }) {
  const query = useAsyncState(() => listBudgetRevisions(projectId), { key: `obra-revisoes-${projectId}-${refreshKey}`, deps: [projectId, refreshKey], isEmpty: () => false });
  return (
    <AsyncState result={query}>
      {(rows) => {
        const list = rows || [];
        const current = list.length ? list[list.length - 1].newTotal : baselineAmount;
        return (
          <Card
            title="Revisões do orçamento"
            subtitle={`Baseline aprovada ${baselineAmount != null ? formatBRL(baselineAmount) : "—"} (não muda) · total vigente ${current != null ? formatBRL(current) : "—"}`}
          >
            <Table
              columns={[
                { key: "n", label: "Revisão" },
                { key: "co", label: "Change Order" },
                { key: "prev", label: "Total anterior" },
                { key: "impact", label: "Aditivo" },
                { key: "next", label: "Total novo" },
                { key: "at", label: "Aprovada em" },
              ]}
              rows={list.map((r) => ({
                id: r.id,
                n: `Rev. ${r.revisionNumber}`,
                co: r.changeOrder ? r.changeOrder.reasonCode : "Correção de dados",
                prev: formatBRL(r.previousTotal),
                impact: formatBRL(r.budgetImpact),
                next: formatBRL(r.newTotal),
                at: formatDateTime(r.createdAt),
              }))}
              emptyMessage="Nenhum Change Order aprovado: o orçamento vigente é a baseline aprovada."
            />
          </Card>
        );
      }}
    </AsyncState>
  );
}
