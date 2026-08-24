import Avatar from "@/components/atoms/Avatar/Avatar";
import Icon from "@/components/atoms/Icon/Icon";
import { formatDate, isOverdue } from "@/lib/format";
import styles from "./OpportunityCard.module.css";

const CLOSED_STAGES = ["Fechado (Ganho)", "Fechado (Perdido)"];

export default function OpportunityCard({ opportunity, onClick }) {
  const isClosed = CLOSED_STAGES.includes(opportunity.stage);
  const overdue = !isClosed && isOverdue(opportunity.nextActionDueAt);

  return (
    <div
      role="button"
      tabIndex={0}
      className={styles.card}
      onClick={() => onClick?.(opportunity)}
      onKeyDown={(e) => {
        if (e.key === "Enter" || e.key === " ") {
          e.preventDefault();
          onClick?.(opportunity);
        }
      }}
    >
      <div className={styles.top}>
        <div>
          <p className={styles.person}>{opportunity.personName}</p>
          <p className={styles.property}>
            <Icon name="building" size={12} />
            {opportunity.propertyName}
          </p>
        </div>
      </div>

      {!isClosed ? (
        <div className={[styles.nextAction, overdue ? styles.overdue : ""].join(" ")}>
          <span className={styles.nextActionLabel}>Próxima ação</span>
          <span className={styles.nextActionText}>{opportunity.nextAction}</span>
          <span className={styles.nextActionDue}>
            <Icon name="calendar" size={12} />
            {formatDate(opportunity.nextActionDueAt)}
            {overdue ? " · vencida" : ""}
          </span>
        </div>
      ) : null}

      <div className={styles.footer}>
        <span className={styles.rep}>
          <Avatar name={opportunity.repName} size="sm" />
          {opportunity.repName}
        </span>
      </div>
    </div>
  );
}
