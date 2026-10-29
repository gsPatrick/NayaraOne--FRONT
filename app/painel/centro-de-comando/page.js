"use client";

import { Suspense } from "react";
import { useSearchParams } from "next/navigation";
import AppShell from "@/components/organisms/AppShell/AppShell";
import CommandCenter from "@/components/organisms/CommandCenter/CommandCenter";

// M9-D685 — Centro de Comando da Diretoria. `?bloco=CHAVE` ("Ver todos") mostra aquele bloco por inteiro; `?alerta=` (link dos alertas) só leva até aqui.
function Content() {
  const params = useSearchParams();
  return <CommandCenter block={params.get("bloco")} />;
}

export default function CentroDeComandoPage() {
  return (
    <AppShell title="Centro de Comando">
      <Suspense fallback={null}>
        <Content />
      </Suspense>
    </AppShell>
  );
}
