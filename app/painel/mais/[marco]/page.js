import { notFound } from "next/navigation";
import AppShell from "@/components/organisms/AppShell/AppShell";
import Badge from "@/components/atoms/Badge/Badge";
import Icon from "@/components/atoms/Icon/Icon";
import EmptyState from "@/components/molecules/EmptyState/EmptyState";
import { ROADMAP_MARCOS, ROADMAP_STATUS, ROADMAP_STATUS_LABEL, ROADMAP_STATUS_TONE, getMarcoBySlug } from "@/lib/mock/roadmap";
import styles from "./page.module.css";

const ACCENT_BY_STATUS = {
  [ROADMAP_STATUS.CONCLUIDO]: { accent: "var(--color-success)", soft: "var(--color-success-soft)" },
  [ROADMAP_STATUS.HOMOLOGACAO]: { accent: "var(--color-warning)", soft: "var(--color-warning-soft)" },
  [ROADMAP_STATUS.PLANEJADO]: { accent: "var(--color-ink-muted)", soft: "var(--color-canvas-sunken)" },
};

export function generateStaticParams() {
  return ROADMAP_MARCOS.map((marco) => ({ marco: marco.slug }));
}

export default function MarcoDetalhePage({ params }) {
  const marco = getMarcoBySlug(params.marco);
  if (!marco) notFound();

  const accent = ACCENT_BY_STATUS[marco.status];
  const accentStyle = { "--marco-accent": accent.accent, "--marco-accent-soft": accent.soft };

  return (
    <AppShell title={`Marco ${marco.numero}`} backHref="/painel/mais">
      <div className={styles.wrap}>
        <div className={styles.hero} style={accentStyle}>
          <span className={styles.heroNumero}>{String(marco.numero).padStart(2, "0")}</span>
          <div className={styles.heroBadgeRow}>
            <Badge tone={ROADMAP_STATUS_TONE[marco.status]}>{ROADMAP_STATUS_LABEL[marco.status]}</Badge>
          </div>
          <h2 className={styles.heroNome}>{marco.nome}</h2>
          <p className={styles.heroResumo}>{marco.resumo}</p>
        </div>

        {marco.entregas.length > 0 ? (
          <div className={styles.deliverySection} style={accentStyle}>
            <h3 className={styles.sectionTitle}>O que foi entregue</h3>
            <ul className={styles.entregas}>
              {marco.entregas.map((item) => (
                <li key={item}>
                  <span className={styles.checkIcon}>
                    <Icon name="check" size={13} />
                  </span>
                  <span>{item}</span>
                </li>
              ))}
            </ul>
          </div>
        ) : (
          <EmptyState
            title={marco.status === ROADMAP_STATUS.PLANEJADO ? "Marco ainda não iniciado" : "Sem itens registrados"}
            description="Este marco está planejado no contrato, mas seu desenvolvimento ainda não começou."
          />
        )}
      </div>
    </AppShell>
  );
}
