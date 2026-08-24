"use client";

import Link from "next/link";
import { useRouter, notFound } from "next/navigation";
import { useState } from "react";
import AppShell from "@/components/organisms/AppShell/AppShell";
import Button from "@/components/atoms/Button/Button";
import Icon from "@/components/atoms/Icon/Icon";
import Avatar from "@/components/atoms/Avatar/Avatar";
import Badge from "@/components/atoms/Badge/Badge";
import Card from "@/components/molecules/Card/Card";
import Modal from "@/components/organisms/Modal/Modal";
import PropertyCard from "@/components/molecules/PropertyCard/PropertyCard";
import EmptyState from "@/components/molecules/EmptyState/EmptyState";
import { RADARS } from "@/lib/mock/radars";
import { PEOPLE, CONTACT_TYPE_LABELS, CONTACT_TYPE_ICON } from "@/lib/mock/people";
import { PROPERTIES } from "@/lib/mock/properties";
import { OPPORTUNITIES } from "@/lib/mock/opportunities";
import { matchRadarToProperties, PROPERTY_TYPE_LABELS, OFFER_TYPE_LABELS } from "@/lib/radarMatching";
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
  const radar = RADARS.find((r) => r.id === params.id);
  const [deleteOpen, setDeleteOpen] = useState(false);
  const [deleting, setDeleting] = useState(false);

  if (!radar) return notFound();

  const person = PEOPLE.find((p) => p.id === radar.personId);
  const opportunity = radar.opportunityId ? OPPORTUNITIES.find((o) => o.id === radar.opportunityId) : null;
  const matches = matchRadarToProperties(radar, PROPERTIES);
  const c = radar.criteriaJson;

  function handleDelete() {
    setDeleting(true);
    window.setTimeout(() => router.push("/painel/radar"), 500);
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
        <p className={styles.description}>
          Tem certeza que deseja excluir o radar de <strong>{person?.legalName || "este contato"}</strong>? Esta ação não pode ser desfeita.
        </p>
      </Modal>
    </AppShell>
  );
}
