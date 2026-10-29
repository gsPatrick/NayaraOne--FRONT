"use client";

import HealthDashboard from "@/components/organisms/HealthDashboard/HealthDashboard";

// M9-D686 — Saúde Geral: o semáforo de cada área a partir dos alertas, da qualidade do dado e dos limites de cada KPI. Só desenha o que a API decidiu.
export default function SaudeGeralPage() {
  return <HealthDashboard />;
}
