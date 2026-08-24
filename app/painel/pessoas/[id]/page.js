"use client";

import { useEffect, useState } from "react";
import Link from "next/link";
import { useRouter } from "next/navigation";
import AppShell from "@/components/organisms/AppShell/AppShell";
import Button from "@/components/atoms/Button/Button";
import Badge from "@/components/atoms/Badge/Badge";
import Icon from "@/components/atoms/Icon/Icon";
import Avatar from "@/components/atoms/Avatar/Avatar";
import Spinner from "@/components/atoms/Spinner/Spinner";
import Card from "@/components/molecules/Card/Card";
import Modal from "@/components/organisms/Modal/Modal";
import Alert from "@/components/molecules/Alert/Alert";
import {
  ROLE_TONE,
  ROLE_LABELS,
  STATUS_LABELS,
  STATUS_TONE,
  CONTACT_TYPE_LABELS,
  CONTACT_TYPE_ICON,
  CONSENT_LABELS,
  DOCUMENT_TYPE_LABELS,
  VERIFICATION_LABELS,
  VERIFICATION_TONE,
} from "@/lib/mock/people";
import { OWNER_ROLE_LABELS, AVAILABILITY_STATUS_LABELS } from "@/lib/mock/properties";
import { listPeople, getPerson, listDuplicatePairs, deletePerson, mergePeople } from "@/lib/api/people";
import { listProperties } from "@/lib/api/properties";
import { formatDate } from "@/lib/format";
import { buildGoogleMapsUrl, buildGoogleMapsEmbedUrl } from "@/lib/maps";
import styles from "./page.module.css";

const GRADIENTS = [
  "linear-gradient(135deg, #17130F 0%, #3A2E14 100%)",
  "linear-gradient(135deg, #0F0C0A 0%, #8A6620 100%)",
  "linear-gradient(135deg, #3A2E14 0%, #BE9130 100%)",
  "linear-gradient(135deg, #17130F 0%, #A97D28 100%)",
];

function buildContactHref(contact) {
  if (contact.type === "WHATSAPP") return `https://wa.me/${contact.value.replace(/\D/g, "")}`;
  if (contact.type === "PHONE") return `tel:${contact.value.replace(/\D/g, "")}`;
  if (contact.type === "EMAIL") return `mailto:${contact.value}`;
  return null;
}

function hashCode(str = "") {
  let hash = 0;
  for (let i = 0; i < String(str).length; i++) {
    hash = (hash << 5) - hash + String(str).charCodeAt(i);
    hash |= 0;
  }
  return hash;
}

export default function PersonDetailPage({ params }) {
  const router = useRouter();
  const [deleteOpen, setDeleteOpen] = useState(false);
  const [deleting, setDeleting] = useState(false);
  const [mergeOpen, setMergeOpen] = useState(false);
  const [merging, setMerging] = useState(false);

  const [person, setPerson] = useState(null);
  const [people, setPeople] = useState([]);
  const [duplicatePairs, setDuplicatePairs] = useState([]);
  const [properties, setProperties] = useState([]);
  const [loading, setLoading] = useState(true);
  const [loadError, setLoadError] = useState("");
  const [actionError, setActionError] = useState("");
  const [canonicalId, setCanonicalId] = useState(null);

  useEffect(() => {
    let cancelled = false;
    setLoading(true);
    setLoadError("");
    // A ficha precisa da pessoa, dos pares de duplicata, das demais pessoas (para exibir o
    // nome do par/canônico) e dos imóveis (para o card "Imóveis vinculados", que casa por
    // property_owners.person_id).
    Promise.all([getPerson(params.id), listPeople(), listDuplicatePairs(), listProperties()])
      .then(([apiPerson, apiPeople, pairs, apiProperties]) => {
        if (cancelled) return;
        setPerson(apiPerson);
        setPeople(apiPeople);
        setDuplicatePairs(pairs);
        setProperties(apiProperties);
      })
      .catch((err) => {
        if (!cancelled) setLoadError(err?.message || "Não foi possível carregar o contato.");
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
      <AppShell title="Contato" backHref="/painel/pessoas">
        <Spinner size="lg" />
      </AppShell>
    );
  }

  if (loadError || !person) {
    return (
      <AppShell title="Contato" backHref="/painel/pessoas">
        <Alert tone="danger" title="Não foi possível carregar o contato">
          {loadError || "Contato não encontrado."}
        </Alert>
      </AppShell>
    );
  }

  const linkedProperties = properties.filter((prop) => prop.owners.some((owner) => owner.personId === person.id));

  const duplicatePair = duplicatePairs.find((pair) => pair.includes(person.id));
  const duplicatePartnerId = duplicatePair ? duplicatePair.find((id) => id !== person.id) : null;
  const duplicatePartner = duplicatePartnerId ? people.find((p) => p.id === duplicatePartnerId) : null;
  const mergedIntoPerson = person.mergedInto ? people.find((p) => p.id === person.mergedInto) : null;
  const selectedCanonicalId = canonicalId || person.id;

  async function handleDelete() {
    setDeleting(true);
    setActionError("");
    try {
      await deletePerson(person.id);
      router.push("/painel/pessoas");
    } catch (err) {
      setActionError(err?.message || "Não foi possível excluir o contato.");
      setDeleting(false);
      setDeleteOpen(false);
    }
  }

  async function handleMerge() {
    if (!duplicatePartner) return;
    setMerging(true);
    setActionError("");
    // POST /people/:canonicalId/merge — o operador escolhe qual cadastro fica como canônico
    // (decisão deliberada, não automática); a API remapeia as referências do absorvido,
    // marca-o como MERGED e publica o evento person.merged.
    const absorbedId = selectedCanonicalId === person.id ? duplicatePartner.id : person.id;
    try {
      await mergePeople(selectedCanonicalId, absorbedId);
      if (absorbedId === person.id) {
        setPerson((prev) => ({ ...prev, status: "MERGED", mergedInto: selectedCanonicalId }));
        setMergeOpen(false);
      } else {
        setDuplicatePairs((prev) => prev.filter((pair) => !pair.includes(absorbedId)));
        setMergeOpen(false);
      }
    } catch (err) {
      setActionError(err?.message || "Não foi possível mesclar os cadastros.");
      setMergeOpen(false);
    } finally {
      setMerging(false);
    }
  }

  return (
    <AppShell title={person.legalName} backHref="/painel/pessoas">
      <div className={styles.wrap}>
        <div className={styles.topRow}>
          <div className={styles.badges}>
            <Avatar name={person.legalName} src={person.photoUrl} size="lg" className={styles.headerAvatar} />
            <div className={styles.headerNameBlock}>
              <span className={styles.headerName}>{person.legalName}</span>
              <span className={styles.headerType}>{person.personType === "PF" ? "Pessoa física" : "Pessoa jurídica"}</span>
            </div>
          </div>
          <div className={styles.actions}>
            {duplicatePartner && person.status !== "MERGED" ? (
              <Button variant="secondary" onClick={() => setMergeOpen(true)}>
                <Icon name="layers" size={16} /> Mesclar cadastros
              </Button>
            ) : null}
            <Button variant="danger" onClick={() => setDeleteOpen(true)}>
              <Icon name="trash" size={16} /> Excluir
            </Button>
          </div>
        </div>

        {actionError ? (
          <div className={styles.mergedAlert}>
            <Alert tone="danger" title="Ação não concluída">{actionError}</Alert>
          </div>
        ) : null}

        {person.status === "MERGED" && mergedIntoPerson ? (
          <div className={styles.mergedAlert}>
            <Alert tone="warning" title="Cadastro mesclado">
              Este cadastro foi mesclado com{" "}
              <a className={styles.mergedLink} href={`/painel/pessoas/${mergedIntoPerson.id}`}>{mergedIntoPerson.legalName}</a>
              . Consulte o cadastro canônico para dados atualizados.
            </Alert>
          </div>
        ) : null}

        {duplicatePartner && person.status !== "MERGED" ? (
          <div className={styles.mergedAlert}>
            <Alert tone="warning" title="Possível duplicata detectada">
              Este cadastro compartilha nome e telefone com <strong>{duplicatePartner.legalName}</strong>. Revise
              antes de manter os dois cadastros ativos.
            </Alert>
          </div>
        ) : null}

        <div className={styles.grid}>
          <div className={styles.mainCol}>
            <Card title="Sobre o contato">
              <div className={styles.aboutGrid}>
                <div>
                  <p className={styles.fieldLabel}>Nome {person.personType === "PJ" ? "/ Razão social" : "completo"}</p>
                  <p className={styles.fieldValue}>{person.legalName}</p>
                </div>
                {person.preferredName ? (
                  <div>
                    <p className={styles.fieldLabel}>{person.personType === "PJ" ? "Nome fantasia" : "Nome preferido"}</p>
                    <p className={styles.fieldValue}>{person.preferredName}</p>
                  </div>
                ) : null}
                <div>
                  <p className={styles.fieldLabel}>{person.personType === "PJ" ? "CNPJ" : "CPF"}</p>
                  <p className={styles.fieldValue}>{person.taxIdNormalized}</p>
                </div>
                <div>
                  <p className={styles.fieldLabel}>{person.personType === "PF" ? "Nascimento" : "Fundação"}</p>
                  <p className={styles.fieldValue}>{person.birthOrFoundationDate ? formatDate(person.birthOrFoundationDate) : "—"}</p>
                </div>
                <div>
                  <p className={styles.fieldLabel}>Cadastrado em</p>
                  <p className={styles.fieldValue}>{formatDate(person.createdAt)}</p>
                </div>
              </div>
            </Card>

            <Card title="Contatos">
              <div className={styles.list}>
                {person.contacts.map((c) => {
                  const href = buildContactHref(c);
                  const rowContent = (
                    <>
                      <span className={styles.listRowLeft}>
                        <Icon name={CONTACT_TYPE_ICON[c.type] || "phone"} size={14} />
                        <span>{CONTACT_TYPE_LABELS[c.type] || c.type}: {c.value}</span>
                      </span>
                      <span className={styles.listRowRight}>
                        {c.primary ? <span className={styles.primaryTag}>Principal</span> : null}
                        <span className={[styles.consentTag, c.consentStatus === "CONSENTED" ? styles.consentOk : styles.consentPending].join(" ")}>
                          <Icon name={c.consentStatus === "CONSENTED" ? "check" : "bell"} size={12} />
                          {CONSENT_LABELS[c.consentStatus] || c.consentStatus}
                        </span>
                      </span>
                    </>
                  );
                  return href ? (
                    <a
                      href={href}
                      target={c.type === "EMAIL" || c.type === "PHONE" ? undefined : "_blank"}
                      rel={c.type === "WHATSAPP" ? "noopener noreferrer" : undefined}
                      className={[styles.listRow, styles.listRowLink].join(" ")}
                      key={c.id || `${c.type}-${c.value}`}
                    >
                      {rowContent}
                    </a>
                  ) : (
                    <div className={styles.listRow} key={c.id || `${c.type}-${c.value}`}>
                      {rowContent}
                    </div>
                  );
                })}
              </div>
            </Card>

            <Card title="Documentos">
              {person.documents.length > 0 ? (
                <div className={styles.list}>
                  {person.documents.map((d) => (
                    <div className={styles.listRow} key={`${d.type}-${d.value}`}>
                      <span className={styles.listRowLeft}>
                        <Icon name="document" size={14} />
                        <span>{DOCUMENT_TYPE_LABELS[d.type] || d.type}: {d.value}</span>
                      </span>
                      <Badge tone={VERIFICATION_TONE[d.verificationStatus] || "neutral"}>
                        {VERIFICATION_LABELS[d.verificationStatus] || d.verificationStatus}
                      </Badge>
                    </div>
                  ))}
                </div>
              ) : (
                <p className={styles.description}>Nenhum documento adicional cadastrado.</p>
              )}
            </Card>

            <Card title="Endereço">
              {person.address ? (
                <>
                  <p className={styles.meta}>
                    {person.address.street || "—"}{person.address.number ? `, ${person.address.number}` : ""}
                    {person.address.complement ? ` — ${person.address.complement}` : ""}
                  </p>
                  <p className={styles.meta}>
                    {person.address.neighborhood}, {person.address.city} — {person.address.state} · CEP {person.address.zipCode}
                  </p>
                  <div className={styles.mapEmbed}>
                    <iframe
                      src={buildGoogleMapsEmbedUrl(person.address)}
                      title="Localização do contato"
                      loading="lazy"
                      referrerPolicy="no-referrer-when-downgrade"
                    />
                  </div>
                  <a
                    href={buildGoogleMapsUrl(person.address)}
                    target="_blank"
                    rel="noopener noreferrer"
                    className={styles.mapLink}
                  >
                    <Icon name="mapPin" size={16} />
                    Ver no Google Maps
                  </a>
                </>
              ) : (
                <p className={styles.description}>Sem endereço cadastrado.</p>
              )}
            </Card>
          </div>

          <div className={styles.sideCol}>
            <Card title="Resumo">
              <div className={styles.summaryList}>
                <div className={styles.summaryRow}>
                  <span className={styles.summaryLabel}>Tipo</span>
                  <span className={styles.summaryValue}>{person.personType === "PF" ? "Pessoa física" : "Pessoa jurídica"}</span>
                </div>
                <div className={styles.summaryRow}>
                  <span className={styles.summaryLabel}>Status</span>
                  <Badge tone={STATUS_TONE[person.status] || "neutral"}>{STATUS_LABELS[person.status] || person.status}</Badge>
                </div>
                <div className={styles.summaryRow}>
                  <span className={styles.summaryLabel}>Papéis</span>
                  <div className={styles.summaryRoles}>
                    {person.roles.map((role) => (
                      <Badge key={role} tone={ROLE_TONE[role] || "neutral"}>{ROLE_LABELS[role] || role}</Badge>
                    ))}
                  </div>
                </div>
                <div className={styles.summaryRow}>
                  <span className={styles.summaryLabel}>Imóveis vinculados</span>
                  <span className={styles.summaryValue}>{linkedProperties.length}</span>
                </div>
              </div>
            </Card>

            <Card title="Imóveis vinculados">
              {linkedProperties.length > 0 ? (
                <div className={styles.linkedPropertiesGrid}>
                  {linkedProperties.map((prop) => {
                    const owner = prop.owners.find((o) => o.personId === person.id);
                    return (
                      <Link href={`/painel/imoveis/${prop.id}`} className={styles.linkedPropertyCard} key={prop.id}>
                        <div
                          className={styles.linkedPropertyThumb}
                          style={{ background: GRADIENTS[Math.abs(hashCode(prop.id)) % GRADIENTS.length] }}
                        >
                          <Icon name="building" size={18} />
                        </div>
                        <div className={styles.linkedPropertyInfo}>
                          <span className={styles.linkedPropertyName}>{prop.name}</span>
                          <span className={styles.linkedPropertyMeta}>Cód. {prop.internalCode} · {prop.neighborhood}, {prop.city}</span>
                          <div className={styles.linkedPropertyTags}>
                            <Badge tone="neutral">{OWNER_ROLE_LABELS[owner?.roleCode] || owner?.roleCode}</Badge>
                            <Badge tone="neutral">{AVAILABILITY_STATUS_LABELS[prop.availabilityStatus] || prop.availabilityStatus}</Badge>
                          </div>
                        </div>
                      </Link>
                    );
                  })}
                </div>
              ) : (
                <p className={styles.description}>Nenhum imóvel vinculado a este contato ainda.</p>
              )}
            </Card>
          </div>
        </div>
      </div>

      <Modal
        open={deleteOpen}
        onClose={() => setDeleteOpen(false)}
        title="Excluir contato"
        footer={
          <>
            <Button variant="secondary" onClick={() => setDeleteOpen(false)}>Cancelar</Button>
            <Button variant="danger" onClick={handleDelete} loading={deleting}>Excluir contato</Button>
          </>
        }
      >
        <p className={styles.description}>
          Tem certeza que deseja excluir <strong>{person.legalName}</strong>? Esta ação não pode ser desfeita.
        </p>
      </Modal>

      <Modal
        open={mergeOpen}
        onClose={() => setMergeOpen(false)}
        title="Mesclar cadastros"
        footer={
          <>
            <Button variant="secondary" onClick={() => setMergeOpen(false)}>Cancelar</Button>
            <Button onClick={handleMerge} loading={merging}>Confirmar mesclagem</Button>
          </>
        }
      >
        {duplicatePartner ? (
          <>
            <p className={styles.description}>
              Escolha qual cadastro deve permanecer como canônico. O outro será marcado como
              mesclado; documentos, contatos e demais referências são remapeados para o canônico
              e um evento <code>person.merged</code> é registrado.
            </p>
            <div className={styles.compareGrid}>
              {[person, duplicatePartner].map((p) => {
                const isSelected = p.id === selectedCanonicalId;
                return (
                  <button
                    type="button"
                    key={p.id}
                    className={[styles.compareCard, isSelected ? styles.compareCardSelected : ""].filter(Boolean).join(" ")}
                    onClick={() => setCanonicalId(p.id)}
                  >
                    <span className={styles.compareCardHeader}>
                      {isSelected ? (
                        <Badge tone="brand">Manter como canônico</Badge>
                      ) : (
                        <span className={styles.compareCardPick}>Escolher este</span>
                      )}
                    </span>
                    <p className={styles.compareName}>{p.legalName}</p>
                    <p className={styles.compareMeta}>{p.taxIdNormalized}</p>
                    <p className={styles.compareMeta}>Cadastrado em {formatDate(p.createdAt)}</p>
                  </button>
                );
              })}
            </div>
          </>
        ) : null}
      </Modal>
    </AppShell>
  );
}
