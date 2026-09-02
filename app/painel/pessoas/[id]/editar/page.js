"use client";

import { useEffect, useState } from "react";
import { useRouter, notFound } from "next/navigation";
import AppShell from "@/components/organisms/AppShell/AppShell";
import Card from "@/components/molecules/Card/Card";
import Button from "@/components/atoms/Button/Button";
import Input from "@/components/atoms/Input/Input";
import Select from "@/components/atoms/Select/Select";
import Icon from "@/components/atoms/Icon/Icon";
import FormField from "@/components/molecules/FormField/FormField";
import Alert from "@/components/molecules/Alert/Alert";
import { SkeletonDetail } from "@/components/molecules/SkeletonPatterns/SkeletonPatterns";
import { ROLE_LABELS, CONTACT_TYPE_LABELS, DOCUMENT_TYPE_LABELS } from "@/lib/mock/people";
import {
  getPerson,
  updatePerson,
  listPersonRoles,
  createRole,
  removeRole,
  createContact,
  updateContact,
  removeContact,
  createDocument,
  updateDocument,
  removeDocument,
} from "@/lib/api/people";
import { formatTaxId } from "@/lib/format";
import styles from "./page.module.css";

const EMPTY_CONTACT = { id: null, type: "PHONE", value: "", primary: false };
const EMPTY_DOCUMENT = { id: null, type: "RG", value: "" };

export default function EditarPessoaPage({ params }) {
  const router = useRouter();
  const [loading, setLoading] = useState(true);
  const [loadError, setLoadError] = useState("");
  const [notFoundFlag, setNotFoundFlag] = useState(false);
  const [submitting, setSubmitting] = useState(false);
  const [submitError, setSubmitError] = useState("");

  const [basic, setBasic] = useState(null);
  const [initialRoles, setInitialRoles] = useState([]); // [{id, roleCode}]
  const [roles, setRoles] = useState([]); // roleCodes selecionados agora
  const [initialContacts, setInitialContacts] = useState([]);
  const [contacts, setContacts] = useState([]);
  const [initialDocuments, setInitialDocuments] = useState([]);
  const [documents, setDocuments] = useState([]);

  useEffect(() => {
    let cancelled = false;
    Promise.all([getPerson(params.id), listPersonRoles(params.id)])
      .then(([person, personRoles]) => {
        if (cancelled) return;
        setBasic({
          personType: person.personType,
          legalName: person.legalName,
          preferredName: person.preferredName || "",
          taxIdNormalized: person.taxIdNormalized || "",
          birthOrFoundationDate: person.birthOrFoundationDate ? person.birthOrFoundationDate.slice(0, 10) : "",
          status: person.status,
        });
        setInitialRoles(personRoles);
        setRoles(personRoles.map((r) => r.roleCode));
        const mappedContacts = person.contacts.map((c) => ({ id: c.id, type: c.type, value: c.value, primary: c.primary }));
        setInitialContacts(mappedContacts);
        setContacts(mappedContacts.length ? mappedContacts : [{ ...EMPTY_CONTACT, primary: true }]);
        const mappedDocuments = person.documents.map((d) => ({ id: d.id, type: d.type, value: d.value || "" }));
        setInitialDocuments(mappedDocuments);
        setDocuments(mappedDocuments);
      })
      .catch((err) => {
        if (cancelled) return;
        if (err?.status === 404) setNotFoundFlag(true);
        else setLoadError(err?.message || "Não foi possível carregar o contato.");
      })
      .finally(() => {
        if (!cancelled) setLoading(false);
      });
    return () => {
      cancelled = true;
    };
  }, [params.id]);

  if (notFoundFlag) return notFound();

  if (loading) {
    return (
      <AppShell title="Editar contato" backHref={`/painel/pessoas/${params.id}`}>
        <SkeletonDetail />
      </AppShell>
    );
  }

  if (loadError || !basic) {
    return (
      <AppShell title="Editar contato" backHref="/painel/pessoas">
        <Alert tone="danger" title="Não foi possível carregar o contato">{loadError}</Alert>
      </AppShell>
    );
  }

  function toggleRole(role) {
    setRoles((prev) => (prev.includes(role) ? prev.filter((r) => r !== role) : [...prev, role]));
  }

  function updateContactField(index, field, value) {
    setContacts((prev) => prev.map((c, i) => (i === index ? { ...c, [field]: value } : c)));
  }

  function setPrimaryContact(index) {
    setContacts((prev) => prev.map((c, i) => ({ ...c, primary: i === index })));
  }

  function addContact() {
    setContacts((prev) => [...prev, { ...EMPTY_CONTACT }]);
  }

  function removeContactRow(index) {
    setContacts((prev) => prev.filter((_, i) => i !== index));
  }

  function updateDocumentField(index, field, value) {
    setDocuments((prev) => prev.map((d, i) => (i === index ? { ...d, [field]: value } : d)));
  }

  function addDocument() {
    setDocuments((prev) => [...prev, { ...EMPTY_DOCUMENT }]);
  }

  function removeDocumentRow(index) {
    setDocuments((prev) => prev.filter((_, i) => i !== index));
  }

  async function handleSubmit() {
    setSubmitting(true);
    setSubmitError("");
    try {
      await updatePerson(params.id, {
        legalName: basic.legalName,
        preferredName: basic.preferredName || null,
        personType: basic.personType,
        taxIdNormalized: basic.taxIdNormalized.replace(/\D/g, "") || null,
        birthOrFoundationDate: basic.birthOrFoundationDate || null,
        status: basic.status,
      });

      // Papéis: cria os novos, remove os que saíram da seleção.
      const rolesToAdd = roles.filter((code) => !initialRoles.some((r) => r.roleCode === code));
      const rolesToRemove = initialRoles.filter((r) => !roles.includes(r.roleCode));
      for (const code of rolesToAdd) await createRole(params.id, { roleCode: code });
      for (const r of rolesToRemove) await removeRole(params.id, r.id);

      // Contatos: sem id = novo (cria); com id ainda presente = atualiza; id que sumiu = remove.
      const currentContactIds = new Set(contacts.filter((c) => c.id).map((c) => c.id));
      for (const original of initialContacts) {
        if (!currentContactIds.has(original.id)) await removeContact(params.id, original.id);
      }
      for (const contact of contacts) {
        if (!contact.value.trim()) continue;
        if (contact.id) {
          const original = initialContacts.find((c) => c.id === contact.id);
          if (original && (original.type !== contact.type || original.value !== contact.value || original.primary !== contact.primary)) {
            await updateContact(params.id, contact.id, {
              contactType: contact.type,
              valueNormalized: contact.value.trim(),
              isPrimary: !!contact.primary,
            });
          }
        } else {
          await createContact(params.id, {
            contactType: contact.type,
            valueNormalized: contact.value.trim(),
            isPrimary: !!contact.primary,
          });
        }
      }

      // Documentos: mesma lógica de diff dos contatos.
      const currentDocumentIds = new Set(documents.filter((d) => d.id).map((d) => d.id));
      for (const original of initialDocuments) {
        if (!currentDocumentIds.has(original.id)) await removeDocument(params.id, original.id);
      }
      for (const doc of documents) {
        if (!doc.value.trim()) continue;
        if (doc.id) {
          const original = initialDocuments.find((d) => d.id === doc.id);
          if (original && (original.type !== doc.type || original.value !== doc.value)) {
            await updateDocument(params.id, doc.id, { documentType: doc.type, fileId: doc.value.trim() });
          }
        } else {
          await createDocument(params.id, { documentType: doc.type, fileId: doc.value.trim() });
        }
      }

      router.push(`/painel/pessoas/${params.id}`);
    } catch (err) {
      setSubmitError(err?.message || "Não foi possível salvar as alterações.");
      setSubmitting(false);
    }
  }

  return (
    <AppShell title="Editar contato" backHref={`/painel/pessoas/${params.id}`}>
      <div className={styles.wrap}>
        {submitError ? <Alert tone="danger" title="Não foi possível salvar">{submitError}</Alert> : null}

        <Card title="Dados básicos" className={styles.card}>
          <div className={styles.formGrid}>
            <FormField label="Tipo de pessoa" htmlFor="e-type">
              <Select id="e-type" value={basic.personType} onChange={(e) => setBasic({ ...basic, personType: e.target.value })}>
                <option value="PF">Pessoa física</option>
                <option value="PJ">Pessoa jurídica</option>
              </Select>
            </FormField>
            <FormField label="Status" htmlFor="e-status">
              <Select id="e-status" value={basic.status} onChange={(e) => setBasic({ ...basic, status: e.target.value })}>
                <option value="ACTIVE">Ativo</option>
                <option value="INACTIVE">Inativo</option>
              </Select>
            </FormField>
            <div className={styles.span2}>
              <FormField label="Nome / Razão social" htmlFor="e-name" required>
                <Input id="e-name" value={basic.legalName} onChange={(e) => setBasic({ ...basic, legalName: e.target.value })} />
              </FormField>
            </div>
            <FormField label="Nome de uso" htmlFor="e-preferred">
              <Input id="e-preferred" value={basic.preferredName} onChange={(e) => setBasic({ ...basic, preferredName: e.target.value })} />
            </FormField>
            <FormField label={basic.personType === "PJ" ? "CNPJ" : "CPF"} htmlFor="e-doc">
              <Input
                id="e-doc"
                value={basic.taxIdNormalized}
                onChange={(e) => setBasic({ ...basic, taxIdNormalized: formatTaxId(e.target.value, basic.personType) })}
              />
            </FormField>
            <FormField label={basic.personType === "PF" ? "Data de nascimento" : "Data de fundação"} htmlFor="e-birth">
              <Input id="e-birth" type="date" value={basic.birthOrFoundationDate} onChange={(e) => setBasic({ ...basic, birthOrFoundationDate: e.target.value })} />
            </FormField>
            <div className={styles.span2}>
              <FormField label="Papéis" helper="Selecione um ou mais papéis para este contato.">
                <div className={styles.roleGrid}>
                  {Object.entries(ROLE_LABELS).map(([code, label]) => (
                    <button
                      type="button"
                      key={code}
                      className={[styles.roleChip, roles.includes(code) ? styles.roleChipActive : ""].filter(Boolean).join(" ")}
                      onClick={() => toggleRole(code)}
                      aria-pressed={roles.includes(code)}
                    >
                      {label}
                    </button>
                  ))}
                </div>
              </FormField>
            </div>
          </div>
        </Card>

        <Card title="Contatos" className={styles.card}>
          <div className={styles.rowsWrap}>
            {contacts.map((contact, index) => (
              <div className={styles.contactRow} key={contact.id || `new-${index}`}>
                <FormField label="Tipo" htmlFor={`e-contact-type-${index}`}>
                  <Select id={`e-contact-type-${index}`} value={contact.type} onChange={(e) => updateContactField(index, "type", e.target.value)}>
                    {Object.entries(CONTACT_TYPE_LABELS).map(([value, label]) => (
                      <option key={value} value={value}>{label}</option>
                    ))}
                  </Select>
                </FormField>
                <FormField label="Valor" htmlFor={`e-contact-value-${index}`} required>
                  <Input
                    id={`e-contact-value-${index}`}
                    placeholder={contact.type === "EMAIL" ? "nome@email.com" : "(11) 90000-0000"}
                    value={contact.value}
                    onChange={(e) => updateContactField(index, "value", e.target.value)}
                  />
                </FormField>
                <label className={styles.primaryToggle}>
                  <input type="radio" name="primary-contact" checked={contact.primary} onChange={() => setPrimaryContact(index)} />
                  Principal
                </label>
                {contacts.length > 1 ? (
                  <button type="button" className={styles.removeRow} onClick={() => removeContactRow(index)} aria-label="Remover contato">
                    <Icon name="trash" size={16} />
                  </button>
                ) : null}
              </div>
            ))}
          </div>
          <Button variant="secondary" size="sm" onClick={addContact} className={styles.addRowBtn}>
            <Icon name="plus" size={14} /> Adicionar contato
          </Button>
        </Card>

        <Card title="Documentos" className={styles.card}>
          {documents.length === 0 ? (
            <p className={styles.emptyRows}>Nenhum documento adicionado.</p>
          ) : (
            <div className={styles.rowsWrap}>
              {documents.map((doc, index) => (
                <div className={styles.documentRow} key={doc.id || `new-${index}`}>
                  <FormField label="Tipo" htmlFor={`e-doc-type-${index}`}>
                    <Select id={`e-doc-type-${index}`} value={doc.type} onChange={(e) => updateDocumentField(index, "type", e.target.value)}>
                      {Object.entries(DOCUMENT_TYPE_LABELS).map(([value, label]) => (
                        <option key={value} value={value}>{label}</option>
                      ))}
                    </Select>
                  </FormField>
                  <FormField label="Número / referência" htmlFor={`e-doc-value-${index}`}>
                    <Input id={`e-doc-value-${index}`} value={doc.value} onChange={(e) => updateDocumentField(index, "value", e.target.value)} />
                  </FormField>
                  <button type="button" className={styles.removeRow} onClick={() => removeDocumentRow(index)} aria-label="Remover documento">
                    <Icon name="trash" size={16} />
                  </button>
                </div>
              ))}
            </div>
          )}
          <Button variant="secondary" size="sm" onClick={addDocument} className={styles.addRowBtn}>
            <Icon name="plus" size={14} /> Adicionar documento
          </Button>
        </Card>
      </div>

      <div className={styles.actionBar}>
        <div className={styles.actionBarInner}>
          <Button variant="secondary" size="sm" onClick={() => router.push(`/painel/pessoas/${params.id}`)}>
            Cancelar
          </Button>
          <Button size="sm" onClick={handleSubmit} loading={submitting}>
            Salvar alterações
          </Button>
        </div>
      </div>
    </AppShell>
  );
}
