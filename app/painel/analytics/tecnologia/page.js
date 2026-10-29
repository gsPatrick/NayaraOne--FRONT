"use client";

import BiDashboard from "@/components/organisms/BiDashboard/BiDashboard";

// M9-D682 — painel Segurança/Integrações/IA do BI: disponibilidade, freshness, filas, quadro de integrações por fornecedor, ambiente e família, autenticação, bloqueios e a IA
// (custo, orçamento, qualidade e chamadas bloqueadas). Só administradores e diretoria técnica (analytics:read:tech); a tela só desenha o que a API devolveu.
export default function BiTecnologiaPage() {
  return <BiDashboard code="tech" title="Segurança, Integrações e IA (BI)" />;
}
