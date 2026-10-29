"use client";

import BiDashboard from "@/components/organisms/BiDashboard/BiDashboard";

// M9-D626 — painel Financeiro do BI: faixa de qualidade, caixa livre, dinheiro de terceiros, necessidade para respirar, contas a pagar e a receber em 7, 30 e 60 dias,
// inadimplência, margem por setor, comissões, repasses, conciliações e anomalias, com o seletor Empresa/Grupo.
export default function BiFinanceiroPage() {
  return <BiDashboard code="finance" title="Financeiro (BI)" />;
}
