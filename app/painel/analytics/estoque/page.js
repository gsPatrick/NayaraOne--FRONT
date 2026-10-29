"use client";

import BiDashboard from "@/components/organisms/BiDashboard/BiDashboard";

// M9-D654 — painel Estoque/Patrimônio (BI): valor em estoque, itens abaixo do mínimo, perdas e ferramentas em atraso.
export default function BiEstoquePage() {
  return <BiDashboard code="inventory" title="Estoque/Patrimônio (BI)" />;
}
