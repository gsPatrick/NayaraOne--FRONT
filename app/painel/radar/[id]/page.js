"use client";

import Link from "next/link";
import { useRouter } from "next/navigation";
import { useEffect, useState } from "react";
import AppShell from "@/components/organisms/AppShell/AppShell";
import Button from "@/components/atoms/Button/Button";
import Icon from "@/components/atoms/Icon/Icon";
import Avatar from "@/components/atoms/Avatar/Avatar";
import Badge from "@/components/atoms/Badge/Badge";
import Card from "@/components/molecules/Card/Card";
import Modal from "@/components/organisms/Modal/Modal";
import PropertyCard from "@/components/molecules/PropertyCard/PropertyCard";
import EmptyState from "@/components/molecules/EmptyState/EmptyState";
import Spinner from "@/components/atoms/Spinner/Spinner";
import Alert from "@/components/molecules/Alert/Alert";
import { CONTACT_TYPE_LABELS, CONTACT_TYPE_ICON } from "@/lib/mock/people";
import { getRadar, deleteRadar } from "@/lib/api/radar";
import { getPerson } from "@/lib/api/people";
import { getOpportunity } from "@/lib/api/crm";
import { getProperty, mapProperty } from "@/lib/api/properties";
import { apiFetch } from "@/lib/api/client";
import { PROPERTY_TYPE_LABELS, OFFER_TYPE_LABELS } from "@/lib/radarMatching";
import { formatBRL, formatDate } from "@/lib/format";
import styles from "./page.module.css";

function buildContactHref(contact) {
  if (contact.type === "WHATSAPP") return `https://wa.me/${contact.value.replace(/\D/g, "")}`;
  if (contact.type === "PHONE") return `tel:${contact.value.replace(/\D/g, "")}`;
  if (contact.type === "EMAIL") return `mailto:${contact.value}`;
  return null;
}

export default function RadarDetailPage({ params }) {
  const router = useRouter();
  const [radar, setRadar] = useState(null);
  const [person, setPerson] = useState(null);
  const [opportunity, setOpportunity] = useState(null);
  const [matches, setMatches] = useState([]);
  const [loading, setLoading] = useState(true);
  const [loadError, setLoadError] = useState("");
  const [deleteOpen, setDeleteOpen] = useState(false);
  const [deleting, setDeleting] = useState(false);
  const [actionError, setActionError] = useState("");

  useEffect(() => {
    let cancelled = false;
    setLoading(true);
    setLoadError("");
    getRadar(params.id)
      .then(async (apiRadar) => {
        if (cancelled || !apiRadar) return;
        setRadar(apiRadar);
        setMatches((apiRadar.matches || []).map(mapProperty));
        const [apiPerson, apiOpportunity] = await Promise.all([
          apiRadar.personId ? getPerson(apiRadar.personId).catch(() => null) : Promise.resolve(null),
          apiRadar.opportunityId ? getOpportunity(apiRadar.opportunityId).catch(() => null) : Promise.resolve(null),
        ]);
        if (cancelled) return;
        setPerson(apiPerson);
        if (apiOpportunity) {
          const [property, users] = await Promise.all([
            apiOpportunity.propertyId ? getProperty(apiOpportunity.propertyId).catch(() => null) : Promise.resolve(null),
            apiFetch("/users").catch(() => []),
          ]);
          if (cancelled) return;
          setOpportunity({
            ...apiOpportunity,
            propertyName: property?.name || "—",
            repName: (users || []).find((u) => u.id === apiOpportunity.ownerUserId)?.name || "—",
          });
        }
      })
      .catch((err) => {
        if (!cancelled) setLoadError(err?.message || "Não foi possível carregar o radar.");
      })
      .finally(() => {
        if (!cancelled) setLoading(false);
      });
    return () => {
      cancelled = true;
    };
  }, [params.id]);

  if (loading) {
    return (
      <AppShell title="Carregando radar..." backHref="/painel/radar">
        <div className={styles.wrap}>
          <Spinner size="lg" />
        </div>
      </AppShell>
    );
  }

  if (loadError || !radar) {
    return (
      <AppShell title="Radar" backHref="/painel/radar">
        <div className={styles.wrap}>
          <Alert tone="danger" title="Não foi possível carregar o radar">{loadError || "Radar não encontrado."}</Alert>
        </div>
      </AppShell>
    );
  }

  const c = radar.criteriaJson;

  async function handleDelete() {
    setDeleting(true);
    setActionError("");
    try {
      await deleteRadar(radar.id);
      router.push("/painel/radar");
    } catch (err) {
      setActionError(err?.message || "Não foi possível excluir o radar.");
      setDeleting(false);
    }
  }

  return (
    <AppShell title={person ? `Radar de ${person.legalName}` : "Radar"} backHref="/painel/radar">
      <div className={styles.wrap}>
        <div className={styles.topRow}>
          <div className={styles.personBlock}>
            <Avatar name={person?.legalName || "—"} size="xl" />
            <div>
              <p className={styles.personName}>{person?.legalName || "Contato removido"}</p>
              {person ? (
                <Link href={`/painel/pessoas/${person.id}`} className={styles.personLink}>
                  Ver perfil do contato <Icon name="chevronRight" size={12} />
                </Link>
              ) : null}
            </div>
          </div>
          <div className={styles.actions}>
            <Badge tone={radar.status === "ACTIVE" ? "success" : "neutral"}>{radar.status === "ACTIVE" ? "Ativo" : radar.status}</Badge>
            <Button variant="danger" onClick={() => setDeleteOpen(true)}>
              <Icon name="trash" size={16} /> Excluir radar
            </Button>
          </div>
        </div>

        <div className={styles.grid}>
          <div className={styles.mainCol}>
            <Card title={`${matches.length} imóve${matches.length === 1 ? "l compatível" : "is compatíveis"}`}>
              {matches.length === 0 ? (
                <EmptyState icon="radar" title="Nenhum match no momento" description="Nenhum imóvel ativo atende a todos os critérios deste radar ainda." />
              ) : (
                <div className={styles.matchGrid}>
                  {matches.map((property) => (
                    <PropertyCard key={property.id} property={property} onClick={() => router.push(`/painel/imoveis/${property.id}`)} />
                  ))}
                </div>
              )}
            </Card>
          </div>

          <div className={styles.sideCol}>
            {person?.contacts?.length ? (
              <Card title="Contatos">
                <p className={styles.contactHint}>Deu match? Ligue ou chame no WhatsApp direto por aqui.</p>
                <div className={styles.contactList}>
                  {person.contacts.map((contact) => {
                    const href = buildContactHref(contact);
                    const row = (
                      <>
                        <span className={styles.contactLeft}>
                          <Icon name={CONTACT_TYPE_ICON[contact.type] || "phone"} size={14} />
                          <span>{CONTACT_TYPE_LABELS[contact.type] || contact.type}: {contact.value}</span>
                        </span>
                        {contact.primary ? <span className={styles.contactPrimary}>Principal</span> : null}
                      </>
                    );
                    return href ? (
                      <a key={`${contact.type}-${contact.value}`} href={href} target={contact.type === "WHATSAPP" ? "_blank" : undefined} rel="noopener noreferrer" className={[styles.contactRow, styles.contactRowLink].join(" ")}>
                        {row}
                      </a>
                    ) : (
                      <div key={`${contact.type}-${contact.value}`} className={styles.contactRow}>
                        {row}
                      </div>
                    );
                  })}
                </div>
              </Card>
            ) : null}

            <Card title="Critérios de busca">
              <div className={styles.criteriaList}>
                <div className={styles.criteriaRow}>
                  <span className={styles.criteriaLabel}>Tipo de imóvel</span>
                  <span className={styles.criteriaValue}>{PROPERTY_TYPE_LABELS[c.propertyType] || c.propertyType || "—"}</span>
                </div>
                <div className={styles.criteriaRow}>
                  <span className={styles.criteriaLabel}>Finalidade</span>
                  <span className={styles.criteriaValue}>{OFFER_TYPE_LABELS[c.offerType] || c.offerType || "—"}</span>
                </div>
                <div className={styles.criteriaRow}>
                  <span className={styles.criteriaLabel}>Faixa de preço</span>
                  <span className={styles.criteriaValue}>
                    {c.minPrice != null ? formatBRL(c.minPrice) : "—"} – {c.maxPrice != null ? formatBRL(c.maxPrice) : "—"}
                  </span>
                </div>
                <div className={styles.criteriaRow}>
                  <span className={styles.criteriaLabel}>Localização</span>
                  <span className={styles.criteriaValue}>{[c.city, c.state].filter(Boolean).join(" — ") || "Qualquer"}</span>
                </div>
                <div className={styles.criteriaRow}>
                  <span className={styles.criteriaLabel}>Área</span>
                  <span className={styles.criteriaValue}>
                    {c.minAreaM2 != null || c.maxAreaM2 != null ? `${c.minAreaM2 ?? 0}–${c.maxAreaM2 ?? "∞"} m²` : "Qualquer"}
                  </span>
                </div>
                <div className={styles.criteriaRow}>
                  <span className={styles.criteriaLabel}>Criado em</span>
                  <span className={styles.criteriaValue}>{formatDate(radar.createdAt)}</span>
                </div>
              </div>
            </Card>

            {opportunity ? (
              <Card title="Oportunidade vinculada">
                <p className={styles.opportunityMeta}>{opportunity.propertyName}</p>
                <p className={styles.opportunityMeta}>Responsável: {opportunity.repName}</p>
              </Card>
            ) : null}
          </div>
        </div>
      </div>

      <Modal
        open={deleteOpen}
        onClose={() => setDeleteOpen(false)}
        title="Excluir radar"
        footer={
          <>
            <Button variant="secondary" onClick={() => setDeleteOpen(false)}>Cancelar</Button>
            <Button variant="danger" onClick={handleDelete} loading={deleting}>Excluir radar</Button>
          </>
        }
      >
        {actionError ? <Alert tone="danger">{actionError}</Alert> : null}
        <p className={styles.description}>
          Tem certeza que deseja excluir o radar de <strong>{person?.legalName || "este contato"}</strong>? Esta ação não pode ser desfeita.
        </p>
      </Modal>
    </AppShell>
  );
}
