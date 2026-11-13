"use client";

import Link from "next/link";
import { contractUrlForOpportunity } from "@/lib/crm/journeyLinks";
import styles from "./page.module.css";

// Próximo passo da jornada (M3-25): oportunidade em contrato ou ganha abre o novo contrato já ligado a ela e ao imóvel de interesse.
const STAGES_WITH_CONTRACT = ["contract", "ganho"];

export default function OpportunityJourneyLinks({ opportunity }) {
  if (!opportunity || !STAGES_WITH_CONTRACT.includes(opportunity.stage)) return null;
  return (
    <p className={styles.detailMeta}>
      <Link href={contractUrlForOpportunity(opportunity)} data-testid="crm-criar-contrato">Criar contrato desta oportunidade</Link>
    </p>
  );
}
