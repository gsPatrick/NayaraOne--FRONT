import Link from "next/link";
import AppShell from "@/components/organisms/AppShell/AppShell";
import Card from "@/components/molecules/Card/Card";
import Badge from "@/components/atoms/Badge/Badge";
import Icon from "@/components/atoms/Icon/Icon";
import LogoutButton from "@/components/molecules/LogoutButton/LogoutButton";
import { ROADMAP_MARCOS, ROADMAP_STATUS_LABEL, ROADMAP_STATUS_TONE } from "@/lib/mock/roadmap";
import styles from "./page.module.css";

export default function MaisPage() {
  return (
    <AppShell title="Marcos do projeto">
      <p className={styles.intro}>
        Acompanhe o progresso do Nayara One por marco contratual: o que já foi entregue e o que
        ainda está planejado.
      </p>

      <ul className={styles.roadmapList}>
        {ROADMAP_MARCOS.map((marco) => (
          <li key={marco.slug}>
            <Link href={`/painel/mais/${marco.slug}`} className={styles.roadmapLink}>
              <Card className={styles.roadmapCard}>
                <div className={styles.roadmapHeader}>
                  <span className={styles.roadmapNumero}>Marco {marco.numero}</span>
                  <Badge tone={ROADMAP_STATUS_TONE[marco.status]}>
                    {ROADMAP_STATUS_LABEL[marco.status]}
                  </Badge>
                </div>
                <h3 className={styles.roadmapNome}>{marco.nome}</h3>
                <p className={styles.roadmapResumo}>{marco.resumo}</p>
                <span className={styles.roadmapArrow}>
                  Ver detalhes
                  <Icon name="chevronRight" size={16} />
                </span>
              </Card>
            </Link>
          </li>
        ))}
      </ul>

      <ul className={styles.list}>
        <li>
          <LogoutButton className={[styles.item, styles.logout].join(" ")}>
            <span className={styles.itemIcon}>
              <Icon name="logout" size={18} />
            </span>
            <span className={styles.itemLabel}>Sair</span>
          </LogoutButton>
        </li>
      </ul>
    </AppShell>
  );
}
