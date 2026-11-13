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
import RadarMatchItem from "./RadarMatchItem";
import EmptyState from "@/components/molecules/EmptyState/EmptyState";
import Alert from "@/components/molecules/Alert/Alert";
import AsyncState from "@/components/molecules/AsyncState/AsyncState";
import { UI_STATE } from "@/lib/asyncState/states";
import { useAsyncState } from "@/lib/asyncState/useAsyncState";
import { nullOn404 } from "@/lib/asyncState/notFound";
import { CONTACT_TYPE_LABELS, CONTACT_TYPE_ICON } from "@/lib/mock/people";
import { getRadar, deleteRadar } from "@/lib/api/radar";
import { getPerson } from "@/lib/api/people";
import { getOpportunity } from "@/lib/api/crm";
import { getProperty, mapProperty } from "@/lib/api/properties";
import { apiFetch } from "@/lib/api/client";
import { PROPERTY_TYPE_LABELS, OFFER_TYPE_LABELS } from "@/lib/radarMatching";
import { requiredCriteriaOf, criteriaSummary } from "@/lib/radarCriteria";
import { formatBRL, formatDate } from "@/lib/format";
import styles from "./page.module.css";

import { lookupFallback } from "@/lib/asyncState/lookup";
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
  const [deleteOpen, setDeleteOpen] = useState(false);
  const [deleting, setDeleting] = useState(false);
  const [actionError, setActionError] = useState("");

  // M9-D940: carregando, erro com "tentar de novo", 403 e offline vêm do padrão único de estados.
  const loadQuery = useAsyncState(() => {
    return getRadar(params.id)
      .catch(nullOn404) // 404 da API: o radar não existe, a tela chama notFound()
      .then(async (apiRadar) => {
        if (!apiRadar) {
          setRadar(null);
          return;
        }
        setRadar(apiRadar);
        // M3-15: cada match traz `radarMatch` (score e critérios atendidos/falhos, livro §13); o cartão mostra o score.
        setMatches((apiRadar.matches || []).map((m) => ({ property: mapProperty(m), radarMatch: m.radarMatch || null })));
        const [apiPerson, apiOpportunity] = await Promise.all([
          apiRadar.personId ? getPerson(apiRadar.personId).catch(lookupFallback("a pessoa", null)) : Promise.resolve(null),
          apiRadar.opportunityId ? getOpportunity(apiRadar.opportunityId).catch(lookupFallback("a oportunidade", null)) : Promise.resolve(null),
        ]);
        setPerson(apiPerson);
        if (apiOpportunity) {
          const [property, users] = await Promise.all([
            apiOpportunity.propertyId ? getProperty(apiOpportunity.propertyId).catch(lookupFallback("o imóvel", null)) : Promise.resolve(null),
            apiFetch("/users").catch(lookupFallback("os usuários")),
          ]);
            setOpportunity({
            ...apiOpportunity,
            propertyName: property?.name || "Sem imóvel vinculado",
            repName: (users || []).find((u) => u.id === apiOpportunity.ownerUserId)?.name || "Sem responsável definido",
          });
        }
      })
      .then(() => true);
  }, { deps: [params.id], isEmpty: () => false });

  if (loadQuery.status !== UI_STATE.CONTENT) {
    return (
      <AppShell title={loadQuery.status === UI_STATE.LOADING ? "Carregando radar..." : "Radar"} backHref="/painel/radar">
        <div className={styles.wrap}>
          <AsyncState result={loadQuery} loadingLabel="Carregando radar..." />
        </div>
      </AppShell>
    );
  }

  if (!radar) return notFound();

  const c = requiredCriteriaOf(radar.criteriaJson);
  const extras = criteriaSummary(radar.criteriaJson);

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
      {actionError ? (
        <div style={{ position: "fixed", top: "var(--space-4)", left: "50%", transform: "translateX(-50%)", zIndex: 200, width: "min(560px, calc(100vw - 2 * var(--space-4)))" }}>
          <Alert tone="danger">{actionError}</Alert>
        </div>
      ) : null}
      <div className={styles.wrap}>
        <div className={styles.topRow}>
          <div className={styles.personBlock}>
            <Avatar name={person?.legalName || "Sem pessoa vinculada"} size="xl" />
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
            <Button variant="secondary" href={`/painel/radar/${radar.id}/editar`} requires="radar:update">
              <Icon name="pencil" size={16} /> Editar critérios
            </Button>
            <Button variant="danger" onClick={() => setDeleteOpen(true)}>
              <Icon name="trash" size={16} /> Excluir radar
            </Button>
          </div>
        </div>

        <div className={styles.grid}>
          <div className={styles.mainCol}>
            <Card title={`${matches.length} imóve${matches.length === 1 ? "l compatível" : "is compatíveis"}`}>
              {matches.length === 0 ? (
                <EmptyState icon="radar" title="Nenhum match no momento" description="Nenhum imóvel ativo atende a todos os obrigatórios deste radar sem cair numa exclusão." />
              ) : (
                <div className={styles.matchGrid}>
                  {matches.map(({ property, radarMatch }) => (
                    <RadarMatchItem
                      key={property.id}
                      radarId={radar.id}
                      criteriaJson={radar.criteriaJson}
                      property={property}
                      radarMatch={radarMatch}
                      onOpen={() => router.push(`/painel/imoveis/${property.id}`)}
                    />
                  ))}
                </div>
              )}
            </Card>
          </div>

          <div className={styles.sideCol}>
            {person ? (
              <Card title="Contatos">
                {person.contacts?.length ? (
                <>
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
                </>
                ) : (
                  <EmptyState icon="phone" title="Sem contatos" description="Nenhum contato cadastrado para este contato ainda." />
                )}
              </Card>
            ) : null}

            <Card title="Critérios de busca">
              <div className={styles.criteriaList}>
                <span className={styles.criteriaHeading}>Obrigatórios</span>
                <div className={styles.criteriaRow}>
                  <span className={styles.criteriaLabel}>Tipo de imóvel</span>
                  <span className={styles.criteriaValue}>{PROPERTY_TYPE_LABELS[c.propertyType] || c.propertyType || "Sem tipo de imóvel"}</span>
                </div>
                <div className={styles.criteriaRow}>
                  <span className={styles.criteriaLabel}>Finalidade</span>
                  <span className={styles.criteriaValue}>{OFFER_TYPE_LABELS[c.offerType] || c.offerType || "Sem tipo de oferta"}</span>
                </div>
                <div className={styles.criteriaRow}>
                  <span className={styles.criteriaLabel}>Faixa de preço</span>
                  <span className={styles.criteriaValue}>
                    {c.minPrice != null ? formatBRL(c.minPrice) : "sem mínimo"} – {c.maxPrice != null ? formatBRL(c.maxPrice) : "sem máximo"}
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
                {[["PREFERENCE", "Preferências", "Nenhuma preferência."], ["FLEXIBLE", "Flexíveis", "Nenhum critério flexível."], ["EXCLUSION", "Exclusões", "Nenhuma exclusão."]].map(([category, title, none]) => (
                  <div key={category} className={styles.criteriaGroup} data-criteria-category={category}>
                    <span className={styles.criteriaHeading}>{title}</span>
                    {extras[category].length ? (
                      <ul className={styles.criteriaGroupList}>
                        {extras[category].map((item, i) => (
                          <li key={`${category}-${i}`}>
                            {item.text}
                            {item.weight !== undefined ? <span className={styles.criteriaWeight}> (peso {Number(item.weight).toLocaleString("pt-BR")})</span> : null}
                          </li>
                        ))}
                      </ul>
                    ) : <span className={styles.criteriaWeight}>{none}</span>}
                  </div>
                ))}
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
