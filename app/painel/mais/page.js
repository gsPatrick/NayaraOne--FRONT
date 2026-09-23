import Link from "next/link";
import AppShell from "@/components/organisms/AppShell/AppShell";
import Badge from "@/components/atoms/Badge/Badge";
import Icon from "@/components/atoms/Icon/Icon";
import { ROADMAP_MARCOS, ROADMAP_STATUS, ROADMAP_STATUS_LABEL, ROADMAP_STATUS_TONE } from "@/lib/mock/roadmap";
import styles from "./page.module.css";

// Cor de destaque de cada banner segue o status do marco — mesma paleta semântica usada no
// resto do sistema (verde=concluído, âmbar=em homologação, neutro=planejado).
const ACCENT_BY_STATUS = {
  [ROADMAP_STATUS.CONCLUIDO]: { accent: "var(--color-success)", soft: "var(--color-success-soft)" },
  [ROADMAP_STATUS.HOMOLOGACAO]: { accent: "var(--color-warning)", soft: "var(--color-warning-soft)" },
  [ROADMAP_STATUS.PLANEJADO]: { accent: "var(--color-ink-muted)", soft: "var(--color-canvas-sunken)" },
};

export default function MaisPage() {
  return (
    <AppShell title="Marcos do projeto">
      <div className={styles.wrap}>
        <p className={styles.intro}>
          Acompanhe o progresso do Nayara One por marco contratual: o que já foi entregue e o que
          ainda está planejado.
        </p>

        <ul className={styles.roadmapList}>
          {ROADMAP_MARCOS.map((marco) => {
            const accent = ACCENT_BY_STATUS[marco.status];
            return (
              <li key={marco.slug}>
                <Link href={`/painel/mais/${marco.slug}`} className={styles.roadmapLink}>
                  <div
                    className={styles.banner}
                    style={{ "--marco-accent": accent.accent, "--marco-accent-soft": accent.soft }}
                  >
                    <span className={styles.numero}>{String(marco.numero).padStart(2, "0")}</span>
                    <div className={styles.body}>
                      <div className={styles.bodyHeader}>
                        <span className={styles.categoria}>Marco {marco.numero}</span>
                        <Badge tone={ROADMAP_STATUS_TONE[marco.status]}>
                          {ROADMAP_STATUS_LABEL[marco.status]}
                        </Badge>
                      </div>
                      <h3 className={styles.nome}>{marco.nome}</h3>
                      <p className={styles.resumo}>{marco.resumo}</p>
                    </div>
                    <span className={styles.arrow}>
                      <Icon name="chevronRight" size={18} />
                    </span>
                  </div>
                </Link>
              </li>
            );
          })}
        </ul>
      </div>
    </AppShell>
  );
}
