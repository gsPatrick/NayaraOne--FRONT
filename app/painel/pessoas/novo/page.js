"use client";

import { useEffect, useRef, useState } from "react";
import { useRouter } from "next/navigation";
import AppShell from "@/components/organisms/AppShell/AppShell";
import StepHeader from "@/components/organisms/StepHeader/StepHeader";
import Card from "@/components/molecules/Card/Card";
import Button from "@/components/atoms/Button/Button";
import Input from "@/components/atoms/Input/Input";
import Select from "@/components/atoms/Select/Select";
import Icon from "@/components/atoms/Icon/Icon";
import Badge from "@/components/atoms/Badge/Badge";
import Spinner from "@/components/atoms/Spinner/Spinner";
import FormField from "@/components/molecules/FormField/FormField";
import Alert from "@/components/molecules/Alert/Alert";
import LocationPicker from "@/components/molecules/LocationPicker/LocationPicker";
import PhotoUpload from "@/components/molecules/PhotoUpload/PhotoUpload";
import Avatar from "@/components/atoms/Avatar/Avatar";
import {
  PEOPLE,
  ROLE_LABELS,
  CONTACT_TYPE_LABELS,
  DOCUMENT_TYPE_LABELS,
} from "@/lib/mock/people";
import { PROPERTIES, OWNER_ROLE_LABELS } from "@/lib/mock/properties";
import { fetchAddressByCep } from "@/lib/cep";
import { formatTaxId } from "@/lib/format";
import { buildGoogleMapsUrl } from "@/lib/maps";
import styles from "./page.module.css";

const STEPS = [
  { id: "basico", label: "Dados básicos" },
  { id: "contatos", label: "Contatos e documentos" },
  { id: "endereco", label: "Endereço" },
  { id: "revisao", label: "Revisão" },
];

const EMPTY_ADDRESS = {
  zipCode: "", street: "", number: "", complement: "", neighborhood: "", city: "", state: "",
  latitude: "", longitude: "",
};
const EMPTY_CONTACT = { type: "PHONE", value: "", primary: false, consentStatus: "PENDING" };
const EMPTY_DOCUMENT = { type: "RG", value: "", verificationStatus: "PENDING" };

export default function NovaPessoaPage() {
  const router = useRouter();
  const [stepIndex, setStepIndex] = useState(0);
  const [submitting, setSubmitting] = useState(false);
  const [duplicateError, setDuplicateError] = useState("");

  const [basic, setBasic] = useState({
    personType: "PF", legalName: "", preferredName: "", taxIdNormalized: "", birthOrFoundationDate: "",
  });
  const [photoUrl, setPhotoUrl] = useState(null);
  const [roles, setRoles] = useState(["PROPRIETARIO"]);
  const [linkedProperties, setLinkedProperties] = useState([]);
  const [propertySearch, setPropertySearch] = useState("");
  const [contacts, setContacts] = useState([{ ...EMPTY_CONTACT, primary: true }]);
  const [documents, setDocuments] = useState([]);
  const [address, setAddress] = useState({ ...EMPTY_ADDRESS });

  const [cepLoading, setCepLoading] = useState(false);
  const [cepMessage, setCepMessage] = useState("");
  const cepRequestIdRef = useRef(0);
  const cepDebounceRef = useRef(null);
  const mountedRef = useRef(true);

  useEffect(() => {
    mountedRef.current = true;
    return () => {
      mountedRef.current = false;
      if (cepDebounceRef.current) window.clearTimeout(cepDebounceRef.current);
    };
  }, []);

  function runCepLookup(rawCep) {
    const digits = String(rawCep || "").replace(/\D/g, "");
    if (digits.length !== 8) return;
    const requestId = ++cepRequestIdRef.current;
    setCepLoading(true);
    setCepMessage("");
    fetchAddressByCep(digits).then((result) => {
      if (!mountedRef.current || requestId !== cepRequestIdRef.current) return;
      setCepLoading(false);
      if (result) {
        setAddress((prev) => ({
          ...prev,
          street: result.street || prev.street,
          neighborhood: result.neighborhood || prev.neighborhood,
          city: result.city || prev.city,
          state: result.state || prev.state,
        }));
      } else {
        setCepMessage("CEP não encontrado, preencha manualmente.");
      }
    });
  }

  function handleCepChange(value) {
    setAddress((prev) => ({ ...prev, zipCode: value }));
    setCepMessage("");
    if (cepDebounceRef.current) window.clearTimeout(cepDebounceRef.current);
    const digits = value.replace(/\D/g, "");
    if (digits.length === 8) {
      cepDebounceRef.current = window.setTimeout(() => runCepLookup(value), 400);
    }
  }

  function handleCepBlur(value) {
    if (cepDebounceRef.current) window.clearTimeout(cepDebounceRef.current);
    runCepLookup(value);
  }

  const step = STEPS[stepIndex];
  const isLast = stepIndex === STEPS.length - 1;
  const isFirst = stepIndex === 0;

  // Percentual de preenchimento dos campos obrigatórios de cada etapa — exibido no hover do StepHeader.
  const stepCompletion = STEPS.map((s) => {
    if (s.id === "basico") {
      const required = [basic.legalName, basic.taxIdNormalized];
      const done = required.filter((v) => String(v || "").trim()).length;
      return Math.round((done / required.length) * 100);
    }
    if (s.id === "contatos") return contacts.some((c) => c.value.trim()) ? 100 : 0;
    if (s.id === "endereco") {
      const required = [address.zipCode, address.street, address.neighborhood, address.city, address.state];
      const done = required.filter((v) => String(v || "").trim()).length;
      return Math.round((done / required.length) * 100);
    }
    return 100;
  });

  function toggleRole(role) {
    setRoles((prev) => (prev.includes(role) ? prev.filter((r) => r !== role) : [...prev, role]));
  }

  function togglePropertyLink(propertyId) {
    setLinkedProperties((prev) =>
      prev.some((p) => p.propertyId === propertyId)
        ? prev.filter((p) => p.propertyId !== propertyId)
        : [...prev, { propertyId, roleCode: "OWNER", percentage: 100 }]
    );
  }

  function updatePropertyLink(propertyId, field, value) {
    setLinkedProperties((prev) => prev.map((p) => (p.propertyId === propertyId ? { ...p, [field]: value } : p)));
  }

  function updateContact(index, field, value) {
    setContacts((prev) => prev.map((c, i) => (i === index ? { ...c, [field]: value } : c)));
  }

  function setPrimaryContact(index) {
    setContacts((prev) => prev.map((c, i) => ({ ...c, primary: i === index })));
  }

  function addContact() {
    setContacts((prev) => [...prev, { ...EMPTY_CONTACT }]);
  }

  function removeContact(index) {
    setContacts((prev) => prev.filter((_, i) => i !== index));
  }

  function updateDocument(index, field, value) {
    setDocuments((prev) => prev.map((d, i) => (i === index ? { ...d, [field]: value } : d)));
  }

  function addDocument() {
    setDocuments((prev) => [...prev, { ...EMPTY_DOCUMENT }]);
  }

  function removeDocument(index) {
    setDocuments((prev) => prev.filter((_, i) => i !== index));
  }

  function goNext() {
    if (step.id === "basico") {
      const digits = basic.taxIdNormalized.replace(/\D/g, "");
      const conflict = PEOPLE.find((p) => p.taxIdNormalized.replace(/\D/g, "") === digits && digits.length > 0);
      if (conflict) {
        setDuplicateError(
          `Já existe um cadastro com este documento (${conflict.legalName}). Corrija o CPF/CNPJ informado ou revise o cadastro existente.`
        );
        return;
      }
      setDuplicateError("");
    }

    if (isLast) {
      setSubmitting(true);
      const payload = {
        personType: basic.personType,
        legalName: basic.legalName,
        preferredName: basic.preferredName || null,
        taxIdNormalized: basic.taxIdNormalized,
        birthOrFoundationDate: basic.birthOrFoundationDate || null,
        photoUrl,
        status: "ACTIVE",
        roles,
        contacts,
        documents,
        address,
        propertyLinks: linkedProperties,
      };
      // eslint-disable-next-line no-console
      console.log("[mock] nova pessoa", payload);
      window.setTimeout(() => router.push("/painel/pessoas"), 500);
      return;
    }
    setStepIndex((i) => Math.min(i + 1, STEPS.length - 1));
  }

  function goBack() {
    if (isFirst) {
      router.push("/painel/pessoas");
      return;
    }
    setStepIndex((i) => Math.max(i - 1, 0));
  }

  return (
    <AppShell title="Novo contato" backHref="/painel/pessoas">
      <div className={styles.page}>
        <div className={styles.wrap}>
          <div className={styles.stepHeaderWrap}>
            <StepHeader steps={STEPS} activeIndex={stepIndex} completion={stepCompletion} />
          </div>

          <Card className={styles.card}>
            {step.id === "basico" ? (
              <div className={styles.formGrid}>
                {duplicateError ? (
                  <div className={styles.span2}>
                    <Alert tone="danger" title="Cadastro duplicado (409)">{duplicateError}</Alert>
                  </div>
                ) : null}
                <div className={styles.span2}>
                  <FormField label="Foto" htmlFor="p-photo" helper="Opcional — ajuda a identificar a pessoa rapidamente">
                    <PhotoUpload name={basic.legalName || "Novo contato"} value={photoUrl} onChange={setPhotoUrl} />
                  </FormField>
                </div>
                <FormField label="Tipo de pessoa" htmlFor="p-type">
                  <Select
                    id="p-type"
                    value={basic.personType}
                    onChange={(e) => setBasic({ ...basic, personType: e.target.value, taxIdNormalized: "" })}
                  >
                    <option value="PF">Pessoa física</option>
                    <option value="PJ">Pessoa jurídica</option>
                  </Select>
                </FormField>
                <FormField
                  label={basic.personType === "PF" ? "Data de nascimento" : "Data de fundação"}
                  htmlFor="p-birth"
                >
                  <Input
                    id="p-birth"
                    type="date"
                    value={basic.birthOrFoundationDate}
                    onChange={(e) => setBasic({ ...basic, birthOrFoundationDate: e.target.value })}
                  />
                </FormField>
                <div className={styles.span2}>
                  <FormField label="Nome / Razão social" htmlFor="p-name" required>
                    <Input
                      id="p-name"
                      placeholder="Nome completo ou razão social"
                      value={basic.legalName}
                      onChange={(e) => setBasic({ ...basic, legalName: e.target.value })}
                    />
                  </FormField>
                </div>
                <FormField
                  label="Nome de uso"
                  htmlFor="p-preferred"
                  helper="Apelido ou nome fantasia — opcional."
                >
                  <Input
                    id="p-preferred"
                    placeholder="Ex.: Nina"
                    value={basic.preferredName}
                    onChange={(e) => setBasic({ ...basic, preferredName: e.target.value })}
                  />
                </FormField>
                <FormField label={basic.personType === "PJ" ? "CNPJ" : "CPF"} htmlFor="p-doc" required>
                  <Input
                    id="p-doc"
                    placeholder={basic.personType === "PJ" ? "00.000.000/0000-00" : "000.000.000-00"}
                    value={basic.taxIdNormalized}
                    onChange={(e) => setBasic({ ...basic, taxIdNormalized: formatTaxId(e.target.value, basic.personType) })}
                  />
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

                {roles.includes("PROPRIETARIO") || roles.includes("LOCATARIO") || roles.includes("FIADOR") || roles.includes("COMPRADOR") ? (
                  <div className={styles.span2}>
                    <FormField label="Imóveis vinculados" helper="Selecione os imóveis já cadastrados que este contato está vinculado.">
                      <Input
                        placeholder="Pesquisar imóvel pelo nome..."
                        value={propertySearch}
                        onChange={(e) => setPropertySearch(e.target.value)}
                        className={styles.propertySearchInput}
                      />
                      <div className={styles.propertyLinkList}>
                        {PROPERTIES.filter((prop) =>
                          prop.name.toLowerCase().includes(propertySearch.trim().toLowerCase())
                        ).map((prop) => {
                          const link = linkedProperties.find((p) => p.propertyId === prop.id);
                          return (
                            <div key={prop.id} className={styles.propertyLinkRow}>
                              <label className={styles.propertyLinkCheckbox}>
                                <input
                                  type="checkbox"
                                  checked={Boolean(link)}
                                  onChange={() => togglePropertyLink(prop.id)}
                                />
                                <span>
                                  {prop.name}
                                  <span className={styles.propertyLinkCode}> · Cód. {prop.internalCode}</span>
                                </span>
                              </label>
                              {link ? (
                                <div className={styles.propertyLinkFields}>
                                  <Select
                                    value={link.roleCode}
                                    onChange={(e) => updatePropertyLink(prop.id, "roleCode", e.target.value)}
                                    aria-label={`Papel em ${prop.name}`}
                                  >
                                    {Object.entries(OWNER_ROLE_LABELS).map(([value, label]) => (
                                      <option key={value} value={value}>{label}</option>
                                    ))}
                                  </Select>
                                  <Input
                                    type="number"
                                    value={link.percentage}
                                    onChange={(e) => updatePropertyLink(prop.id, "percentage", e.target.value)}
                                    aria-label={`Percentual em ${prop.name}`}
                                    placeholder="%"
                                  />
                                </div>
                              ) : null}
                            </div>
                          );
                        })}
                        {PROPERTIES.filter((prop) => prop.name.toLowerCase().includes(propertySearch.trim().toLowerCase())).length === 0 ? (
                          <p className={styles.propertyLinkEmpty}>Nenhum imóvel encontrado.</p>
                        ) : null}
                      </div>
                    </FormField>
                  </div>
                ) : null}
              </div>
            ) : null}

            {step.id === "contatos" ? (
              <div className={styles.subSectionsWrap}>
                <div>
                  <p className={styles.sectionTitle}>Contatos</p>
                  <div className={styles.rowsWrap}>
                    {contacts.map((contact, index) => (
                      <div className={styles.contactRow} key={index}>
                        <FormField label="Tipo" htmlFor={`p-contact-type-${index}`}>
                          <Select
                            id={`p-contact-type-${index}`}
                            value={contact.type}
                            onChange={(e) => updateContact(index, "type", e.target.value)}
                          >
                            {Object.entries(CONTACT_TYPE_LABELS).map(([value, label]) => (
                              <option key={value} value={value}>{label}</option>
                            ))}
                          </Select>
                        </FormField>
                        <FormField label="Valor" htmlFor={`p-contact-value-${index}`} required>
                          <Input
                            id={`p-contact-value-${index}`}
                            placeholder={contact.type === "EMAIL" ? "nome@email.com" : "(11) 90000-0000"}
                            value={contact.value}
                            onChange={(e) => updateContact(index, "value", e.target.value)}
                          />
                        </FormField>
                        <label className={styles.primaryToggle}>
                          <input
                            type="radio"
                            name="primary-contact"
                            checked={contact.primary}
                            onChange={() => setPrimaryContact(index)}
                          />
                          Principal
                        </label>
                        {contacts.length > 1 ? (
                          <button type="button" className={styles.removeRow} onClick={() => removeContact(index)} aria-label="Remover contato">
                            <Icon name="trash" size={16} />
                          </button>
                        ) : null}
                      </div>
                    ))}
                  </div>
                  <Button variant="secondary" size="sm" onClick={addContact} className={styles.addRowBtn}>
                    <Icon name="plus" size={14} /> Adicionar contato
                  </Button>
                </div>

                <div className={styles.documentsSection}>
                  <p className={styles.sectionTitle}>Documentos</p>
                  {documents.length === 0 ? (
                    <p className={styles.emptyRows}>Nenhum documento adicionado — CPF/CNPJ já é registrado nos dados básicos.</p>
                  ) : (
                    <div className={styles.rowsWrap}>
                      {documents.map((doc, index) => (
                        <div className={styles.documentRow} key={index}>
                          <FormField label="Tipo" htmlFor={`p-doc-type-${index}`}>
                            <Select
                              id={`p-doc-type-${index}`}
                              value={doc.type}
                              onChange={(e) => updateDocument(index, "type", e.target.value)}
                            >
                              {Object.entries(DOCUMENT_TYPE_LABELS).map(([value, label]) => (
                                <option key={value} value={value}>{label}</option>
                              ))}
                            </Select>
                          </FormField>
                          <FormField label="Número / referência" htmlFor={`p-doc-value-${index}`}>
                            <Input
                              id={`p-doc-value-${index}`}
                              value={doc.value}
                              onChange={(e) => updateDocument(index, "value", e.target.value)}
                            />
                          </FormField>
                          <button type="button" className={styles.removeRow} onClick={() => removeDocument(index)} aria-label="Remover documento">
                            <Icon name="trash" size={16} />
                          </button>
                        </div>
                      ))}
                    </div>
                  )}
                  <Button variant="secondary" size="sm" onClick={addDocument} className={styles.addRowBtn}>
                    <Icon name="plus" size={14} /> Adicionar documento
                  </Button>
                </div>
              </div>
            ) : null}

            {step.id === "endereco" ? (
              <div className={styles.formGrid}>
                <FormField label="CEP" htmlFor="p-zip" required helper={cepMessage || "Digite o CEP para preencher o endereço automaticamente."}>
                  <div className={styles.cepField}>
                    <Input
                      id="p-zip"
                      placeholder="00000-000"
                      value={address.zipCode}
                      onChange={(e) => handleCepChange(e.target.value)}
                      onBlur={(e) => handleCepBlur(e.target.value)}
                    />
                    {cepLoading ? <Spinner size="sm" className={styles.cepSpinner} /> : null}
                  </div>
                </FormField>
                <FormField label="Cidade" htmlFor="p-city" required>
                  <Input id="p-city" placeholder="Preenchida pelo CEP" value={address.city} onChange={(e) => setAddress({ ...address, city: e.target.value })} />
                </FormField>
                <div className={styles.span2}>
                  <FormField label="Logradouro" htmlFor="p-street" required>
                    <Input id="p-street" value={address.street} onChange={(e) => setAddress({ ...address, street: e.target.value })} />
                  </FormField>
                </div>
                <FormField label="Número" htmlFor="p-number">
                  <Input id="p-number" value={address.number} onChange={(e) => setAddress({ ...address, number: e.target.value })} />
                </FormField>
                <FormField label="Complemento" htmlFor="p-complement">
                  <Input id="p-complement" value={address.complement} onChange={(e) => setAddress({ ...address, complement: e.target.value })} />
                </FormField>
                <FormField label="Bairro" htmlFor="p-neighborhood" required>
                  <Input id="p-neighborhood" value={address.neighborhood} onChange={(e) => setAddress({ ...address, neighborhood: e.target.value })} />
                </FormField>
                <FormField label="UF" htmlFor="p-state" required>
                  <Input id="p-state" maxLength={2} placeholder="SP" value={address.state} onChange={(e) => setAddress({ ...address, state: e.target.value.toUpperCase() })} />
                </FormField>
                <div className={styles.span2}>
                  <FormField label="Geolocalização" helper="O mapa segue o endereço digitado — clique nele para marcar o ponto exato, se precisar ajustar.">
                    <LocationPicker
                      address={address}
                      onPick={(lat, lng) => setAddress((prev) => ({ ...prev, latitude: lat, longitude: lng }))}
                    />
                    <a
                      href={buildGoogleMapsUrl(address)}
                      target="_blank"
                      rel="noopener noreferrer"
                      className={styles.mapLink}
                    >
                      <Icon name="mapPin" size={16} />
                      Abrir no Google Maps
                    </a>
                  </FormField>
                </div>
              </div>
            ) : null}

            {step.id === "revisao" ? (
              <div className={styles.reviewWrap}>
                <div className={styles.reviewSection}>
                  <p className={styles.reviewTitle}>Dados básicos</p>
                  <div className={styles.reviewNameRow}>
                    <Avatar name={basic.legalName || "?"} src={photoUrl} size="lg" />
                    <p className={styles.reviewName}>
                      {basic.legalName || "—"}{basic.preferredName ? ` (conhecida como ${basic.preferredName})` : ""}
                    </p>
                  </div>
                  <p className={styles.reviewMeta}>{basic.personType === "PF" ? "Pessoa física" : "Pessoa jurídica"} · {basic.taxIdNormalized || "—"}</p>
                  <p className={styles.reviewMeta}>
                    {basic.personType === "PF" ? "Nascimento" : "Fundação"}: {basic.birthOrFoundationDate || "—"}
                  </p>
                  <div className={styles.reviewChips}>
                    {roles.map((r) => <Badge tone="neutral" key={r}>{ROLE_LABELS[r]}</Badge>)}
                  </div>
                </div>

                <div className={styles.reviewSection}>
                  <p className={styles.reviewTitle}>Contatos</p>
                  {contacts.map((c, i) => (
                    <p className={styles.reviewMeta} key={i}>
                      {CONTACT_TYPE_LABELS[c.type]}: {c.value || "—"} {c.primary ? "· Principal" : ""}
                    </p>
                  ))}
                </div>

                <div className={styles.reviewSection}>
                  <p className={styles.reviewTitle}>Documentos</p>
                  {documents.length > 0 ? documents.map((d, i) => (
                    <p className={styles.reviewMeta} key={i}>{DOCUMENT_TYPE_LABELS[d.type]}: {d.value || "—"}</p>
                  )) : <p className={styles.reviewMeta}>Nenhum documento adicionado.</p>}
                </div>

                <div className={styles.reviewSection}>
                  <p className={styles.reviewTitle}>Endereço</p>
                  <p className={styles.reviewMeta}>
                    {address.street || "—"}{address.number ? `, ${address.number}` : ""}{address.complement ? ` — ${address.complement}` : ""}
                  </p>
                  <p className={styles.reviewMeta}>{address.neighborhood || "—"}, {address.city || "—"} {address.state ? `— ${address.state}` : ""}</p>
                  <p className={styles.reviewMeta}>CEP {address.zipCode || "—"}</p>
                </div>

                {linkedProperties.length > 0 ? (
                  <div className={styles.reviewSection}>
                    <p className={styles.reviewTitle}>Imóveis vinculados</p>
                    {linkedProperties.map((link) => {
                      const prop = PROPERTIES.find((p) => p.id === link.propertyId);
                      return (
                        <p className={styles.reviewMeta} key={link.propertyId}>
                          {prop?.name || "—"} · {OWNER_ROLE_LABELS[link.roleCode] || link.roleCode} · {link.percentage}%
                        </p>
                      );
                    })}
                  </div>
                ) : null}
              </div>
            ) : null}
          </Card>
        </div>
      </div>

      <div className={styles.actionBar}>
        <div className={styles.actionBarInner}>
          <Button variant="secondary" size="sm" onClick={goBack}>
            {isFirst ? "Cancelar" : "Voltar"}
          </Button>
          <Button size="sm" onClick={goNext} loading={submitting}>
            {isLast ? "Criar contato" : "Continuar"}
          </Button>
        </div>
      </div>
    </AppShell>
  );
}
