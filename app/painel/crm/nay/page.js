"use client";

// NAY Comercial (Marco 3 §12 e §16): o agente de IA do CRM só resume e sugere. Nada nesta tela cria, altera, envia ou publica: toda ação
// continua nas telas do CRM, com o corretor. Toda resposta mostra o texto, as fontes e a data do dado.

import { useState } from "react";
import AppShell from "@/components/organisms/AppShell/AppShell";
import Alert from "@/components/molecules/Alert/Alert";
import StickyActionBar from "@/components/organisms/StickyActionBar/StickyActionBar";
import CrmNavMenu from "@/components/molecules/CrmNavMenu/CrmNavMenu";
import AsyncState from "@/components/molecules/AsyncState/AsyncState";
import { useAsyncState } from "@/lib/asyncState/useAsyncState";
import { lookupFallback } from "@/lib/asyncState/lookup";
import { listOpportunities } from "@/lib/api/crm";
import { listPeople } from "@/lib/api/people";
import { listProperties } from "@/lib/api/properties";
import { STAGES } from "@/lib/mock/opportunities";
import OportunidadeSection from "./OportunidadeSection";
import MensagensSection from "./MensagensSection";
import LeadsSection from "./LeadsSection";
import RecomendacoesSection from "./RecomendacoesSection";
import DescricaoImovelSection from "./DescricaoImovelSection";
import styles from "./page.module.css";

function stageLabel(stageKey) {
  return STAGES.find((s) => s.key === stageKey)?.label || "Outra etapa";
}

export default function NayComercialPage() {
  const [opportunityId, setOpportunityId] = useState("");

  // Oportunidades são a base da tela; contatos (nomes) e imóveis são listas de apoio: a falha delas é avisada, nunca vira lista vazia calada.
  const query = useAsyncState(
    async () => {
      const [opportunities, people, properties] = await Promise.all([
        listOpportunities(),
        listPeople().catch(lookupFallback("os contatos")),
        listProperties().catch(lookupFallback("os imóveis")),
      ]);
      return { opportunities, people: people || [], properties: properties || [] };
    },
    { isEmpty: () => false }
  );

  return (
    <AppShell title="NAY Comercial" subtitle="CRM">
      <div className={styles.intro}>
        <Alert tone="info" title="A NAY só resume e sugere">
          Ela não cria tarefa, não muda etapa, não envia mensagem e não publica anúncio. Toda resposta mostra de onde veio a informação e a data do dado.
        </Alert>
      </div>

      <AsyncState result={query} loadingLabel="Carregando a carteira...">
        {(data) => {
          const people = data?.people || [];
          const nameOf = (personId) => people.find((p) => p.id === personId)?.legalName || "Cliente sem nome";
          const opportunityLabel = (o) => `${nameOf(o.personId)} · ${stageLabel(o.stage)}`;
          return (
            <div className={styles.stack}>
              <OportunidadeSection
                opportunities={data?.opportunities || []}
                opportunityId={opportunityId}
                onSelect={setOpportunityId}
                opportunityLabel={opportunityLabel}
              />
              <MensagensSection key={opportunityId || "nenhuma"} opportunityId={opportunityId} />
              <LeadsSection />
              <RecomendacoesSection />
              <DescricaoImovelSection properties={data?.properties || []} />
            </div>
          );
        }}
      </AsyncState>

      <StickyActionBar>
        <CrmNavMenu />
      </StickyActionBar>
    </AppShell>
  );
}
