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
import AsyncState from "@/components/molecules/AsyncState/AsyncState";
import { UI_STATE } from "@/lib/asyncState/states";
import { useAsyncState } from "@/lib/asyncState/useAsyncState";
import { listProperties } from "@/lib/api/properties";
import { listPeople } from "@/lib/api/people";
import { listProjects } from "@/lib/api/construction";
import { createContract, addContractParty, listContracts, listContractTemplates, renderContractTemplate, createContractVersion } from "@/lib/api/legal";
import { CONTRACT_TYPE_LABELS, CONTRACT_TYPE_CREATE_OPTIONS, LINKED_CONTRACT_TYPES } from "@/lib/labels/juridico";
import { legalErrorMessage } from "@/lib/legal/legalErrors";
import { dateOnlyInputToIso, isDateInputInvalid, DATE_INPUT_ERROR_MESSAGE, formatContractLabel, toNumber } from "@/lib/format";
import { findUnresolvedPlaceholders, buildKnownVariables } from "./templateVariables";
import PartiesEditor from "./PartiesEditor";
import ClausePreviewCard from "./ClausePreviewCard";
import styles from "./page.module.css";
import DecimalInput from "@/components/atoms/DecimalInput/DecimalInput";

export default function NovoContratoPage() {
  const router = useRouter();
  const [properties, setProperties] = useState([]);
  const [people, setPeople] = useState([]);
  const [templates, setTemplates] = useState([]);
  const [contracts, setContracts] = useState([]);
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
    parentContractId: "",
  });
  // Caderno §3: aditivo e termos de entrega são VINCULADOS ao contrato principal e herdam o imóvel dele.
  const isLinked = LINKED_CONTRACT_TYPES.includes(form.contractType);
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

  // M9-D940: carregando, erro com "tentar de novo", 403 e offline vêm do padrão único de estados.
  const loadQuery = useAsyncState(() => {
    return Promise.all([listProperties(), listPeople(), listContractTemplates(), listContracts()])
      .then(([propertiesRes, peopleRes, templatesRes, contractsRes]) => {
        setProperties(propertiesRes || []);
        setPeople(peopleRes || []);
        setTemplates(templatesRes || []);
        setContracts((contractsRes || []).filter((c) => !LINKED_CONTRACT_TYPES.includes(c.contractType)));
        setForm((prev) => ({ ...prev, propertyId: prev.propertyId || propertiesRes?.[0]?.id || "" }));
      })
      .then(() => true);
  }, { deps: [], isEmpty: () => false });

  const templatesForType = templates.filter((t) => t.contractType === form.contractType);

  const [dateErrors, setDateErrors] = useState({});
  const value = toNumber(form.totalValue);
  const isValid = isLinked
    ? Boolean(form.parentContractId) && (form.totalValue === "" || (!Number.isNaN(value) && value >= 0)) && !dateErrors.startsAt && !dateErrors.endsAt
    : form.propertyId && !Number.isNaN(value) && value > 0 && parties.length > 0 && !dateErrors.startsAt && !dateErrors.endsAt &&
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
        setActionError(legalErrorMessage(err, "Não foi possível processar o modelo do contrato."));
        return;
      } finally {
        setCheckingTemplate(false);
      }
    }

    setSubmitting(true);
    try {
      const contract = await createContract({
        ...(isLinked ? { parentContractId: form.parentContractId } : { propertyId: form.propertyId }),
        contractType: form.contractType,
        ...(form.totalValue !== "" ? { totalValue: value } : {}),
        startsAt: dateOnlyInputToIso(form.startsAt),
        endsAt: dateOnlyInputToIso(form.endsAt),
        ...(isConstruction ? { constructionProjectId: form.constructionProjectId } : {}),
      });
      for (const party of parties) {
        await addContractParty(contract.id, { personId: party.personId, partyRole: party.partyRole, representedByPersonId: party.representedByPersonId || undefined });
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
      setActionError(legalErrorMessage(err, "Não foi possível criar o contrato."));
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

  if (loadQuery.status !== UI_STATE.CONTENT) {
    return (
      <AppShell title="Novo contrato" backHref="/painel/contratos/lista">
        <AsyncState result={loadQuery} loadingLabel="Carregando dados..." />
      </AppShell>
    );
  }

  return (
    <AppShell title="Novo contrato" backHref="/painel/contratos/lista">
      <div className={styles.wrap}>
        {actionError ? <Alert tone="danger">{actionError}</Alert> : null}

        <Alert tone="info" title="Etapas do contrato">
          O contrato nasce como rascunho e segue o fluxo do livro: documentos pendentes (opcional) → análise jurídica → aprovação da versão do documento → em assinatura → assinado → ativo. Depois de ativo pode ser suspenso, rescindido e encerrado. As etapas são feitas na página de detalhe.
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

            {isLinked ? (
              <FormField label="Contrato principal" htmlFor="f-parent" required helper="Aditivo e termos de entrega são vinculados ao contrato principal e herdam o imóvel dele.">
                <Select id="f-parent" value={form.parentContractId} onChange={update("parentContractId")}>
                  <option value="">Selecione o contrato principal</option>
                  {contracts.map((c) => (
                    <option key={c.id} value={c.id}>{`${formatContractLabel(c)} — ${CONTRACT_TYPE_LABELS[c.contractType] || "Contrato"}`}</option>
                  ))}
                </Select>
              </FormField>
            ) : (
              <FormField label="Imóvel" htmlFor="f-property" required>
                <Select id="f-property" value={form.propertyId} onChange={update("propertyId")}>
                  {properties.map((p) => (
                    <option key={p.id} value={p.id}>{p.name}</option>
                  ))}
                </Select>
              </FormField>
            )}

            <FormField label="Template do contrato" htmlFor="f-template" helper="Opcional — gera a primeira versão do documento já preenchida a partir do modelo">
              <Select id="f-template" value={form.templateId} onChange={update("templateId")}>
                <option value="">Sem template (conteúdo manual)</option>
                {templatesForType.map((t) => (
                  <option key={t.id} value={t.id}>{t.name}</option>
                ))}
              </Select>
            </FormField>

            <FormField label="Valor total (R$)" htmlFor="f-value" required={!isLinked} helper={isLinked ? "Opcional para termos e aditivos" : undefined}>
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

        <PartiesEditor
          people={people}
          parties={parties}
          onChange={(next) => { setParties(next); resetTemplateCheck(); }}
          subtitle={isLinked ? "Opcional — as partes vêm do contrato principal; inclua quem assina este termo/aditivo" : "Adicione ao menos uma parte (ex.: locador e locatário, ou comprador e vendedor) e, se houver, o procurador"}
        />

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

        {clausePreview ? <ClausePreviewCard preview={clausePreview} /> : null}

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
