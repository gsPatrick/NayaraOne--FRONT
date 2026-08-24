"use client";

import { useEffect, useMemo, useState } from "react";
import Link from "next/link";
import AppShell from "@/components/organisms/AppShell/AppShell";
import Card from "@/components/molecules/Card/Card";
import Button from "@/components/atoms/Button/Button";
import Badge from "@/components/atoms/Badge/Badge";
import Avatar from "@/components/atoms/Avatar/Avatar";
import Icon from "@/components/atoms/Icon/Icon";
import Select from "@/components/atoms/Select/Select";
import Spinner from "@/components/atoms/Spinner/Spinner";
import Alert from "@/components/molecules/Alert/Alert";
import EmptyState from "@/components/molecules/EmptyState/EmptyState";
import { apiFetch } from "@/lib/api/client";
import { listProperties } from "@/lib/api/properties";
import { listRoles } from "@/lib/api/roles";
import { formatDateTime, formatBRL } from "@/lib/format";
import styles from "./page.module.css";

const STATUS_TONE = { ACTIVE: "success", SUSPENDED: "danger" };
const STATUS_LABEL = { ACTIVE: "Ativo", SUSPENDED: "Suspenso" };

export default function UserDetailPage({ params }) {
  const [user, setUser] = useState(null);
  const [memberships, setMemberships] = useState([]);
  const [roles, setRoles] = useState([]);
  const [properties, setProperties] = useState([]);
  const [loading, setLoading] = useState(true);
  const [loadError, setLoadError] = useState("");
  const [actionError, setActionError] = useState("");
  const [togglingStatus, setTogglingStatus] = useState(false);

  const [selectedRoleId, setSelectedRoleId] = useState("");
  const [assigning, setAssigning] = useState(false);
  const [revokingId, setRevokingId] = useState(null);

  function loadAll() {
    setLoading(true);
    setLoadError("");
    return Promise.all([
      apiFetch(`/users/${params.id}`),
      apiFetch(`/memberships?userId=${params.id}`),
      listRoles(),
      listProperties().catch(() => []),
    ])
      .then(([apiUser, apiMemberships, apiRoles, apiProperties]) => {
        setUser(apiUser);
        setMemberships(apiMemberships);
        setRoles(apiRoles);
        setProperties(apiProperties.filter((p) => p.createdBy === params.id));
        setSelectedRoleId(apiRoles[0]?.id || "");
      })
      .catch((err) => setLoadError(err?.message || "Não foi possível carregar o usuário."))
      .finally(() => setLoading(false));
  }

  useEffect(() => {
    loadAll();
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [params.id]);

  const activeMemberships = useMemo(
    () => memberships.filter((m) => m.status !== "REVOKED"),
    [memberships]
  );

  async function toggleStatus() {
    setTogglingStatus(true);
    setActionError("");
    const nextStatus = user.status === "ACTIVE" ? "SUSPENDED" : "ACTIVE";
    try {
      const updated = await apiFetch(`/users/${params.id}`, { method: "PATCH", body: { status: nextStatus } });
      setUser(updated);
    } catch (err) {
      setActionError(err?.message || "Não foi possível alterar o status do usuário.");
    } finally {
      setTogglingStatus(false);
    }
  }

  async function handleAssignRole() {
    if (!selectedRoleId) return;
    setAssigning(true);
    setActionError("");
    try {
      await apiFetch("/memberships", { method: "POST", body: { userId: params.id, roleId: selectedRoleId } });
      await loadAll();
    } catch (err) {
      setActionError(err?.message || "Não foi possível vincular o papel.");
    } finally {
      setAssigning(false);
    }
  }

  async function handleRevoke(membershipId) {
    setRevokingId(membershipId);
    setActionError("");
    try {
      await apiFetch(`/memberships/${membershipId}`, { method: "DELETE" });
      await loadAll();
    } catch (err) {
      setActionError(err?.message || "Não foi possível revogar o vínculo.");
    } finally {
      setRevokingId(null);
    }
  }

  if (loading) {
    return (
      <AppShell title="Carregando usuário..." backHref="/painel/usuarios">
        <div className={styles.wrap}>
          <Spinner size="lg" />
        </div>
      </AppShell>
    );
  }

  if (loadError || !user) {
    return (
      <AppShell title="Usuário" backHref="/painel/usuarios">
        <div className={styles.wrap}>
          <Alert tone="danger" title="Não foi possível carregar o usuário">{loadError || "Usuário não encontrado."}</Alert>
        </div>
      </AppShell>
    );
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
            <Badge tone={STATUS_TONE[user.status] || "neutral"}>{STATUS_LABEL[user.status] || user.status}</Badge>
            <Button variant="secondary" onClick={toggleStatus} loading={togglingStatus}>
              <Icon name={user.status === "ACTIVE" ? "ban" : "check"} size={16} />
              {user.status === "ACTIVE" ? "Suspender acesso" : "Reativar acesso"}
            </Button>
          </div>
        </div>

        {actionError ? <Alert tone="danger">{actionError}</Alert> : null}

        <div className={styles.grid}>
          <div className={styles.mainCol}>
            <Card
              title="Imóveis cadastrados"
              subtitle={`${properties.length} imóve${properties.length === 1 ? "l" : "is"} criado${properties.length === 1 ? "" : "s"} por este usuário`}
              className={styles.section}
            >
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

            <Card
              title="Atividade & log"
              subtitle="Histórico de ações deste usuário no sistema"
              className={styles.section}
            >
              <EmptyState
                icon="document"
                title="Log de auditoria ainda não exposto pela API"
                description="A API já registra auditoria internamente, mas ainda não existe um endpoint de consulta por usuário — assim que existir, este card passa a listar o histórico real."
              />
            </Card>
          </div>

          <div className={styles.sideCol}>
            <Card title="Resumo">
              <div className={styles.summaryRow}>
                <span className={styles.summaryLabel}>Status</span>
                <Badge tone={STATUS_TONE[user.status] || "neutral"}>{STATUS_LABEL[user.status] || user.status}</Badge>
              </div>
              <div className={styles.summaryRow}>
                <span className={styles.summaryLabel}>Último acesso</span>
                <span className={styles.summaryValue}>{user.lastLoginAt ? formatDateTime(user.lastLoginAt) : "Nunca"}</span>
              </div>
              <div className={styles.summaryRow}>
                <span className={styles.summaryLabel}>Imóveis cadastrados</span>
                <span className={styles.summaryValue}>{properties.length}</span>
              </div>
            </Card>

            <Card title="Empresas & papéis">
              {activeMemberships.length === 0 ? (
                <EmptyState icon="layers" title="Sem vínculos" description="Este usuário não está vinculado a nenhuma empresa/papel ainda." />
              ) : (
                <div className={styles.list}>
                  {activeMemberships.map((m) => (
                    <div className={styles.listRow} key={m.id}>
                      <span className={styles.listRowLeft}>
                        <Icon name="layers" size={14} />
                        <span className={styles.listRowText}>
                          <span className={styles.listRowCompany}>{m.company?.name || "—"}</span>
                          <span className={styles.listRowUnit}>{m.unit?.name || "Sem unidade — acesso a toda a empresa"}</span>
                        </span>
                      </span>
                      <Badge tone="info">{m.role?.name || "Sem papel"}</Badge>
                      <button
                        type="button"
                        className={styles.revokeBtn}
                        title="Revogar vínculo"
                        aria-label="Revogar vínculo"
                        onClick={() => handleRevoke(m.id)}
                        disabled={revokingId === m.id}
                      >
                        <Icon name="trash" size={14} />
                      </button>
                    </div>
                  ))}
                </div>
              )}

              {roles.length > 0 ? (
                <div className={styles.assignRow}>
                  <Select value={selectedRoleId} onChange={(e) => setSelectedRoleId(e.target.value)}>
                    {roles.map((role) => (
                      <option key={role.id} value={role.id}>{role.name}</option>
                    ))}
                  </Select>
                  <Button size="sm" onClick={handleAssignRole} loading={assigning}>
                    <Icon name="plus" size={14} /> Vincular papel
                  </Button>
                </div>
              ) : (
                <p className={styles.noRolesNote}>
                  Nenhum papel cadastrado ainda — crie um em{" "}
                  <Link href="/painel/papeis/novo">Papéis & Permissões</Link>.
                </p>
              )}
            </Card>
          </div>
        </div>
      </div>
    </AppShell>
  );
}
