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
import ErrorSummary from "@/components/molecules/ErrorSummary/ErrorSummary";
import { humanizeApiError } from "@/lib/errors/apiErrors";
import { FIELD_LABELS } from "@/lib/errors/fieldLabels";
import { validatePersonStep, PERSON_FIELD_IDS, PERSON_FIELD_STEP } from "@/lib/errors/personWizard";
import LocationPicker from "@/components/molecules/LocationPicker/LocationPicker";
import PhotoUpload from "@/components/molecules/PhotoUpload/PhotoUpload";
import Avatar from "@/components/atoms/Avatar/Avatar";
import useConfirm from "@/components/organisms/ConfirmDialog/useConfirm";
import {
  ROLE_LABELS,
  CONTACT_TYPE_LABELS,
  DOCUMENT_TYPE_LABELS,
} from "@/lib/mock/people";
import { OWNER_ROLE_LABELS } from "@/lib/mock/properties";
import { listPeople, createPerson } from "@/lib/api/people";
import { uploadFile } from "@/lib/api/legal";
import { listProperties, addPropertyOwner } from "@/lib/api/properties";
import { fetchAddressByCep } from "@/lib/cep";
import { formatTaxId, isDateInputInvalid, DATE_INPUT_ERROR_MESSAGE } from "@/lib/format";
import { buildGoogleMapsUrl } from "@/lib/maps";
import AsyncState from "@/components/molecules/AsyncState/AsyncState";
import { useAsyncState } from "@/lib/asyncState/useAsyncState";
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
// FIX (homologação): este campo é enviado pra API como `fileId` de "people.person_documents"
// (ver comentário perto do payload de submit) — não é um número de documento digitável, é
// referência a um ARQUIVO já enviado (scan/foto do RG/CNH). O rótulo antigo "Número/referência"
// com um campo de texto pedia o usuário digitar algo que a API nunca aceitaria de verdade
// (fileId precisa ser um UUID real de um File já existente). Agora usa upload real.
const EMPTY_DOCUMENT = { type: "RG", fileId: "", fileName: "", uploading: false, uploadError: "", verificationStatus: "PENDING" };

const ERROR_LABELS = {
  "p-name": FIELD_LABELS.legalName, "p-doc": FIELD_LABELS.taxIdNormalized, "p-birth": FIELD_LABELS.birthOrFoundationDate,
  "p-contact-value-0": "Contato", "p-zip": FIELD_LABELS.zipCode, "p-street": FIELD_LABELS.street,
  "p-neighborhood": FIELD_LABELS.neighborhood, "p-city": FIELD_LABELS.city, "p-state": FIELD_LABELS.state,
};

export default function NovaPessoaPage() {
  const router = useRouter();
  const { confirm, ConfirmDialog } = useConfirm();
  const [stepIndex, setStepIndex] = useState(0);
  const [submitting, setSubmitting] = useState(false);
  const [duplicateError, setDuplicateError] = useState("");
  const [submitError, setSubmitError] = useState("");
  // M9-D851: o botão de envio fica desabilitado enquanto salva e o foco cai no <body>; ao aparecer o erro (duplicado ou da API), o foco vai ao aviso.
  const errorRef = useRef(null);
  useEffect(() => { if ((submitError || duplicateError) && errorRef.current) errorRef.current.focus(); }, [submitError, duplicateError]);
  // M9-D851: erros por campo (id do campo -> mensagem). O resumo no topo recebe o foco a cada tentativa de avançar/enviar com erro.
  const [fieldErrors, setFieldErrors] = useState({});
  const [attempt, setAttempt] = useState(0);
  const summaryRef = useRef(null);
  useEffect(() => { if (attempt > 0 && summaryRef.current) summaryRef.current.focus(); }, [attempt]);
  function showErrors(errors) { setFieldErrors(errors); setAttempt((n) => n + 1); }
  function clearError(id) { setFieldErrors((prev) => { if (!prev[id]) return prev; const next = { ...prev }; delete next[id]; return next; }); }
  const [existingPeople, setExistingPeople] = useState([]);
  const [availableProperties, setAvailableProperties] = useState([]);

  const [basic, setBasic] = useState({
    personType: "PF", legalName: "", preferredName: "", taxIdNormalized: "", birthOrFoundationDate: "",
  });
  const [photoUrl, setPhotoUrl] = useState(null);
  // FIX AUD-001 (homologação 09/09/2026): o default era ["PROPRIETARIO"] — um papel já vinha
  // marcado por trás sem o usuário clicar em nada. Quem selecionava "Cliente" E "Proprietário"
  // pensando estar escolhendo os dois do zero na verdade DESMARCAVA o Proprietário (clicar num
  // chip já ativo remove), perdendo esse papel na hora de salvar. Nenhum papel deve vir
  // pré-selecionado — o usuário escolhe explicitamente todos os que se aplicam.
  const [roles, setRoles] = useState([]);
  const [linkedProperties, setLinkedProperties] = useState([]);
  const [propertySearch, setPropertySearch] = useState("");
  const [contacts, setContacts] = useState([{ ...EMPTY_CONTACT, primary: true }]);
  const [documents, setDocuments] = useState([]);
  const [address, setAddress] = useState({ ...EMPTY_ADDRESS });
  const [birthDateInvalid, setBirthDateInvalid] = useState(false);

  const [cepLoading, setCepLoading] = useState(false);
  const [cepMessage, setCepMessage] = useState("");
  const cepRequestIdRef = useRef(0);
  const cepDebounceRef = useRef(null);
  const mountedRef = useRef(true);

  // Pessoas já cadastradas (para a checagem de documento duplicado no passo 1) e imóveis
  // disponíveis (para o vínculo de proprietário). Falha aqui não bloqueia o formulário: a
  // API ainda valida a duplicidade no POST /people e devolve 409.
  // M9-D850: se a lista de apoio falhar (403, sem conexão, erro), a tela diz o que houve e oferece "tentar de novo" — nunca finge que não há pessoas/imóveis.
  const lookupQuery = useAsyncState(
    async () => {
      const [apiPeople, apiProperties] = await Promise.all([listPeople(), listProperties()]);
      setExistingPeople(apiPeople);
      setAvailableProperties(apiProperties);
      return { people: apiPeople };
    },
    { isEmpty: () => false }
  );
  const lookupFailed = !["LOADING", "CONTENT", "EMPTY"].includes(lookupQuery.status);

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

  async function handleDocumentFile(index, file) {
    if (!file) return;
    updateDocument(index, "uploading", true);
    updateDocument(index, "uploadError", "");
    try {
      const uploaded = await uploadFile(file);
      updateDocument(index, "fileId", uploaded.id);
      updateDocument(index, "fileName", file.name);
    } catch (err) {
      updateDocument(index, "uploadError", err.message || "Erro ao enviar arquivo.");
    } finally {
      updateDocument(index, "uploading", false);
    }
  }

  function addDocument() {
    setDocuments((prev) => [...prev, { ...EMPTY_DOCUMENT }]);
  }

  function removeDocument(index) {
    setDocuments((prev) => prev.filter((_, i) => i !== index));
  }

  async function goNext() {
    const formData = { basic, contacts, address };
    if (!isLast) {
      const errors = validatePersonStep(step.id, formData);
      if (Object.keys(errors).length) { showErrors(errors); return; }
    } else {
      // Envio: confere de novo todas as etapas e leva a pessoa à primeira que tem erro.
      for (const s of STEPS) {
        const errors = validatePersonStep(s.id, formData);
        if (Object.keys(errors).length) { setStepIndex(STEPS.findIndex((x) => x.id === s.id)); showErrors(errors); return; }
      }
    }
    setFieldErrors({});
    if (step.id === "basico") {
      const digits = basic.taxIdNormalized.replace(/\D/g, "");
      const conflict = existingPeople.find((p) => (p.taxIdRaw || "").replace(/\D/g, "") === digits && digits.length > 0);
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
      setSubmitError("");
      // Nomes de campo conforme people.service.js da API: contactType/valueNormalized/isPrimary
      // em person_contacts e documentType/fileId em person_documents. `roles` e `address` são
      // aceitos aninhados no POST /people e criados na mesma transação da pessoa.
      const payload = {
        personType: basic.personType,
        legalName: basic.legalName,
        preferredName: basic.preferredName || null,
        taxIdNormalized: basic.taxIdNormalized.replace(/\D/g, "") || null,
        birthOrFoundationDate: basic.birthOrFoundationDate || null,
        status: "ACTIVE",
        roles,
        contacts: contacts
          .filter((c) => c.value.trim())
          .map((c) => ({
            contactType: c.type,
            valueNormalized: c.value.trim(),
            isPrimary: !!c.primary,
          })),
        documents: documents
          .filter((d) => d.fileId)
          .map((d) => ({
            documentType: d.type,
            fileId: d.fileId,
            verificationStatus: d.verificationStatus,
          })),
        address: address.zipCode || address.street ? address : null,
      };

      try {
        let created;
        try {
          created = await createPerson(payload);
        } catch (err) {
          // BUG REAL CORRIGIDO (auditoria Claude Browser, 13/10/2026, §3.2): o backend
          // bloqueava contato/telefone repetido e a mensagem instruía o usuário a "enviar
          // allowDuplicate: true", um parâmetro de API que não existe na tela. Esse é o caso
          // de "match médio" do Caderno (contato igual, não documento) — abre revisão, não
          // bloqueia de verdade. Agora a própria tela oferece a opção, sem jargão técnico.
          if (err?.code === "PERSON_DUPLICATE") {
            const ok = await confirm({
              title: "Pode já existir um cadastro parecido",
              message: "Encontramos uma pessoa com o mesmo telefone ou contato principal. Isso pode ser um cadastro duplicado — revise antes de continuar. Quer criar este cadastro mesmo assim?",
              confirmLabel: "Criar mesmo assim",
              tone: "primary",
            });
            if (!ok) {
              setSubmitting(false);
              return;
            }
            created = await createPerson({ ...payload, allowDuplicate: true });
          } else {
            throw err;
          }
        }
        // O vínculo com imóveis é um recurso do módulo de Imóveis
        // (POST /properties/:id/owners), então acontece depois da criação da pessoa.
        for (const link of linkedProperties) {
          await addPropertyOwner(link.propertyId, {
            personId: created.id,
            roleCode: link.roleCode,
            ownershipPercent: link.percentage,
          });
        }
        router.push("/painel/pessoas");
      } catch (err) {
        // Mensagem da API em linguagem simples e, quando ela aponta campos, o erro vai ao campo certo (nunca nome interno de campo).
        const human = humanizeApiError(err, PERSON_FIELD_IDS);
        const ids = Object.keys(human.fields);
        if (ids.length) {
          setStepIndex(Math.max(0, STEPS.findIndex((x) => x.id === PERSON_FIELD_STEP[ids[0]])));
          showErrors(human.fields);
        } else {
          setSubmitError(human.message || "Não foi possível cadastrar o contato. Confira os dados e tente de novo.");
        }
        setSubmitting(false);
      }
      return;
    }
    setStepIndex((i) => Math.min(i + 1, STEPS.length - 1));
  }

  function goBack() {
    setFieldErrors({});
    if (isFirst) {
      router.push("/painel/pessoas");
      return;
    }
    setStepIndex((i) => Math.max(i - 1, 0));
  }

  const summaryItems = Object.entries(fieldErrors).map(([id, message]) => ({ id, message, label: ERROR_LABELS[id] || "Campo" }));

  return (
    <AppShell title="Novo contato" backHref="/painel/pessoas">
      <div className={styles.page}>
        <div className={styles.wrap}>
          {lookupFailed ? <AsyncState result={lookupQuery} /> : null}
          <div className={styles.stepHeaderWrap}>
            <StepHeader steps={STEPS} activeIndex={stepIndex} completion={stepCompletion} />
          </div>

          <ErrorSummary ref={summaryRef} items={summaryItems} />
          <Card className={styles.card}>
            {step.id === "basico" ? (
              <div className={styles.formGrid}>
                {duplicateError ? (
                  <div className={styles.span2} ref={errorRef} tabIndex={-1}>
                    <Alert tone="danger" title="Cadastro duplicado">{duplicateError}</Alert>
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
                  error={birthDateInvalid ? DATE_INPUT_ERROR_MESSAGE : undefined}
                >
                  <Input
                    id="p-birth"
                    type="date"
                    min="1900-01-01"
                    max="2100-12-31"
                    error={birthDateInvalid}
                    value={basic.birthOrFoundationDate}
                    onChange={(e) => {
                      setBirthDateInvalid(isDateInputInvalid(e.target.validity));
                      setBasic({ ...basic, birthOrFoundationDate: e.target.value });
                    }}
                    onBlur={(e) => setBirthDateInvalid(isDateInputInvalid(e.target.validity))}
                  />
                </FormField>
                <div className={styles.span2}>
                  <FormField label="Nome / Razão social" htmlFor="p-name" required error={fieldErrors["p-name"]}>
                    <Input
                      id="p-name"
                      placeholder="Nome completo ou razão social"
                      error={Boolean(fieldErrors["p-name"])}
                      value={basic.legalName}
                      onChange={(e) => { clearError("p-name"); setBasic({ ...basic, legalName: e.target.value }); }}
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
                <FormField label={basic.personType === "PJ" ? "CNPJ" : "CPF"} htmlFor="p-doc" required error={fieldErrors["p-doc"]}>
                  <Input
                    id="p-doc"
                    placeholder={basic.personType === "PJ" ? "00.000.000/0000-00" : "000.000.000-00"}
                    error={Boolean(fieldErrors["p-doc"])}
                    value={basic.taxIdNormalized}
                    onChange={(e) => { clearError("p-doc"); setBasic({ ...basic, taxIdNormalized: formatTaxId(e.target.value, basic.personType) }); }}
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
                        {availableProperties.filter((prop) =>
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
                        {availableProperties.filter((prop) => prop.name.toLowerCase().includes(propertySearch.trim().toLowerCase())).length === 0 ? (
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
                        <FormField label="Valor" htmlFor={`p-contact-value-${index}`} required error={fieldErrors[`p-contact-value-${index}`]}>
                          <Input
                            id={`p-contact-value-${index}`}
                            placeholder={contact.type === "EMAIL" ? "nome@email.com" : "(11) 90000-0000"}
                            error={Boolean(fieldErrors[`p-contact-value-${index}`])}
                            value={contact.value}
                            onChange={(e) => { clearError("p-contact-value-0"); updateContact(index, "value", e.target.value); }}
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
                          <FormField
                            label="Arquivo do documento"
                            htmlFor={`p-doc-file-${index}`}
                            helper={doc.fileName ? `Enviado: ${doc.fileName}` : "Foto ou scan do documento (máx. 20MB)."}
                            error={doc.uploadError || undefined}
                          >
                            <input
                              id={`p-doc-file-${index}`}
                              type="file"
                              accept="image/*,application/pdf"
                              disabled={doc.uploading}
                              onChange={(e) => handleDocumentFile(index, e.target.files?.[0])}
                            />
                            {doc.uploading ? <Spinner size="sm" /> : null}
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
                <FormField label="CEP" htmlFor="p-zip" required error={fieldErrors["p-zip"]} helper={cepMessage || "Digite o CEP para preencher o endereço automaticamente."}>
                  <div className={styles.cepField}>
                    <Input
                      id="p-zip"
                      aria-describedby="p-zip-msg"
                      aria-required="true"
                      placeholder="00000-000"
                      error={Boolean(fieldErrors["p-zip"])}
                      value={address.zipCode}
                      onChange={(e) => { clearError("p-zip"); handleCepChange(e.target.value); }}
                      onBlur={(e) => handleCepBlur(e.target.value)}
                    />
                    {cepLoading ? <Spinner size="sm" className={styles.cepSpinner} /> : null}
                  </div>
                </FormField>
                <FormField label="Cidade" htmlFor="p-city" required error={fieldErrors["p-city"]}>
                  <Input id="p-city" error={Boolean(fieldErrors["p-city"])} placeholder="Preenchida pelo CEP" value={address.city} onChange={(e) => { clearError("p-city"); setAddress({ ...address, city: e.target.value }); }} />
                </FormField>
                <div className={styles.span2}>
                  <FormField label="Logradouro" htmlFor="p-street" required error={fieldErrors["p-street"]}>
                    <Input id="p-street" error={Boolean(fieldErrors["p-street"])} value={address.street} onChange={(e) => { clearError("p-street"); setAddress({ ...address, street: e.target.value }); }} />
                  </FormField>
                </div>
                <FormField label="Número" htmlFor="p-number">
                  <Input id="p-number" value={address.number} onChange={(e) => setAddress({ ...address, number: e.target.value })} />
                </FormField>
                <FormField label="Complemento" htmlFor="p-complement">
                  <Input id="p-complement" value={address.complement} onChange={(e) => setAddress({ ...address, complement: e.target.value })} />
                </FormField>
                <FormField label="Bairro" htmlFor="p-neighborhood" required error={fieldErrors["p-neighborhood"]}>
                  <Input id="p-neighborhood" error={Boolean(fieldErrors["p-neighborhood"])} value={address.neighborhood} onChange={(e) => { clearError("p-neighborhood"); setAddress({ ...address, neighborhood: e.target.value }); }} />
                </FormField>
                <FormField label="UF" htmlFor="p-state" required error={fieldErrors["p-state"]}>
                  <Input id="p-state" error={Boolean(fieldErrors["p-state"])} maxLength={2} placeholder="SP" value={address.state} onChange={(e) => { clearError("p-state"); setAddress({ ...address, state: e.target.value.toUpperCase() }); }} />
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
                {submitError ? (
                  <div className={styles.reviewSection} ref={errorRef} tabIndex={-1}>
                    <Alert tone="danger" title="Não foi possível cadastrar o contato">{submitError}</Alert>
                  </div>
                ) : null}
                <div className={styles.reviewSection}>
                  <p className={styles.reviewTitle}>Dados básicos</p>
                  <div className={styles.reviewNameRow}>
                    <Avatar name={basic.legalName || "?"} src={photoUrl} size="lg" />
                    <p className={styles.reviewName}>
                      {basic.legalName || "Falta preencher o nome"}{basic.preferredName ? ` (conhecida como ${basic.preferredName})` : ""}
                    </p>
                  </div>
                  <p className={styles.reviewMeta}>{basic.personType === "PF" ? "Pessoa física" : "Pessoa jurídica"} · {basic.taxIdNormalized || "Sem CPF/CNPJ preenchido"}</p>
                  <p className={styles.reviewMeta}>
                    {basic.personType === "PF" ? "Nascimento" : "Fundação"}: {basic.birthOrFoundationDate || "Sem data preenchida"}
                  </p>
                  <div className={styles.reviewChips}>
                    {roles.map((r) => <Badge tone="neutral" key={r}>{ROLE_LABELS[r]}</Badge>)}
                  </div>
                </div>

                <div className={styles.reviewSection}>
                  <p className={styles.reviewTitle}>Contatos</p>
                  {contacts.map((c, i) => (
                    <p className={styles.reviewMeta} key={i}>
                      {CONTACT_TYPE_LABELS[c.type]}: {c.value || "Sem valor preenchido"} {c.primary ? "· Principal" : ""}
                    </p>
                  ))}
                </div>

                <div className={styles.reviewSection}>
                  <p className={styles.reviewTitle}>Documentos</p>
                  {documents.length > 0 ? documents.map((d, i) => (
                    <p className={styles.reviewMeta} key={i}>{DOCUMENT_TYPE_LABELS[d.type]}: {d.fileName || "Sem arquivo anexado"}</p>
                  )) : <p className={styles.reviewMeta}>Nenhum documento adicionado.</p>}
                </div>

                <div className={styles.reviewSection}>
                  <p className={styles.reviewTitle}>Endereço</p>
                  <p className={styles.reviewMeta}>
                    {address.street || "Falta preencher a rua"}{address.number ? `, ${address.number}` : ""}{address.complement ? ` — ${address.complement}` : ""}
                  </p>
                  <p className={styles.reviewMeta}>{address.neighborhood || "Falta preencher o bairro"}, {address.city || "Falta preencher a cidade"} {address.state ? `— ${address.state}` : ""}</p>
                  <p className={styles.reviewMeta}>CEP {address.zipCode || "Sem CEP"}</p>
                </div>

                {linkedProperties.length > 0 ? (
                  <div className={styles.reviewSection}>
                    <p className={styles.reviewTitle}>Imóveis vinculados</p>
                    {linkedProperties.map((link) => {
                      const prop = availableProperties.find((p) => p.id === link.propertyId);
                      return (
                        <p className={styles.reviewMeta} key={link.propertyId}>
                          {prop?.name || "Imóvel sem nome"} · {OWNER_ROLE_LABELS[link.roleCode] || link.roleCode} · {link.percentage}%
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
      <ConfirmDialog />
    </AppShell>
  );
}
