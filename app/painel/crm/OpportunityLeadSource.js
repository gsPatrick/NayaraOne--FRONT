import { leadSourceLabel } from "@/lib/labels/leadSource";
import styles from "./page.module.css";

// Origem do lead no detalhe da oportunidade (M9:610, M9:784; DI-BI2-4): gravada na criação, só leitura (a edição não a muda).
// Rótulo em português; oportunidade antiga sem origem mostra "Origem não informada", nunca o código cru.
export default function OpportunityLeadSource({ opportunity }) {
  if (!opportunity) return null;
  return (
    <p className={styles.detailMeta} data-testid="crm-origem-lead">
      Origem do lead: {leadSourceLabel(opportunity.leadSource)}
    </p>
  );
}
