"use client";

import { useEffect, useRef, useState } from "react";
import { useRouter, notFound } from "next/navigation";
import Link from "next/link";
import AppShell from "@/components/organisms/AppShell/AppShell";
import Button from "@/components/atoms/Button/Button";
import Badge from "@/components/atoms/Badge/Badge";
import Avatar from "@/components/atoms/Avatar/Avatar";
import Icon from "@/components/atoms/Icon/Icon";
import Card from "@/components/molecules/Card/Card";
import Input from "@/components/atoms/Input/Input";
import FormField from "@/components/molecules/FormField/FormField";
import Modal from "@/components/organisms/Modal/Modal";
import Table from "@/components/organisms/Table/Table";
import Tabs from "@/components/molecules/Tabs/Tabs";
import Alert from "@/components/molecules/Alert/Alert";
import EmptyState from "@/components/molecules/EmptyState/EmptyState";
import { SkeletonDetail } from "@/components/molecules/SkeletonPatterns/SkeletonPatterns";
import { COMPANY_STATUS_LABELS, UNIT_STATUS_LABELS } from "@/lib/mock/companies";
import { ROLE_TONE } from "@/lib/mock/users";
import { AVAILABILITY_STATUS_LABELS } from "@/lib/mock/properties";
import { apiFetch } from "@/lib/api/client";
import { listProperties } from "@/lib/api/properties";
import { formatDate, formatBRL } from "@/lib/format";
import styles from "./page.module.css";

const GRADIENTS = [
  "linear-gradient(135deg, #3a2f1c 0%, #b8873a 100%)",
  "linear-gradient(135deg, #1c2a3a 0%, #3a6ab8 100%)",
  "linear-gradient(135deg, #2a1c3a 0%, #8a3ab8 100%)",
  "linear-gradient(135deg, #1c3a2a 0%, #3ab86a 100%)",
];

function hashCode(str = "") {
  let hash = 0;
  for (let i = 0; i < str.length; i += 1) hash = (hash << 5) - hash + str.charCodeAt(i);
  return hash;
}

const STATUS_TONE = { Ativo: "success", Suspenso: "danger" };

function toDisplayStatus(apiStatus) {
  return apiStatus === "ACTIVE" ? "Ativo" : "Suspenso";
}

export default function CompanyDetailPage({ params }) {
  const router = useRouter();
  const [company, setCompany] = useState(null);
  const [units, setUnits] = useState([]);
  const [companyUsers, setCompanyUsers] = useState([]);
  const [companyProperties, setCompanyProperties] = useState([]);
  const [loading, setLoading] = useState(true);
  const [loadError, setLoadError] = useState("");
  const [notFoundFlag, setNotFoundFlag] = useState(false);
  const [deleteOpen, setDeleteOpen] = useState(false);
  const [deleting, setDeleting] = useState(false);
  const [addingUnit, setAddingUnit] = useState(false);
  const [savingUnit, setSavingUnit] = useState(false);
  const [newUnit, setNewUnit] = useState({ name: "", code: "" });
  const [expandedUnitId, setExpandedUnitId] = useState(null);
  const carouselRef = useRef(null);

  function loadAll() {
    let cancelled = false;
    setLoading(true);
    setLoadError("");
    Promise.all([
      apiFetch(`/companies/${params.id}`),
      apiFetch("/units"),
      apiFetch("/users"),
      apiFetch("/memberships"),
      listProperties(),
    ])
      .then(([apiCompany, apiUnits, apiUsers, apiMemberships, properties]) => {
        if (cancelled) return;
        setCompany({
          ...apiCompany,
          createdAt: apiCompany.createdAt || apiCompany.created_at,
        });
        setUnits((apiUnits || []).filter((u) => u.companyId === params.id));

        const usersForThisCompany = (apiUsers || [])
          .map((u) => ({
            id: u.id,
            name: u.name,
            email: u.email,
            status: toDisplayStatus(u.status),
            memberships: (apiMemberships || [])
              .filter((m) => m.userId === u.id)
              .map((m) => ({
                companyId: m.companyId,
                unitId: m.unitId,
                unit: m.unit?.name || null,
                role: m.role?.name || "Sem papel",
              })),
          }))
          .filter((u) => u.memberships.some((m) => m.companyId === params.id));
        setCompanyUsers(usersForThisCompany);

        setCompanyProperties((properties || []).filter((p) => p.companyId === params.id));
      })
      .catch((err) => {
        if (cancelled) return;
        if (err?.status === 404) {
          setNotFoundFlag(true);
        } else {
          setLoadError(err?.message || "Não foi possível carregar a empresa.");
        }
      })
      .finally(() => {
        if (!cancelled) setLoading(false);
      });
    return () => {
      cancelled = true;
    };
  }

  useEffect(loadAll, [params.id]);

  if (notFoundFlag) return notFound();

  if (loading) {
    return (
      <AppShell title="Empresa" backHref="/painel/empresas">
        <SkeletonDetail />
      </AppShell>
    );
  }

  if (loadError || !company) {
    return (
      <AppShell title="Empresa" backHref="/painel/empresas">
        <Alert tone="danger" title="Não foi possível carregar a empresa">{loadError}</Alert>
      </AppShell>
    );
  }

  function usersForUnit(unitId) {
    return companyUsers.filter((u) => u.memberships.some((m) => m.unitId === unitId));
  }

  const activeUnits = units.filter((u) => u.status === "ACTIVE").length;

  async function handleDelete() {
    setDeleting(true);
    try {
      await apiFetch(`/companies/${params.id}`, { method: "DELETE" });
      router.push("/painel/empresas");
    } catch (err) {
      setDeleting(false);
      setDeleteOpen(false);
      setLoadError(err?.message || "Não foi possível excluir a empresa.");
    }
  }

  const propertyColumns = [
    {
      key: "name",
      label: "Imóvel",
      render: (row) => (
        <Link href={`/painel/imoveis/${row.id}`} className={styles.tableNameCell}>
          <span className={styles.tableNameMain}>{row.name}</span>
          <span className={styles.tableNameSub}>{row.internalCode}</span>
        </Link>
      ),
    },
    { key: "city", label: "Cidade" },
    { key: "type", label: "Tipo" },
    {
      key: "price",
      label: "Preço",
      render: (row) => (row.activeOffer ? `${formatBRL(row.activeOffer.askingPrice)}${row.activeOffer.offerType === "RENT" ? "/mês" : ""}` : "—"),
    },
    {
      key: "availabilityStatus",
      label: "Status",
      render: (row) => <Badge tone={row.availabilityStatus === "AVAILABLE" ? "success" : row.availabilityStatus === "RENTED" || row.availabilityStatus === "SOLD" ? "info" : "neutral"}>{AVAILABILITY_STATUS_LABELS[row.availabilityStatus] || row.availabilityStatus}</Badge>,
    },
  ];

  const userColumns = [
    {
      key: "name",
      label: "Usuário",
      render: (row) => (
        <Link href={`/painel/usuarios/${row.id}`} className={styles.tableNameCell}>
          <Avatar name={row.name} size="sm" />
          <span className={styles.tableUserText}>
            <span className={styles.tableNameMain}>{row.name}</span>
            <span className={styles.tableNameSub}>{row.email}</span>
          </span>
        </Link>
      ),
    },
    {
      key: "unit",
      label: "Unidade",
      render: (row) => row.memberships.find((m) => m.companyId === params.id)?.unit || "Sem unidade",
    },
    {
      key: "role",
      label: "Papel",
      render: (row) => {
        const membership = row.memberships.find((m) => m.companyId === params.id);
        return <Badge tone={ROLE_TONE[membership?.role] || "neutral"}>{membership?.role}</Badge>;
      },
    },
    {
      key: "status",
      label: "Status",
      render: (row) => <Badge tone={STATUS_TONE[row.status]}>{row.status}</Badge>,
    },
  ];

  async function handleAddUnit(event) {
    event.preventDefault();
    if (!newUnit.name.trim()) return;
    setSavingUnit(true);
    try {
      await apiFetch("/units", {
        method: "POST",
        body: { companyId: params.id, name: newUnit.name.trim(), code: newUnit.code.trim() || undefined },
      });
      setNewUnit({ name: "", code: "" });
      setAddingUnit(false);
      loadAll();
    } catch (err) {
      setLoadError(err?.message || "Não foi possível adicionar a unidade.");
    } finally {
      setSavingUnit(false);
    }
  }

  function scrollCarousel(direction) {
    const el = carouselRef.current;
    if (!el) return;
    el.scrollBy({ left: direction * 460, behavior: "smooth" });
  }

  return (
    <AppShell title={company.name} backHref="/painel/empresas">
      <div className={styles.wrap}>
        {loadError ? <Alert tone="danger" title="Ocorreu um erro">{loadError}</Alert> : null}
        <div className={styles.topRow}>
          <div className={styles.headerBlock}>
            <span className={styles.companyIcon}>
              <Icon name="layers" size={22} />
            </span>
            <div>
              <p className={styles.companyName}>{company.name}</p>
              <p className={styles.companyLegalName}>{company.legalName}</p>
            </div>
          </div>
          <div className={styles.actions}>
            <Badge tone={company.status === "ACTIVE" ? "success" : "neutral"}>{COMPANY_STATUS_LABELS[company.status] || company.status}</Badge>
            <Button variant="danger" onClick={() => setDeleteOpen(true)}>
              <Icon name="trash" size={16} /> Excluir empresa
            </Button>
          </div>
        </div>

        <div className={styles.grid}>
        <Card title="Dados da empresa" className={styles.section}>
          <div className={styles.infoGrid}>
            <div>
              <p className={styles.infoLabel}>Nome fantasia</p>
              <p className={styles.infoValue}>{company.name}</p>
            </div>
            <div>
              <p className={styles.infoLabel}>Razão social</p>
              <p className={styles.infoValue}>{company.legalName}</p>
            </div>
            <div>
              <p className={styles.infoLabel}>CNPJ</p>
              <p className={styles.infoValue}>{company.taxId || "—"}</p>
            </div>
            <div>
              <p className={styles.infoLabel}>Status</p>
              <p className={styles.infoValue}>
                <Badge tone={company.status === "ACTIVE" ? "success" : "neutral"}>{COMPANY_STATUS_LABELS[company.status] || company.status}</Badge>
              </p>
            </div>
            <div>
              <p className={styles.infoLabel}>Grupo</p>
              <p className={styles.infoValue}>Grupo Nayara</p>
            </div>
            <div>
              <p className={styles.infoLabel}>Cadastrada em</p>
              <p className={styles.infoValue}>{formatDate(company.createdAt)}</p>
            </div>
          </div>

          <div className={styles.statsRow}>
            <Link href="/painel/imoveis" className={styles.statCard}>
              <Icon name="building" size={18} />
              <div>
                <p className={styles.statValue}>{companyProperties.length}</p>
                <p className={styles.statLabel}>Imóve{companyProperties.length === 1 ? "l" : "is"}</p>
              </div>
            </Link>
            <Link href="/painel/usuarios" className={styles.statCard}>
              <Icon name="users" size={18} />
              <div>
                <p className={styles.statValue}>{companyUsers.length}</p>
                <p className={styles.statLabel}>Usuário{companyUsers.length === 1 ? "" : "s"}</p>
              </div>
            </Link>
            <div className={styles.statCard}>
              <Icon name="layers" size={18} />
              <div>
                <p className={styles.statValue}>{activeUnits}/{units.length}</p>
                <p className={styles.statLabel}>Unidades ativas</p>
              </div>
            </div>
          </div>
        </Card>

        <Card title="Unidades" className={styles.section}>
          <div className={styles.unitsList}>
            {units.map((unit) => {
              const unitUsers = usersForUnit(unit.id);
              const isOpen = expandedUnitId === unit.id;
              return (
                <div className={styles.unitBlock} key={unit.id}>
                  <button
                    type="button"
                    className={styles.unitRow}
                    onClick={() => setExpandedUnitId(isOpen ? null : unit.id)}
                    aria-expanded={isOpen}
                  >
                    <div>
                      <p className={styles.unitName}>{unit.name}</p>
                      <p className={styles.unitCode}>Cód. {unit.code || "—"}</p>
                    </div>
                    <div className={styles.unitRowRight}>
                      <span className={styles.unitUserCount}>
                        <Icon name="users" size={14} />
                        {unitUsers.length}
                      </span>
                      <Badge tone={unit.status === "ACTIVE" ? "success" : "neutral"}>{UNIT_STATUS_LABELS[unit.status] || unit.status}</Badge>
                      <Icon name="chevronDown" size={16} className={[styles.unitChevron, isOpen ? styles.unitChevronOpen : ""].filter(Boolean).join(" ")} />
                    </div>
                  </button>

                  {isOpen ? (
                    <div className={styles.unitUsers}>
                      {unitUsers.length === 0 ? (
                        <EmptyState icon="users" title="Sem usuários" description="Nenhum usuário vinculado a esta unidade." />
                      ) : (
                        unitUsers.map((u) => {
                          const membership = u.memberships.find((m) => m.unitId === unit.id);
                          return (
                            <Link href={`/painel/usuarios/${u.id}`} className={styles.unitUserRow} key={u.id}>
                              <Avatar name={u.name} size="sm" />
                              <div className={styles.unitUserInfo}>
                                <span className={styles.unitUserName}>{u.name}</span>
                                <span className={styles.unitUserEmail}>{u.email}</span>
                              </div>
                              <Badge tone={ROLE_TONE[membership?.role] || "neutral"}>{membership?.role}</Badge>
                            </Link>
                          );
                        })
                      )}
                    </div>
                  ) : null}
                </div>
              );
            })}
          </div>

          {addingUnit ? (
            <form className={styles.addUnitForm} onSubmit={handleAddUnit}>
              <div className={styles.addUnitFields}>
                <FormField label="Nome da unidade" htmlFor="u-name" required>
                  <Input id="u-name" placeholder="Ex.: Filial — Campinas" value={newUnit.name} onChange={(e) => setNewUnit({ ...newUnit, name: e.target.value })} autoFocus />
                </FormField>
                <FormField label="Código" htmlFor="u-code">
                  <Input id="u-code" placeholder="Ex.: FIL-04" value={newUnit.code} onChange={(e) => setNewUnit({ ...newUnit, code: e.target.value })} />
                </FormField>
              </div>
              <div className={styles.addUnitActions}>
                <Button type="button" variant="secondary" size="sm" onClick={() => setAddingUnit(false)}>Cancelar</Button>
                <Button type="submit" size="sm" loading={savingUnit}>Adicionar unidade</Button>
              </div>
            </form>
          ) : (
            <Button variant="secondary" size="sm" onClick={() => setAddingUnit(true)} className={styles.addUnitBtn}>
              <Icon name="plus" size={14} /> Nova unidade
            </Button>
          )}
        </Card>
        </div>

        <Card title="Imóveis da empresa" subtitle={`${companyProperties.length} imóve${companyProperties.length === 1 ? "l" : "is"} vinculados a ${company.name}`} className={styles.section}>
          {companyProperties.length === 0 ? (
            <EmptyState icon="building" title="Sem imóveis" description="Nenhum imóvel vinculado a esta empresa ainda." />
          ) : (
            <div className={styles.carouselWrap}>
              {companyProperties.length > 4 ? (
                <button type="button" className={[styles.carouselNav, styles.carouselNavPrev].join(" ")} onClick={() => scrollCarousel(-1)} aria-label="Imóveis anteriores">
                  <Icon name="chevronRight" size={16} className={styles.carouselNavIconPrev} />
                </button>
              ) : null}

              <div className={styles.carousel} ref={carouselRef}>
                {companyProperties.map((p) => (
                  <Link href={`/painel/imoveis/${p.id}`} className={styles.carouselCard} key={p.id}>
                    <div
                      className={styles.carouselThumb}
                      style={{ background: GRADIENTS[Math.abs(hashCode(p.id)) % GRADIENTS.length] }}
                    >
                      <Icon name="building" size={22} />
                    </div>
                    <div className={styles.carouselInfo}>
                      <span className={styles.carouselName}>{p.name}</span>
                      <span className={styles.carouselMeta}>{p.internalCode} · {p.city}</span>
                      <span className={styles.carouselPrice}>
                        {p.activeOffer ? formatBRL(p.activeOffer.askingPrice) : "—"}
                        {p.activeOffer?.offerType === "RENT" ? <span className={styles.carouselPriceSuffix}>/mês</span> : null}
                      </span>
                    </div>
                  </Link>
                ))}
              </div>

              {companyProperties.length > 4 ? (
                <button type="button" className={styles.carouselNav} onClick={() => scrollCarousel(1)} aria-label="Próximos imóveis">
                  <Icon name="chevronRight" size={16} />
                </button>
              ) : null}
            </div>
          )}
        </Card>

        <Card title="Imóveis & usuários" className={styles.section}>
          <Tabs
            items={[
              { label: `Imóveis (${companyProperties.length})`, content: <Table columns={propertyColumns} rows={companyProperties} emptyMessage="Nenhum imóvel vinculado a esta empresa." /> },
              { label: `Usuários (${companyUsers.length})`, content: <Table columns={userColumns} rows={companyUsers} emptyMessage="Nenhum usuário vinculado a esta empresa." /> },
            ]}
          />
        </Card>
      </div>

      <Modal
        open={deleteOpen}
        onClose={() => setDeleteOpen(false)}
        title="Excluir empresa"
        footer={
          <>
            <Button variant="secondary" onClick={() => setDeleteOpen(false)}>Cancelar</Button>
            <Button variant="danger" onClick={handleDelete} loading={deleting}>Excluir empresa</Button>
          </>
        }
      >
        <p className={styles.description}>
          Tem certeza que deseja excluir <strong>{company.name}</strong> e suas {units.length} unidade(s)? Esta ação não pode ser desfeita.
        </p>
      </Modal>
    </AppShell>
  );
}
