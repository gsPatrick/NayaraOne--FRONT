"use client";

import { useMemo, useState } from "react";
import { useRouter, notFound } from "next/navigation";
import Link from "next/link";
import AppShell from "@/components/organisms/AppShell/AppShell";
import Card from "@/components/molecules/Card/Card";
import Button from "@/components/atoms/Button/Button";
import Badge from "@/components/atoms/Badge/Badge";
import Avatar from "@/components/atoms/Avatar/Avatar";
import Icon from "@/components/atoms/Icon/Icon";
import EmptyState from "@/components/molecules/EmptyState/EmptyState";
import { USERS, ROLE_TONE } from "@/lib/mock/users";
import { PROPERTIES } from "@/lib/mock/properties";
import { getUserAuditLog, ACTION_LABELS, ENTITY_TYPE_LABELS } from "@/lib/mock/auditLog";
import { formatDate, formatDateTime, formatBRL } from "@/lib/format";
import styles from "./page.module.css";

const STATUS_TONE = { Ativo: "success", Suspenso: "danger" };

const ACTION_ICON = {
  CREATE: "plus",
  UPDATE: "settings",
  DELETE: "trash",
  LOGIN: "logout",
  STATUS_CHANGE: "shield",
};

const ENTITY_HREF = {
  Property: (id) => `/painel/imoveis/${id}`,
  Person: (id) => `/painel/pessoas/${id}`,
  Company: (id) => `/painel/empresas/${id}`,
  PropertyRadar: (id) => `/painel/radar/${id}`,
};

export default function UserDetailPage({ params }) {
  const router = useRouter();
  const sourceUser = USERS.find((u) => u.id === params.id);
  const [status, setStatus] = useState(sourceUser?.status);

  const properties = useMemo(
    () => PROPERTIES.filter((p) => p.createdBy === params.id),
    [params.id]
  );
  const auditLog = useMemo(() => getUserAuditLog(params.id), [params.id]);

  if (!sourceUser) return notFound();
  const user = { ...sourceUser, status };

  function toggleStatus() {
    setStatus((prev) => (prev === "Ativo" ? "Suspenso" : "Ativo"));
  }

  return (
    <AppShell title={user.name} backHref="/painel/usuarios">
      <div className={styles.wrap}>
        <div className={styles.topRow}>
          <div className={styles.headerBlock}>
            <Avatar name={user.name} size="lg" />
            <div>
              <p className={styles.userName}>{user.name}</p>
              <p className={styles.userEmail}>{user.email}</p>
            </div>
          </div>
          <div className={styles.actions}>
            <Badge tone={STATUS_TONE[user.status]}>{user.status}</Badge>
            <Button variant="secondary" onClick={toggleStatus}>
              <Icon name={user.status === "Ativo" ? "ban" : "check"} size={16} />
              {user.status === "Ativo" ? "Suspender acesso" : "Reativar acesso"}
            </Button>
          </div>
        </div>

        <div className={styles.grid}>
          <div className={styles.mainCol}>
            <Card title="Imóveis cadastrados" subtitle={`${properties.length} imóve${properties.length === 1 ? "l" : "is"} criado${properties.length === 1 ? "" : "s"} por este usuário`} className={styles.section}>
              {properties.length === 0 ? (
                <EmptyState icon="building" title="Sem imóveis" description="Nenhum imóvel cadastrado por este usuário ainda." />
              ) : (
                <div className={styles.propertyList}>
                  {properties.map((p) => (
                    <Link href={`/painel/imoveis/${p.id}`} className={styles.propertyRow} key={p.id}>
                      <div className={styles.propertyIcon}>
                        <Icon name="building" size={18} />
                      </div>
                      <div className={styles.propertyInfo}>
                        <span className={styles.propertyName}>{p.name}</span>
                        <span className={styles.propertyMeta}>
                          {p.internalCode} · {p.city} · {p.areaM2} m²
                        </span>
                      </div>
                      <div className={styles.propertyPrice}>
                        {p.activeOffer ? formatBRL(p.activeOffer.askingPrice) : "—"}
                        {p.activeOffer?.offerType === "RENT" ? <span className={styles.propertyPriceSuffix}>/mês</span> : null}
                      </div>
                      <Icon name="chevronRight" size={16} className={styles.propertyArrow} />
                    </Link>
                  ))}
                </div>
              )}
            </Card>

            <Card title="Atividade & log" subtitle="Histórico de ações deste usuário no sistema" className={styles.section}>
              {auditLog.length === 0 ? (
                <EmptyState icon="document" title="Sem atividade" description="Nenhuma atividade registrada." />
              ) : (
                <div className={styles.timeline}>
                  {auditLog.map((entry) => {
                    const href = ENTITY_HREF[entry.entityType]?.(entry.entityId);
                    const entityLabel = ENTITY_TYPE_LABELS[entry.entityType] || entry.entityType;
                    return (
                      <div className={styles.timelineRow} key={entry.id}>
                        <span className={styles.timelineIcon}>
                          <Icon name={ACTION_ICON[entry.action] || "document"} size={14} />
                        </span>
                        <div className={styles.timelineContent}>
                          <p className={styles.timelineText}>
                            {ACTION_LABELS[entry.action] || entry.action}{" "}
                            {entry.entityType !== "User" ? (
                              <>
                                {entityLabel.toLowerCase()}{" "}
                                {href ? (
                                  <Link href={href} className={styles.timelineLink}>{entry.entityId}</Link>
                                ) : (
                                  <strong>{entry.entityId}</strong>
                                )}
                              </>
                            ) : null}
                          </p>
                          {entry.reason ? <p className={styles.timelineReason}>{entry.reason}</p> : null}
                          <p className={styles.timelineDate}>{formatDateTime(entry.occurredAt)}</p>
                        </div>
                      </div>
                    );
                  })}
                </div>
              )}
            </Card>
          </div>

          <div className={styles.sideCol}>
            <Card title="Resumo">
              <div className={styles.summaryRow}>
                <span className={styles.summaryLabel}>Status</span>
                <Badge tone={STATUS_TONE[user.status]}>{user.status}</Badge>
              </div>
              <div className={styles.summaryRow}>
                <span className={styles.summaryLabel}>Último acesso</span>
                <span className={styles.summaryValue}>{formatDateTime(user.lastAccessAt)}</span>
              </div>
              <div className={styles.summaryRow}>
                <span className={styles.summaryLabel}>Imóveis cadastrados</span>
                <span className={styles.summaryValue}>{properties.length}</span>
              </div>
              <div className={styles.summaryRow}>
                <span className={styles.summaryLabel}>Ações registradas</span>
                <span className={styles.summaryValue}>{auditLog.length}</span>
              </div>
            </Card>

            <Card title="Empresas, unidades & papéis">
              {user.memberships.length === 0 ? (
                <EmptyState icon="layers" title="Sem vínculos" description="Este usuário não está vinculado a nenhuma empresa." />
              ) : (
              <div className={styles.list}>
                {user.memberships.map((m) => (
                  <div className={styles.listRow} key={m.company}>
                    <span className={styles.listRowLeft}>
                      <Icon name="layers" size={14} />
                      <span className={styles.listRowText}>
                        <span className={styles.listRowCompany}>{m.company}</span>
                        <span className={styles.listRowUnit}>{m.unit || "Sem unidade — acesso a toda a empresa"}</span>
                      </span>
                    </span>
                    <Badge tone={ROLE_TONE[m.role] || "neutral"}>{m.role}</Badge>
                  </div>
                ))}
              </div>
              )}
            </Card>
          </div>
        </div>
      </div>
    </AppShell>
  );
}
