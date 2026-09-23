import { notFound } from "next/navigation";
import AppShell from "@/components/organisms/AppShell/AppShell";
import Card from "@/components/molecules/Card/Card";
import Badge from "@/components/atoms/Badge/Badge";
import EmptyState from "@/components/molecules/EmptyState/EmptyState";
import { ROADMAP_MARCOS, ROADMAP_STATUS, ROADMAP_STATUS_LABEL, ROADMAP_STATUS_TONE, getMarcoBySlug } from "@/lib/mock/roadmap";
import styles from "./page.module.css";

export function generateStaticParams() {
  return ROADMAP_MARCOS.map((marco) => ({ marco: marco.slug }));
}

export default function MarcoDetalhePage({ params }) {
  const marco = getMarcoBySlug(params.marco);
  if (!marco) notFound();

  return (
    <AppShell title={`Marco ${marco.numero}`} backHref="/painel/mais">
      <Card className={styles.card}>
        <div className={styles.header}>
          <span className={styles.numero}>Marco {marco.numero}</span>
          <Badge tone={ROADMAP_STATUS_TONE[marco.status]}>{ROADMAP_STATUS_LABEL[marco.status]}</Badge>
        </div>
        <h2 className={styles.nome}>{marco.nome}</h2>
        <p className={styles.resumo}>{marco.resumo}</p>

        {marco.entregas.length > 0 ? (
          <>
            <h3 className={styles.sectionTitle}>O que foi entregue</h3>
            <ul className={styles.entregas}>
              {marco.entregas.map((item) => (
                <li key={item}>{item}</li>
              ))}
            </ul>
          </>
        ) : (
          <EmptyState
            title={marco.status === ROADMAP_STATUS.PLANEJADO ? "Marco ainda não iniciado" : "Sem itens registrados"}
            description="Este marco está planejado no contrato, mas seu desenvolvimento ainda não começou."
          />
        )}
      </Card>
    </AppShell>
  );
}
