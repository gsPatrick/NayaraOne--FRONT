"use client";

import { useEffect, useState } from "react";
import Link from "next/link";
import { useRouter, notFound } from "next/navigation";
import AppShell from "@/components/organisms/AppShell/AppShell";
import Button from "@/components/atoms/Button/Button";
import Badge from "@/components/atoms/Badge/Badge";
import Avatar from "@/components/atoms/Avatar/Avatar";
import Icon from "@/components/atoms/Icon/Icon";
import Select from "@/components/atoms/Select/Select";
import Card from "@/components/molecules/Card/Card";
import Modal from "@/components/organisms/Modal/Modal";
import Alert from "@/components/molecules/Alert/Alert";
import PriceHistoryTimeline from "@/components/molecules/PriceHistoryTimeline/PriceHistoryTimeline";
import {
  PROPERTIES,
  FEATURE_LABELS,
  PUBLICATION_STATUS_LABELS,
  AVAILABILITY_STATUS_LABELS,
  OFFER_TYPE_LABELS,
  OFFER_STATUS_LABELS,
  OWNER_ROLE_LABELS,
  INTERNAL_OCCURRENCE_TYPE_LABELS,
  REG_IMO_001,
} from "@/lib/mock/properties";
import { formatBRL } from "@/lib/format";
import { buildGoogleMapsUrl, buildGoogleMapsEmbedUrl, buildGoogleMapsDirectionsUrl, buildAddressLine } from "@/lib/maps";
import styles from "./page.module.css";

const AVAILABILITY_TONE = { AVAILABLE: "success", RENTED: "info", SOLD: "brand", WITHDRAWN: "neutral" };
const OFFER_STATUS_TONE = { ACTIVE: "success", PAUSED: "warning", CLOSED: "neutral" };
const REG_TONE = { Regularizado: "success", "Em análise": "warning", Pendente: "danger" };

const GRADIENTS = [
  "linear-gradient(135deg, #17130F 0%, #3A2E14 100%)",
  "linear-gradient(135deg, #0F0C0A 0%, #8A6620 100%)",
  "linear-gradient(135deg, #3A2E14 0%, #BE9130 100%)",
  "linear-gradient(135deg, #17130F 0%, #A97D28 100%)",
];

function hashCode(str = "") {
  let hash = 0;
  for (let i = 0; i < String(str).length; i++) {
    hash = (hash << 5) - hash + String(str).charCodeAt(i);
    hash |= 0;
  }
  return hash;
}

let mockOccurrenceIdSeq = 0;

export default function PropertyDetailPage({ params }) {
  const router = useRouter();
  const sourceProperty = PROPERTIES.find((p) => p.id === params.id);
  const [deleteOpen, setDeleteOpen] = useState(false);
  const [deleting, setDeleting] = useState(false);
  const [deleteConfirmText, setDeleteConfirmText] = useState("");
  const [editOpen, setEditOpen] = useState(false);

  // Copiamos o mock para estado local — nunca mutamos o array importado diretamente.
  const [property, setProperty] = useState(() => (sourceProperty ? { ...sourceProperty } : null));
  const [publishBlockedMessage, setPublishBlockedMessage] = useState("");

  const [occurrenceForm, setOccurrenceForm] = useState({ type: "OWNER_NOTE", description: "" });
  const [mediaIndex, setMediaIndex] = useState(0);
  const [galleryOpen, setGalleryOpen] = useState(false);
  const [addressCopied, setAddressCopied] = useState(false);
  const [galleryPage, setGalleryPage] = useState(0);

  function handleCopyAddress() {
    const line = buildAddressLine(property.address);
    navigator.clipboard?.writeText(line).then(() => {
      setAddressCopied(true);
      window.setTimeout(() => setAddressCopied(false), 2000);
    });
  }

  const mediaCount = sourceProperty?.media?.length || 0;

  function prevMedia(event) {
    event?.stopPropagation();
    setMediaIndex((i) => (i - 1 + mediaCount) % mediaCount);
  }

  function nextMedia(event) {
    event?.stopPropagation();
    setMediaIndex((i) => (i + 1) % mediaCount);
  }

  useEffect(() => {
    if (!galleryOpen) return;
    function onKey(e) {
      if (e.key === "Escape") setGalleryOpen(false);
      if (e.key === "ArrowLeft") prevMedia();
      if (e.key === "ArrowRight") nextMedia();
    }
    document.addEventListener("keydown", onKey);
    return () => document.removeEventListener("keydown", onKey);
  }); // eslint-disable-line react-hooks/exhaustive-deps

  if (!sourceProperty || !property) return notFound();

  function handleDelete() {
    setDeleting(true);
    window.setTimeout(() => router.push("/painel/imoveis"), 500);
  }

  function handleConfirmEdit() {
    router.push(`/painel/imoveis/${property.id}/editar`);
  }

  function handlePublish() {
    const hasVideo = property.media?.some((m) => m.type === "video");
    if (!hasVideo) {
      setPublishBlockedMessage(
        `Publicação bloqueada pela regra ${REG_IMO_001.code}: é necessário pelo menos 1 vídeo para publicar este imóvel.`
      );
      return;
    }
    setPublishBlockedMessage("");
    setProperty((prev) => ({ ...prev, publicationStatus: "PUBLISHED" }));
  }

  function handleAddOccurrence(event) {
    event.preventDefault();
    if (!occurrenceForm.description.trim()) return;
    mockOccurrenceIdSeq += 1;
    const newOccurrence = {
      id: `occ-local-${mockOccurrenceIdSeq}`,
      type: occurrenceForm.type,
      description: occurrenceForm.description.trim(),
      date: new Date().toISOString(),
    };
    setProperty((prev) => ({ ...prev, internalOccurrences: [newOccurrence, ...(prev.internalOccurrences || [])] }));
    setOccurrenceForm({ type: "OWNER_NOTE", description: "" });
  }

  const offer = property.activeOffer;

  return (
    <AppShell title={property.name} backHref="/painel/imoveis">
      <div className={styles.wrap}>
        <div className={styles.topRow}>
          <div className={styles.badges}>
            <span className={styles.internalCode}>Cód. {property.internalCode}</span>
            <Badge tone={AVAILABILITY_TONE[property.availabilityStatus] || "neutral"}>
              {AVAILABILITY_STATUS_LABELS[property.availabilityStatus] || property.availabilityStatus}
            </Badge>
            <span className={styles.publicationBadge}>
              {PUBLICATION_STATUS_LABELS[property.publicationStatus] || property.publicationStatus}
            </span>
            <Badge tone="neutral">{property.type}</Badge>
          </div>
          <div className={styles.actions}>
            {property.publicationStatus !== "PUBLISHED" ? (
              <Button variant="secondary" onClick={handlePublish}>
                <Icon name="check" size={16} /> Publicar imóvel
              </Button>
            ) : null}
            <Button variant="secondary" onClick={() => setEditOpen(true)}>
              <Icon name="settings" size={16} /> Editar
            </Button>
            <Button variant="danger" onClick={() => setDeleteOpen(true)}>
              <Icon name="trash" size={16} /> Excluir
            </Button>
          </div>
        </div>

        {publishBlockedMessage ? (
          <div className={styles.publishAlert}>
            <Alert tone="warning">{publishBlockedMessage}</Alert>
          </div>
        ) : null}

        <div className={styles.grid}>
          <div className={styles.mainCol}>
            <Card title="Sobre o imóvel">
              <p className={styles.meta}>
                {property.neighborhood}, {property.city} · {property.areaM2} m²
                {property.bedrooms ? ` · ${property.bedrooms} dormitórios` : ""}
                {property.parkingSpots ? ` · ${property.parkingSpots} vaga(s)` : ""}
              </p>
              <p className={styles.description}>{property.description}</p>
            </Card>

            <Card title="Proprietários">
              <div className={styles.ownerProfileList}>
                {property.owners.map((owner) => {
                  const linkedCount = owner.personId
                    ? PROPERTIES.filter((p) => p.owners.some((o) => o.personId === owner.personId)).length
                    : 0;
                  return (
                    <div className={styles.ownerProfile} key={owner.name}>
                      <Avatar name={owner.name} size="xl" />
                      <div className={styles.ownerProfileInfo}>
                        <span className={styles.ownerProfileName}>{owner.name}</span>
                        <p className={styles.ownerProfileDesc}>
                          {OWNER_ROLE_LABELS[owner.roleCode] || owner.roleCode} · {owner.percentage}% de participação
                          {owner.validFrom ? ` · desde ${new Date(owner.validFrom).toLocaleDateString("pt-BR")}` : ""}
                        </p>
                        {owner.personId ? (
                          <p className={styles.ownerProfileCount}>
                            {linkedCount} imóve{linkedCount === 1 ? "l vinculado" : "is vinculados"}
                          </p>
                        ) : null}
                      </div>
                      {owner.personId ? (
                        <Button variant="secondary" size="sm" href={`/painel/pessoas/${owner.personId}`}>
                          Ver perfil
                        </Button>
                      ) : null}
                    </div>
                  );
                })}
              </div>
            </Card>

            <Card title="Localização">
              <p className={styles.meta}>
                {property.address?.street || "—"}{property.address?.number ? `, ${property.address.number}` : ""}
                {property.address?.complement ? ` — ${property.address.complement}` : ""}
              </p>
              <p className={styles.meta}>
                {property.address?.neighborhood}, {property.address?.city} — {property.address?.state} · CEP {property.address?.zipCode}
              </p>
              <div className={styles.mapEmbed}>
                <iframe
                  src={buildGoogleMapsEmbedUrl(property.address)}
                  title="Localização do imóvel"
                  loading="lazy"
                  referrerPolicy="no-referrer-when-downgrade"
                />
              </div>
              <div className={styles.mapActions}>
                <a
                  href={buildGoogleMapsUrl(property.address)}
                  target="_blank"
                  rel="noopener noreferrer"
                  className={styles.mapAction}
                >
                  <Icon name="mapPin" size={14} />
                  Ver no Google Maps
                </a>
                <a
                  href={buildGoogleMapsDirectionsUrl(property.address)}
                  target="_blank"
                  rel="noopener noreferrer"
                  className={styles.mapAction}
                >
                  <Icon name="chevronRight" size={14} />
                  Como chegar
                </a>
                <button type="button" className={styles.mapAction} onClick={handleCopyAddress}>
                  <Icon name={addressCopied ? "check" : "document"} size={14} />
                  {addressCopied ? "Endereço copiado" : "Copiar endereço"}
                </button>
              </div>
            </Card>

            <Card title="Características">
              {property.features ? (
                <>
                  <div className={styles.chipRow}>
                    {Object.entries(FEATURE_LABELS)
                      .filter(([key]) => property.features[key])
                      .map(([key]) => (
                        <Badge tone="neutral" key={key}>{FEATURE_LABELS[key]}</Badge>
                      ))}
                    {Object.entries(FEATURE_LABELS).every(([key]) => !property.features[key]) ? (
                      <span className={styles.description}>Nenhuma comodidade cadastrada.</span>
                    ) : null}
                  </div>
                  <p className={styles.meta}>
                    {property.features.constructionYear ? `Construído em ${property.features.constructionYear}` : "Ano de construção não informado"}
                    {` · ${property.features.coveredParkingSpots || 0} vaga(s) coberta(s)`}
                    {` · ${property.features.uncoveredParkingSpots || 0} vaga(s) descoberta(s)`}
                  </p>
                </>
              ) : (
                <p className={styles.description}>Sem características cadastradas.</p>
              )}
            </Card>

            <Card title="Documentação">
              {property.documentation ? (
                <div className={styles.docGrid}>
                  <div>
                    <p className={styles.docLabel}>Matrícula</p>
                    <p className={styles.docValue}>{property.documentation.registryNumber || "—"}</p>
                  </div>
                  <div>
                    <p className={styles.docLabel}>Cartório</p>
                    <p className={styles.docValue}>{property.documentation.registryOffice || "—"}</p>
                  </div>
                  <div>
                    <p className={styles.docLabel}>IPTU</p>
                    <p className={styles.docValue}>{property.documentation.iptuNumber || "—"}</p>
                  </div>
                  <div>
                    <p className={styles.docLabel}>Condomínio</p>
                    <p className={styles.docValue}>{property.documentation.condoFee ? formatBRL(property.documentation.condoFee) : "—"}</p>
                  </div>
                  <div>
                    <p className={styles.docLabel}>Situação</p>
                    <Badge tone={REG_TONE[property.documentation.regularizationStatus] || "neutral"}>
                      {property.documentation.regularizationStatus || "—"}
                    </Badge>
                  </div>
                </div>
              ) : (
                <p className={styles.description}>Sem documentação cadastrada.</p>
              )}
            </Card>

            <Card title="Histórico de preço">
              <PriceHistoryTimeline entries={property.priceHistory} />
            </Card>

            <Card
              className={styles.internalCard}
              title="Ocorrências internas"
              actions={<span className={styles.internalUseBadge}><Icon name="shield" size={12} /> Uso interno</span>}
            >
              {property.internalOccurrences?.length > 0 ? (
                <div className={styles.occurrenceList}>
                  {property.internalOccurrences.map((occ) => (
                    <div className={styles.occurrenceRow} key={occ.id}>
                      <div className={styles.occurrenceHeader}>
                        <Badge tone="neutral">{INTERNAL_OCCURRENCE_TYPE_LABELS[occ.type] || occ.type}</Badge>
                        <span className={styles.occurrenceDate}>
                          {new Date(occ.date).toLocaleDateString("pt-BR")}
                        </span>
                      </div>
                      <p className={styles.occurrenceDescription}>{occ.description}</p>
                    </div>
                  ))}
                </div>
              ) : (
                <p className={styles.description}>Nenhuma ocorrência interna registrada.</p>
              )}

              <form className={styles.occurrenceForm} onSubmit={handleAddOccurrence}>
                <p className={styles.occurrenceFormTitle}>Registrar nova ocorrência</p>
                <div className={styles.occurrenceFormRow}>
                  <Select
                    className={styles.occurrenceTypeSelect}
                    value={occurrenceForm.type}
                    onChange={(e) => setOccurrenceForm({ ...occurrenceForm, type: e.target.value })}
                    aria-label="Tipo de ocorrência"
                  >
                    {Object.entries(INTERNAL_OCCURRENCE_TYPE_LABELS).map(([value, label]) => (
                      <option key={value} value={value}>{label}</option>
                    ))}
                  </Select>
                </div>
                <textarea
                  className={styles.occurrenceTextarea}
                  rows={2}
                  placeholder="Descreva a ocorrência..."
                  value={occurrenceForm.description}
                  onChange={(e) => setOccurrenceForm({ ...occurrenceForm, description: e.target.value })}
                  aria-label="Descrição da ocorrência"
                />
                <button type="submit" className={styles.occurrenceSubmitBtn}>
                  <Icon name="plus" size={14} /> Adicionar ocorrência
                </button>
              </form>
            </Card>

            <Card title="Galeria de mídia">
              {mediaCount > 0 ? (
                (() => {
                  const GALLERY_PAGE_SIZE = 4;
                  const totalGalleryPages = Math.ceil(mediaCount / GALLERY_PAGE_SIZE);
                  const galleryStart = galleryPage * GALLERY_PAGE_SIZE;
                  const visibleMedia = property.media.slice(galleryStart, galleryStart + GALLERY_PAGE_SIZE);
                  return (
                    <div className={styles.mediaCarousel}>
                      {totalGalleryPages > 1 ? (
                        <button
                          type="button"
                          className={[styles.mediaCarouselNav, styles.mediaCarouselNavPrev].join(" ")}
                          disabled={galleryPage === 0}
                          onClick={() => setGalleryPage((p) => Math.max(0, p - 1))}
                          aria-label="Fotos anteriores"
                        >
                          <Icon name="chevronRight" size={16} className={styles.mediaCarouselNavIconPrev} />
                        </button>
                      ) : null}

                      <div className={styles.mediaGrid}>
                        {visibleMedia.map((item, i) => {
                          const index = galleryStart + i;
                          return (
                            <div
                              className={styles.mediaTile}
                              key={`${item.type}-${index}`}
                              role="button"
                              tabIndex={0}
                              onClick={() => {
                                setMediaIndex(index);
                                setGalleryOpen(true);
                              }}
                              onKeyDown={(event) => {
                                if (event.key === "Enter" || event.key === " ") {
                                  event.preventDefault();
                                  setMediaIndex(index);
                                  setGalleryOpen(true);
                                }
                              }}
                              style={{ background: GRADIENTS[Math.abs(hashCode(property.id + index)) % GRADIENTS.length] }}
                            >
                              <Icon name={item.type === "video" ? "video" : "image"} size={20} />
                              {item.type === "video" ? <span className={styles.mediaBadge}>Vídeo</span> : null}
                              <span className={styles.mediaLabel}>{item.label}</span>
                            </div>
                          );
                        })}
                      </div>

                      {totalGalleryPages > 1 ? (
                        <button
                          type="button"
                          className={[styles.mediaCarouselNav, styles.mediaCarouselNavNext].join(" ")}
                          disabled={galleryPage === totalGalleryPages - 1}
                          onClick={() => setGalleryPage((p) => Math.min(totalGalleryPages - 1, p + 1))}
                          aria-label="Próximas fotos"
                        >
                          <Icon name="chevronRight" size={16} />
                        </button>
                      ) : null}
                    </div>
                  );
                })()
              ) : (
                <p className={styles.description}>Nenhuma mídia cadastrada.</p>
              )}
            </Card>
          </div>

          <div className={styles.sideCol}>
            <Card title="Oferta ativa">
              {offer ? (
                <div className={styles.offerBox}>
                  <p className={styles.offerPrice}>
                    {formatBRL(offer.askingPrice)}
                    {offer.offerType !== "SALE" ? <span className={styles.offerSuffix}>/mês</span> : null}
                  </p>
                  <p className={styles.offerType}>{OFFER_TYPE_LABELS[offer.offerType]}</p>
                  <Badge tone={OFFER_STATUS_TONE[offer.status] || "neutral"}>{OFFER_STATUS_LABELS[offer.status] || offer.status}</Badge>

                  {offer.confidentialMinPrice != null ? (
                    <div className={styles.confidentialBox}>
                      <Icon name="shield" size={12} />
                      <span className={styles.confidentialLabel}>Confidencial</span>
                      <span className={styles.confidentialValue}>{formatBRL(offer.confidentialMinPrice)}</span>
                    </div>
                  ) : null}

                  <div className={styles.offerChips}>
                    {offer.acceptsFinancing ? <Badge tone="info">Aceita financiamento</Badge> : null}
                    {offer.acceptsTrade ? <Badge tone="info">Aceita permuta</Badge> : null}
                  </div>

                  {offer.validFrom || offer.validUntil ? (
                    <p className={styles.offerValidity}>
                      Vigência: {offer.validFrom ? new Date(offer.validFrom).toLocaleDateString("pt-BR") : "—"}
                      {offer.validUntil ? ` até ${new Date(offer.validUntil).toLocaleDateString("pt-BR")}` : " (indeterminada)"}
                    </p>
                  ) : null}
                </div>
              ) : (
                <p className={styles.description}>Sem oferta ativa no momento.</p>
              )}
            </Card>

            {mediaCount > 0 ? (
              <Card title="Fotos e vídeos" padded={false} className={styles.mediaCard}>
                <div
                  className={styles.miniBanner}
                  role="button"
                  tabIndex={0}
                  onClick={() => setGalleryOpen(true)}
                  onKeyDown={(event) => {
                    if (event.key === "Enter" || event.key === " ") {
                      event.preventDefault();
                      setGalleryOpen(true);
                    }
                  }}
                  aria-label="Ver galeria de mídia em tela cheia"
                  style={{ background: GRADIENTS[Math.abs(hashCode(property.id + mediaIndex)) % GRADIENTS.length] }}
                >
                  <Icon name={property.media[mediaIndex].type === "video" ? "video" : "image"} size={24} className={styles.miniBannerIcon} />
                  {property.media[mediaIndex].type === "video" ? (
                    <span className={styles.mediaBadge}>Vídeo</span>
                  ) : null}

                  {mediaCount > 1 ? (
                    <>
                      <button type="button" className={[styles.miniBannerNav, styles.miniBannerNavPrev].join(" ")} onClick={prevMedia} aria-label="Mídia anterior">
                        <Icon name="chevronRight" size={14} className={styles.miniBannerNavIconPrev} />
                      </button>
                      <button type="button" className={[styles.miniBannerNav, styles.miniBannerNavNext].join(" ")} onClick={nextMedia} aria-label="Próxima mídia">
                        <Icon name="chevronRight" size={14} />
                      </button>
                      <div className={styles.miniBannerDots} aria-hidden="true">
                        {property.media.map((_, i) => (
                          <span key={i} className={[styles.miniBannerDot, i === mediaIndex ? styles.miniBannerDotActive : ""].filter(Boolean).join(" ")} />
                        ))}
                      </div>
                    </>
                  ) : null}

                  <span className={styles.miniBannerExpand}>
                    <Icon name="search" size={14} />
                  </span>
                </div>
                <p className={styles.miniBannerCaption}>{property.media[mediaIndex].label}</p>
              </Card>
            ) : null}
          </div>
        </div>
      </div>

      {galleryOpen && mediaCount > 0 ? (
        <div className={styles.galleryOverlay} onMouseDown={(e) => { if (e.target === e.currentTarget) setGalleryOpen(false); }}>
          <div className={styles.galleryModal} role="dialog" aria-modal="true" aria-label="Galeria de mídia">
            <div className={styles.galleryHeader}>
              <span className={styles.galleryCounter}>{mediaIndex + 1} / {mediaCount}</span>
              <button type="button" className={styles.galleryClose} onClick={() => setGalleryOpen(false)} aria-label="Fechar">
                <Icon name="close" size={20} />
              </button>
            </div>

            <div className={styles.galleryStage}>
              {mediaCount > 1 ? (
                <button type="button" className={[styles.galleryNav, styles.galleryNavPrev].join(" ")} onClick={prevMedia} aria-label="Mídia anterior">
                  <Icon name="chevronRight" size={22} className={styles.galleryNavIconPrev} />
                </button>
              ) : null}

              <div
                className={styles.galleryMedia}
                style={{ background: GRADIENTS[Math.abs(hashCode(property.id + mediaIndex)) % GRADIENTS.length] }}
              >
                <Icon name={property.media[mediaIndex].type === "video" ? "video" : "image"} size={48} />
              </div>

              {mediaCount > 1 ? (
                <button type="button" className={[styles.galleryNav, styles.galleryNavNext].join(" ")} onClick={nextMedia} aria-label="Próxima mídia">
                  <Icon name="chevronRight" size={22} />
                </button>
              ) : null}
            </div>

            <p className={styles.galleryLabel}>{property.media[mediaIndex].label}</p>

            {mediaCount > 1 ? (
              <div className={styles.galleryThumbs}>
                {property.media.map((item, index) => (
                  <button
                    type="button"
                    key={`${item.type}-${index}`}
                    className={[styles.galleryThumb, index === mediaIndex ? styles.galleryThumbActive : ""].filter(Boolean).join(" ")}
                    onClick={() => setMediaIndex(index)}
                    style={{ background: GRADIENTS[Math.abs(hashCode(property.id + index)) % GRADIENTS.length] }}
                    aria-label={item.label}
                  >
                    <Icon name={item.type === "video" ? "video" : "image"} size={14} />
                  </button>
                ))}
              </div>
            ) : null}
          </div>
        </div>
      ) : null}

      <Modal
        open={deleteOpen}
        onClose={() => {
          setDeleteOpen(false);
          setDeleteConfirmText("");
        }}
        title="Excluir imóvel"
        footer={
          <>
            <Button
              variant="secondary"
              onClick={() => {
                setDeleteOpen(false);
                setDeleteConfirmText("");
              }}
            >
              Cancelar
            </Button>
            <Button
              variant="danger"
              onClick={handleDelete}
              loading={deleting}
              disabled={deleteConfirmText.trim() !== property.name}
            >
              Excluir imóvel
            </Button>
          </>
        }
      >
        <p className={styles.description}>
          Tem certeza que deseja excluir <strong>{property.name}</strong>? Esta ação não pode ser
          desfeita.
        </p>
        <p className={styles.deleteConfirmLabel}>
          Digite <strong>{property.name}</strong> para confirmar:
        </p>
        <input
          className={styles.deleteConfirmInput}
          value={deleteConfirmText}
          onChange={(e) => setDeleteConfirmText(e.target.value)}
          placeholder={property.name}
          autoFocus
        />
      </Modal>

      <Modal
        open={editOpen}
        onClose={() => setEditOpen(false)}
        title="Editar imóvel"
        footer={
          <>
            <Button variant="secondary" onClick={() => setEditOpen(false)}>Cancelar</Button>
            <Button variant="primary" onClick={handleConfirmEdit}>Continuar para edição</Button>
          </>
        }
      >
        <p className={styles.description}>
          Você será redirecionado para a página de edição de <strong>{property.name}</strong>. Deseja continuar?
        </p>
      </Modal>
    </AppShell>
  );
}
