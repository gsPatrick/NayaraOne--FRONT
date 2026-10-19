"use client";

import { useEffect, useState } from "react";
import { useRouter } from "next/navigation";
import AppShell from "@/components/organisms/AppShell/AppShell";
import Card from "@/components/molecules/Card/Card";
import FormField from "@/components/molecules/FormField/FormField";
import Input from "@/components/atoms/Input/Input";
import Select from "@/components/atoms/Select/Select";
import Button from "@/components/atoms/Button/Button";
import Alert from "@/components/molecules/Alert/Alert";
import Icon from "@/components/atoms/Icon/Icon";
import { SkeletonDetail } from "@/components/molecules/SkeletonPatterns/SkeletonPatterns";
import { listProperties } from "@/lib/api/properties";
import { listPeople } from "@/lib/api/people";
import { listProjects } from "@/lib/api/construction";
import { createContract, addContractParty, listContractTemplates, renderContractTemplate, createContractVersion } from "@/lib/api/legal";
import { CONTRACT_TYPE_LABELS, CONTRACT_TYPE_CREATE_OPTIONS, PARTY_ROLE_LABELS } from "@/lib/mock/legal";
import { dateOnlyInputToIso, isDateInputInvalid, DATE_INPUT_ERROR_MESSAGE, formatDate, formatBRL, toNumber } from "@/lib/format";
import { describeCondition } from "@/app/painel/contratos/clausulas/ClauseConditionEditor";
import styles from "./page.module.css";
import DecimalInput from "@/components/atoms/DecimalInput/DecimalInput";

// Detecta placeholders "{{chave}}" que sobraram sem substituir no texto renderizado — o backend
// (contractTemplates.service.js#applyTemplateVariables) deixa o placeholder intacto quando não
// recebe valor pra ele, de propósito, pra nunca esconder silenciosamente que faltou preencher
// algo. O front usa isso pra pedir os campos que faltam antes de criar a versão do contrato.
function findUnresolvedPlaceholders(text) {
  const matches = String(text || "").matchAll(/\{\{\s*([a-zA-Z0-9_]+)\s*\}\}/g);
  return [...new Set([...matches].map((m) => m[1]))];
}

// Mapeia os placeholders mais comuns dos templates de contrato pra dados já coletados no
// formulário — evita pedir de novo algo que o usuário já preencheu (nome das partes, endereço
// do imóvel, valor, datas). Qualquer placeholder que não bater com essas chaves conhecidas cai
// no formulário dinâmico de "completar o template" pra preenchimento manual.
function buildKnownVariables({ parties, people, property, form }) {
  const byRole = (role) => {
    const party = parties.find((p) => p.partyRole === role);
    return party ? people.find((p) => p.id === party.personId) : null;
  };
  const landlord = byRole("LANDLORD") || byRole("SELLER");
  const tenant = byRole("TENANT") || byRole("BUYER");

  const vars = {};
  if (landlord) {
    vars.nome_locador = landlord.legalName;
    vars.doc_locador = landlord.taxIdNormalized || "(documento não cadastrado)";
  }
  if (tenant) {
    vars.nome_locatario = tenant.legalName;
    vars.doc_locatario = tenant.taxIdNormalized || "(documento não cadastrado)";
  }
  if (property) vars.endereco_imovel = property.addressLine || property.name;
  if (form.totalValue) vars.valor_aluguel = formatBRL(toNumber(form.totalValue)).replace("R$", "").trim();
  if (form.startsAt) vars.data_inicio = formatDate(dateOnlyInputToIso(form.startsAt));
  if (form.endsAt) vars.data_fim = formatDate(dateOnlyInputToIso(form.endsAt));
  return vars;
}

export default function NovoContratoPage() {
  const router = useRouter();
  const [properties, setProperties] = useState([]);
  const [people, setPeople] = useState([]);
  const [templates, setTemplates] = useState([]);
  const [loading, setLoading] = useState(true);
  const [loadError, setLoadError] = useState("");
  const [actionError, setActionError] = useState("");
  const [submitting, setSubmitting] = useState(false);
  const [form, setForm] = useState({
    contractType: "LEASE_RESIDENTIAL",
    propertyId: "",
    totalValue: "",
    startsAt: "",
    endsAt: "",
    templateId: "",
    constructionProjectId: "",
  });
  // F5 (auditoria M45): contrato de Obra/Construção — a API exige a obra vinculada.
  const [projects, setProjects] = useState(null);
  const [projectsError, setProjectsError] = useState("");
  const isConstruction = form.contractType === "CONSTRUCTION";
  useEffect(() => {
    if (!isConstruction || projects !== null) return;
    listProjects()
      .then((res) => setProjects(Array.isArray(res) ? res : res?.items || []))
      .catch((err) => { setProjects([]); setProjectsError(err.message || "Erro ao carregar obras."); });
  }, [isConstruction, projects]);
  const [parties, setParties] = useState([]);
  const [newParty, setNewParty] = useState({ personId: "", partyRole: "LANDLORD" });
  // Placeholders do template escolhido que não têm dado correspondente já coletado no
  // formulário (ver buildKnownVariables) — pedidos ao usuário antes de criar a versão, pra
  // nunca deixar {{assim}} sem preencher no documento gerado (bug real encontrado nesta
  // sessão: a tela mandava renderContractTemplate(templateId, {}) com variáveis vazias).
  const [pendingPlaceholders, setPendingPlaceholders] = useState(null);
  const [placeholderValues, setPlaceholderValues] = useState({});
  const [checkingTemplate, setCheckingTemplate] = useState(false);
  // F01: resultado da pré-visualização — quais cláusulas entram e quais ficam de fora (e por quê),
  // decidido pelo servidor com os dados deste contrato. Mostrado antes de criar.
  const [clausePreview, setClausePreview] = useState(null);

  useEffect(() => {
    let cancelled = false;
    setLoading(true);
    setLoadError("");
    Promise.all([listProperties(), listPeople(), listContractTemplates()])
      .then(([propertiesRes, peopleRes, templatesRes]) => {
        if (cancelled) return;
        setProperties(propertiesRes || []);
        setPeople(peopleRes || []);
        setTemplates(templatesRes || []);
        setForm((prev) => ({ ...prev, propertyId: prev.propertyId || propertiesRes?.[0]?.id || "" }));
        setNewParty((prev) => ({ ...prev, personId: prev.personId || peopleRes?.[0]?.id || "" }));
      })
      .catch((err) => { if (!cancelled) setLoadError(err.message || "Erro ao carregar dados."); })
      .finally(() => { if (!cancelled) setLoading(false); });
    return () => { cancelled = true; };
  }, []);

  const templatesForType = templates.filter((t) => t.contractType === form.contractType);

  const [dateErrors, setDateErrors] = useState({});
  const isValid =
    form.propertyId && toNumber(form.totalValue) > 0 && parties.length > 0 && !dateErrors.startsAt && !dateErrors.endsAt &&
    (!isConstruction || Boolean(form.constructionProjectId));

  function update(field) {
    return (e) => {
      setForm((prev) => ({ ...prev, [field]: e.target.value }));
      resetTemplateCheck();
    };
  }

  function updateDate(field) {
    return (e) => {
      setDateErrors((prev) => ({ ...prev, [field]: isDateInputInvalid(e.target.validity) }));
      setForm((prev) => ({ ...prev, [field]: e.target.value }));
      resetTemplateCheck();
    };
  }

  function checkDate(field) {
    return (e) => setDateErrors((prev) => ({ ...prev, [field]: isDateInputInvalid(e.target.validity) }));
  }

  function addParty() {
    const person = people.find((p) => p.id === newParty.personId);
    if (!person) return;
    setParties((prev) => [...prev, { id: `tmp-${Date.now()}`, personId: newParty.personId, partyRole: newParty.partyRole }]);
    resetTemplateCheck();
  }

  function removeParty(id) {
    setParties((prev) => prev.filter((p) => p.id !== id));
    resetTemplateCheck();
  }

  function getKnownVariables() {
    const property = properties.find((p) => p.id === form.propertyId);
    return buildKnownVariables({ parties, people, property, form });
  }

  // Dados do contrato em criação, enviados só para o servidor DERIVAR o contexto das cláusulas
  // condicionais (tipo de pessoa e tipo do imóvel são lidos do banco, não deste objeto).
  function getDraftContract() {
    return {
      contractType: form.contractType,
      totalValue: toNumber(form.totalValue),
      startsAt: dateOnlyInputToIso(form.startsAt),
      endsAt: dateOnlyInputToIso(form.endsAt),
      propertyId: form.propertyId,
      parties: parties.map((p) => ({ personId: p.personId, partyRole: p.partyRole })),
    };
  }

  async function handleSubmit() {
    if (!isValid) return;
    setActionError("");

    // Passo 1 — se tem template escolhido e ainda não checamos os placeholders dele nesta
    // tentativa, renderiza com o que já sabemos e vê se sobrou algo sem preencher. Se sobrou,
    // para aqui e pede pro usuário completar (não cria o contrato com documento pela metade).
    if (form.templateId && pendingPlaceholders === null) {
      setCheckingTemplate(true);
      try {
        const known = getKnownVariables();
        const rendered = await renderContractTemplate(form.templateId, known, { draftContract: getDraftContract() });
        setClausePreview({ included: rendered.clauses || [], excluded: rendered.excludedClauses || [] });
        const missing = findUnresolvedPlaceholders(rendered.content);
        if (missing.length > 0) {
          setPendingPlaceholders(missing);
          setPlaceholderValues(Object.fromEntries(missing.map((key) => [key, ""])));
          return;
        }
        // Para aqui na primeira vez: o usuário confere quais cláusulas entram/saem e confirma
        // clicando de novo em "Criar contrato".
        setPendingPlaceholders([]);
        return;
      } catch (err) {
        setActionError(err.message || "Erro ao processar o template do contrato.");
        return;
      } finally {
        setCheckingTemplate(false);
      }
    }

    setSubmitting(true);
    try {
      const contract = await createContract({
        propertyId: form.propertyId,
        contractType: form.contractType,
        totalValue: toNumber(form.totalValue),
        startsAt: dateOnlyInputToIso(form.startsAt),
        endsAt: dateOnlyInputToIso(form.endsAt),
        ...(isConstruction ? { constructionProjectId: form.constructionProjectId } : {}),
      });
      for (const party of parties) {
        await addContractParty(contract.id, { personId: party.personId, partyRole: party.partyRole });
      }
      // Se um template foi escolhido, gera a primeira versão já com o texto renderizado a
      // partir dele (preview via renderContractTemplate + persistência via createContractVersion,
      // ver lib/api/legal.js) — sempre com TODAS as variáveis resolvidas (conhecidas do
      // formulário + as que o usuário completou manualmente no passo anterior), nunca com
      // {{placeholder}} sobrando no documento gerado. requireDocument:false porque nesta etapa
      // ainda não existe upload de arquivo real — é um rascunho textual vinculado ao template,
      // gate de documento real continua valendo mais adiante (transição para SIGNING).
      // F01: a versão é montada pelo SERVIDOR a partir do modelo, das condições aprovadas e dos
      // dados reais do contrato recém-criado — o front manda só as variáveis de preenchimento.
      if (form.templateId) {
        const variables = { ...getKnownVariables(), ...placeholderValues };
        await createContractVersion(contract.id, {
          templateId: form.templateId,
          variables,
          requireDocument: false,
        });
      }
      router.push(`/painel/contratos/lista/${contract.id}`);
    } catch (err) {
      setActionError(err.message || "Erro ao criar contrato.");
    } finally {
      setSubmitting(false);
    }
  }

  // Trocar template ou qualquer dado que alimenta as variáveis conhecidas invalida a checagem
  // de placeholders já feita — força reconferir antes de criar, pra nunca usar valores
  // desatualizados (ex: trocou o imóvel depois de já ter "aceitado" o preview).
  function resetTemplateCheck() {
    setPendingPlaceholders(null);
    setPlaceholderValues({});
    setClausePreview(null);
  }

  if (loading) {
    return (
      <AppShell title="Novo contrato" backHref="/painel/contratos/lista">
        <SkeletonDetail sections={2} />
      </AppShell>
    );
  }

  return (
    <AppShell title="Novo contrato" backHref="/painel/contratos/lista">
      <div className={styles.wrap}>
        {loadError ? <Alert tone="danger">{loadError}</Alert> : null}
        {actionError ? <Alert tone="danger">{actionError}</Alert> : null}

        <Alert tone="info" title="Máquina de estados">
          O contrato nasce como rascunho e avança etapa por etapa (Documentos pendentes → Análise jurídica → Aprovado → Em assinatura → Assinado → Ativo) — a transição é feita na página de detalhe.
        </Alert>

        <Card title="Dados do contrato">
          <div className={styles.formGrid}>
            <FormField label="Tipo de contrato" htmlFor="f-type">
              <Select id="f-type" value={form.contractType} onChange={update("contractType")}>
                {CONTRACT_TYPE_CREATE_OPTIONS.map((k) => (
                  <option key={k} value={k}>{CONTRACT_TYPE_LABELS[k]}</option>
                ))}
              </Select>
            </FormField>

            {isConstruction ? (
              <FormField
                label="Obra vinculada"
                htmlFor="f-project"
                required
                helper={projectsError || "Contrato de empreitada nasce vinculado à obra (checklist: alvará/projeto aprovado e demais documentos de obra)."}
              >
                <Select id="f-project" value={form.constructionProjectId} onChange={update("constructionProjectId")}>
                  <option value="">{projects === null ? "Carregando obras…" : projects.length ? "Selecione a obra" : "Nenhuma obra cadastrada"}</option>
                  {(projects || []).map((p) => (
                    <option key={p.id} value={p.id}>{[p.code, p.name || p.title].filter(Boolean).join(" — ")}</option>
                  ))}
                </Select>
              </FormField>
            ) : null}

            <FormField label="Imóvel" htmlFor="f-property" required>
              <Select id="f-property" value={form.propertyId} onChange={update("propertyId")}>
                {properties.map((p) => (
                  <option key={p.id} value={p.id}>{p.name}</option>
                ))}
              </Select>
            </FormField>

            <FormField label="Template do contrato" htmlFor="f-template" helper="Opcional — gera a primeira versão do documento já preenchida a partir do modelo">
              <Select id="f-template" value={form.templateId} onChange={update("templateId")}>
                <option value="">Sem template (conteúdo manual)</option>
                {templatesForType.map((t) => (
                  <option key={t.id} value={t.id}>{t.name}</option>
                ))}
              </Select>
            </FormField>

            <FormField label="Valor total (R$)" htmlFor="f-value" required>
              <DecimalInput id="f-value" value={form.totalValue} onChange={update("totalValue")} placeholder="0,00" />
            </FormField>

            <FormField
              label="Início de vigência"
              htmlFor="f-starts"
              helper={dateErrors.startsAt ? undefined : "Opcional"}
              error={dateErrors.startsAt ? DATE_INPUT_ERROR_MESSAGE : undefined}
            >
              <Input
                id="f-starts"
                type="date"
                min="1900-01-01"
                max="2100-12-31"
                error={dateErrors.startsAt}
                value={form.startsAt}
                onChange={updateDate("startsAt")}
                onBlur={checkDate("startsAt")}
              />
            </FormField>

            <FormField
              label="Fim de vigência"
              htmlFor="f-ends"
              helper={dateErrors.endsAt ? undefined : "Opcional — relevante para locação"}
              error={dateErrors.endsAt ? DATE_INPUT_ERROR_MESSAGE : undefined}
            >
              <Input
                id="f-ends"
                type="date"
                min="1900-01-01"
                max="2100-12-31"
                error={dateErrors.endsAt}
                value={form.endsAt}
                onChange={updateDate("endsAt")}
                onBlur={checkDate("endsAt")}
              />
            </FormField>
          </div>
        </Card>

        <Card title="Partes do contrato" subtitle="Adicione ao menos uma parte (ex: locador e locatário, ou comprador e vendedor)">
          <div className={styles.partiesList}>
            {parties.length === 0 ? (
              <p className={styles.emptyText}>Nenhuma parte adicionada ainda.</p>
            ) : (
              parties.map((party) => {
                const person = people.find((p) => p.id === party.personId);
                return (
                  <div key={party.id} className={styles.partyRow}>
                    <div className={styles.partyInfo}>
                      <span className={styles.partyName}>{person?.legalName || "Pessoa não encontrada"}</span>
                      <span className={styles.partyRole}>{PARTY_ROLE_LABELS[party.partyRole]}</span>
                    </div>
                    <button type="button" className={styles.removeBtn} onClick={() => removeParty(party.id)} aria-label="Remover parte">
                      <Icon name="trash" size={16} />
                    </button>
                  </div>
                );
              })
            )}
          </div>

          <div className={styles.addPartyRow}>
            <FormField label="Pessoa" htmlFor="f-party-person">
              <Select id="f-party-person" value={newParty.personId} onChange={(e) => setNewParty((prev) => ({ ...prev, personId: e.target.value }))}>
                {people.map((p) => (
                  <option key={p.id} value={p.id}>{p.legalName}</option>
                ))}
              </Select>
            </FormField>
            <FormField label="Papel" htmlFor="f-party-role">
              <Select id="f-party-role" value={newParty.partyRole} onChange={(e) => setNewParty((prev) => ({ ...prev, partyRole: e.target.value }))}>
                {Object.entries(PARTY_ROLE_LABELS).map(([k, v]) => (
                  <option key={k} value={k}>{v}</option>
                ))}
              </Select>
            </FormField>
            <Button variant="secondary" onClick={addParty}>
              <Icon name="plus" size={16} /> Adicionar
            </Button>
          </div>
        </Card>

        {pendingPlaceholders && pendingPlaceholders.length > 0 ? (
          <Card
            title="Complete o template do contrato"
            subtitle="O modelo escolhido tem campos que não puderam ser preenchidos automaticamente com os dados já informados — complete abaixo antes de criar o contrato."
          >
            <div className={styles.formGrid}>
              {pendingPlaceholders.map((key) => (
                <FormField key={key} label={key.replace(/_/g, " ")} htmlFor={`f-ph-${key}`}>
                  <Input
                    id={`f-ph-${key}`}
                    value={placeholderValues[key] || ""}
                    onChange={(e) => setPlaceholderValues((prev) => ({ ...prev, [key]: e.target.value }))}
                  />
                </FormField>
              ))}
            </div>
          </Card>
        ) : null}

        {clausePreview ? (
          <Card
            title="Cláusulas do documento"
            subtitle="Decidido pelo sistema com os dados deste contrato e as regras aprovadas na Biblioteca de cláusulas. Confira e clique em “Confirmar e criar contrato”."
          >
            <div className={styles.clausePreview} data-testid="clause-preview">
              <p className={styles.clausePreviewHeading}>Vão entrar ({clausePreview.included.length})</p>
              {clausePreview.included.length === 0 ? <p className={styles.emptyText}>Nenhuma cláusula.</p> : null}
              <ul className={styles.clauseList}>
                {clausePreview.included.map((c) => (
                  <li key={c.contractClauseId} data-testid="clause-included">
                    <strong>{c.title}</strong>
                    {c.condition ? <span className={styles.clauseReason}> — regra atendida: {describeCondition(c.condition)}</span> : null}
                  </li>
                ))}
              </ul>
              {clausePreview.excluded.length > 0 ? (
                <>
                  <p className={styles.clausePreviewHeading}>Ficam de fora ({clausePreview.excluded.length})</p>
                  <ul className={styles.clauseList}>
                    {clausePreview.excluded.map((c) => (
                      <li key={c.contractClauseId} data-testid="clause-excluded">
                        <strong>{c.title || c.code}</strong>
                        <span className={styles.clauseReason}>
                          {" — "}
                          {c.reason === "CLAUSE_RETIRED"
                            ? "cláusula retirada de circulação na Biblioteca"
                            : `regra não atendida por este contrato: ${describeCondition(c.condition)}`}
                        </span>
                      </li>
                    ))}
                  </ul>
                </>
              ) : null}
            </div>
          </Card>
        ) : null}

        <div className={styles.actionBar}>
          <Button variant="secondary" onClick={() => router.push("/painel/contratos/lista")}>Cancelar</Button>
          <Button onClick={handleSubmit} loading={submitting || checkingTemplate} disabled={!isValid}>
            {clausePreview ? "Confirmar e criar contrato" : "Criar contrato"}
          </Button>
        </div>
      </div>
    </AppShell>
  );
}
