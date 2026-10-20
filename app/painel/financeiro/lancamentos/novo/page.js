"use client";

import { useEffect, useRef, useState } from "react";
import { useRouter } from "next/navigation";
import AppShell from "@/components/organisms/AppShell/AppShell";
import Card from "@/components/molecules/Card/Card";
import FormField from "@/components/molecules/FormField/FormField";
import Input from "@/components/atoms/Input/Input";
import Select from "@/components/atoms/Select/Select";
import Checkbox from "@/components/atoms/Checkbox/Checkbox";
import Button from "@/components/atoms/Button/Button";
import Alert from "@/components/molecules/Alert/Alert";
import { SkeletonDetail } from "@/components/molecules/SkeletonPatterns/SkeletonPatterns";
import NatureBadge from "@/components/molecules/NatureBadge/NatureBadge";
import BankAccountSelect from "@/components/molecules/BankAccountSelect/BankAccountSelect";
import { ENTRY_NATURE_LABELS } from "@/lib/mock/finance";
import { listBankAccounts, listCostCenters, listResultCenters, listChartAccounts, createFinancialEntry } from "@/lib/api/finance";
import { listContracts, listContractParties } from "@/lib/api/legal";
import { listPeople } from "@/lib/api/people";
import { friendlyFinanceError } from "@/lib/finance/extras";
import { generateIdempotencyKey } from "@/lib/offline/offlineQueue";
import { dateOnlyInputToIso, formatContractLabel, parseCompetenceInput, toNumber } from "@/lib/format";
import styles from "./page.module.css";
import DecimalInput from "@/components/atoms/DecimalInput/DecimalInput";

export default function NovoLancamentoPage() {
  const router = useRouter();
  const [submitting, setSubmitting] = useState(false);
  const [loading, setLoading] = useState(true);
  const [loadError, setLoadError] = useState("");
  const [actionError, setActionError] = useState("");
  const [bankAccounts, setBankAccounts] = useState([]);
  const [costCenters, setCostCenters] = useState([]);
  const [resultCenters, setResultCenters] = useState([]);
  const [chartAccounts, setChartAccounts] = useState([]);
  const [contracts, setContracts] = useState([]);
  const [people, setPeople] = useState([]);
  const [parties, setParties] = useState([]);
  const [partiesLoading, setPartiesLoading] = useState(false);
  const [amountTouched, setAmountTouched] = useState(false);
  const [form, setForm] = useState({
    description: "",
    amount: "",
    entryType: "DEBIT",
    nature: "PAYABLE",
    bankAccountId: "",
    costCenterId: "",
    resultCenterId: "",
    dueAt: "",
    competenceMonth: "",
    chartOfAccountId: "",
    idempotencyKey: "",
    isThirdPartyFunds: false,
    thirdPartyReference: "",
    contractId: "",
    thirdPartyHolderPersonId: "",
  });
  // FIX (reportado pela cliente): digitar um ano fora do intervalo plausível (ex: "92026")
  // num <input type="date"> faz o navegador considerar o valor inválido e reportar
  // e.target.value = "" — sem isso, o form aceitava esse vazio silenciosamente e submetia
  // o lançamento com dueAt null, sem nenhum aviso. Agora detectamos a invalidez via
  // validity.badInput/rangeOverflow/rangeUnderflow e bloqueamos o submit com erro visível.
  const [dueAtInvalid, setDueAtInvalid] = useState(false);
  // Idempotência client-side (achado da auditoria de idempotência, Marco 7): o campo
  // "idempotencyKey" abaixo era só um texto livre OPCIONAL digitado manualmente pelo usuário —
  // na prática, quase sempre fica em branco (vira `undefined` no payload) e createFinancialEntry
  // é um INSERT simples. Se a resposta do POST se perde (timeout/rede) e o usuário clica em
  // "Criar lançamento" de novo, sem chave nenhuma o backend (financialEntries.service.js,
  // `assertNoDuplicatePayment`) não tem como saber que é o MESMO lançamento e cria um
  // FinancialEntry duplicado. Gera um UUID automaticamente no primeiro clique e reenvia o MESMO
  // UUID em qualquer retry deste envio; o campo manual continua disponível para quem quiser usar
  // uma chave própria (ex. reprocessar import), e nesse caso ela tem prioridade.
  const entryIdempotencyKeyRef = useRef(null);

  useEffect(() => {
    let cancelled = false;
    setLoading(true);
    setLoadError("");
    Promise.all([listBankAccounts(), listCostCenters(), listResultCenters()])
      .then(([ba, cc, rc]) => {
        if (cancelled) return;
        setBankAccounts(ba || []);
        setCostCenters(cc || []);
        setResultCenters(rc || []);
        setForm((prev) => ({ ...prev, bankAccountId: ba?.[0]?.id || "" }));
      })
      .then(() => Promise.all([
        listChartAccounts().catch(() => []),
        listContracts().catch(() => []),
        listPeople().catch(() => []),
      ]))
      .then(([ca, ct, pp]) => {
        if (cancelled) return;
        setChartAccounts(ca || []);
        setContracts(ct || []);
        setPeople(pp || []);
      })
      .catch((err) => {
        if (!cancelled) setLoadError(err?.message || "Não foi possível carregar os dados do formulário.");
      })
      .finally(() => {
        if (!cancelled) setLoading(false);
      });
    return () => {
      cancelled = true;
    };
  }, []);

  // BUG REAL CORRIGIDO (auditoria externa Nayara, 2026-10-07; contrato, Centro Financeiro
  // BLINDADO v1, §4): "Centro de custo obrigatório para despesa. Centro de resultado
  // obrigatório para receita." A tela marcava os dois campos como "Opcional" e deixava
  // passar lançamento de despesa/receita sem o centro correspondente — a API agora também
  // bloqueia isso (FINANCE_ENTRY_COST_CENTER_REQUIRED/FINANCE_ENTRY_RESULT_CENTER_REQUIRED),
  // mas o front precisa impedir o envio antes, não só mostrar o erro depois do POST.
  // Conta analítica = ativa e sem subcontas ativas (conta com subconta é sintética e não recebe lançamento).
  const analyticAccounts = chartAccounts.filter(
    (a) => a.isActive !== false && !chartAccounts.some((c) => c.parentAccountId === a.id && c.isActive !== false)
  );
  const competenceInvalid = form.competenceMonth && !parseCompetenceInput(form.competenceMonth);
  const isTerceiroRecebimento = form.isThirdPartyFunds && form.nature === "RECEIVABLE";
  const isTerceiroSaida = form.isThirdPartyFunds && form.nature === "PAYABLE";
  const contractMissing = isTerceiroRecebimento && !form.contractId;
  const holderMissing = isTerceiroRecebimento && !form.thirdPartyHolderPersonId;
  const referenceMissing = form.isThirdPartyFunds && !isTerceiroSaida && !form.thirdPartyReference.trim();
  const amountInvalid = amountTouched && !(toNumber(form.amount) > 0);
  const costCenterMissing = form.nature === "PAYABLE" && !form.costCenterId;
  const resultCenterMissing = form.nature === "RECEIVABLE" && !form.resultCenterId;
  const isValid =
    form.description.trim() &&
    toNumber(form.amount) > 0 &&
    form.bankAccountId &&
    !dueAtInvalid &&
    !costCenterMissing &&
    !resultCenterMissing &&
    !competenceInvalid &&
    !isTerceiroSaida &&
    !contractMissing &&
    !holderMissing &&
    !referenceMissing;

  function update(field) {
    return (e) => setForm((prev) => ({ ...prev, [field]: e.target.value }));
  }

  // A natureza define o tipo padrão: a receber nasce como Crédito e a pagar como Débito.
  function handleNatureChange(e) {
    const nature = e.target.value;
    setForm((prev) => ({
      ...prev,
      nature,
      entryType: nature === "RECEIVABLE" ? "CREDIT" : nature === "PAYABLE" ? "DEBIT" : prev.entryType,
    }));
  }

  // O titular precisa ser parte do contrato: ao escolher o contrato, carrega as partes dele.
  function handleContractChange(e) {
    const contractId = e.target.value;
    setForm((prev) => ({ ...prev, contractId, thirdPartyHolderPersonId: "" }));
    setParties([]);
    if (!contractId) return;
    setPartiesLoading(true);
    listContractParties(contractId)
      .then((items) => setParties(items || []))
      .catch(() => setParties([]))
      .finally(() => setPartiesLoading(false));
  }

  const PARTY_ROLE_LABEL = { TENANT: "Locatário", BUYER: "Comprador", GUARANTOR: "Fiador", LANDLORD: "Locador", SELLER: "Vendedor" };
  const holderOptions = parties.filter((p) => ["TENANT", "BUYER", "GUARANTOR"].includes(p.partyRole));

  function handleDueAtChange(e) {
    const validity = e.target.validity;
    const invalid = !!validity && (validity.badInput || validity.rangeOverflow || validity.rangeUnderflow);
    setDueAtInvalid(invalid);
    setForm((prev) => ({ ...prev, dueAt: e.target.value }));
  }

  async function handleSubmit() {
    if (dueAtInvalid) {
      setActionError("Data de vencimento inválida. Use uma data com ano entre 1900 e 2100.");
      return;
    }
    if (!isValid) return;
    setSubmitting(true);
    setActionError("");
    const manualKey = form.idempotencyKey.trim();
    if (!manualKey && !entryIdempotencyKeyRef.current) {
      entryIdempotencyKeyRef.current = generateIdempotencyKey();
    }
    try {
      await createFinancialEntry({
        bankAccountId: form.bankAccountId || undefined,
        costCenterId: form.costCenterId || undefined,
        resultCenterId: form.resultCenterId || undefined,
        entryType: form.entryType,
        nature: form.nature,
        amount: toNumber(form.amount),
        description: form.description.trim(),
        dueAt: dateOnlyInputToIso(form.dueAt),
        competenceMonth: form.competenceMonth ? parseCompetenceInput(form.competenceMonth) : undefined,
        chartOfAccountId: form.chartOfAccountId || undefined,
        idempotencyKey: manualKey || entryIdempotencyKeyRef.current,
        isThirdPartyFunds: form.isThirdPartyFunds,
        thirdPartyReference: form.isThirdPartyFunds ? form.thirdPartyReference.trim() || undefined : undefined,
        contractId: isTerceiroRecebimento ? form.contractId : undefined,
        thirdPartyHolderPersonId: isTerceiroRecebimento ? form.thirdPartyHolderPersonId : undefined,
      });
      entryIdempotencyKeyRef.current = null;
      router.push("/painel/financeiro/lancamentos");
    } catch (err) {
      setActionError(friendlyFinanceError(err, "Não foi possível criar o lançamento."));
    } finally {
      setSubmitting(false);
    }
  }

  return (
    <AppShell title="Novo lançamento" backHref="/painel/financeiro/lancamentos">
      <div className={styles.wrap}>
        <Alert tone="info" title="Ledger imutável">
          Após criado, um lançamento nunca é editado em valor — correções sempre geram um lançamento de estorno.
        </Alert>

        {loadError ? <Alert tone="danger" title="Não foi possível carregar os dados do formulário">{loadError}</Alert> : null}
        {actionError ? <Alert tone="danger">{actionError}</Alert> : null}

        {loading ? (
          <SkeletonDetail sections={1} />
        ) : (
          <Card title="Dados do lançamento">
            <div className={styles.formGrid}>
              <FormField label="Descrição" htmlFor="f-desc" required>
                <Input id="f-desc" value={form.description} onChange={update("description")} placeholder="Ex: Aluguel — Edifício Aurora Apto 302" />
              </FormField>

              <FormField
                label="Valor (R$)"
                htmlFor="f-amount"
                required
                error={amountInvalid ? "Informe um valor maior que zero." : undefined}
              >
                <DecimalInput
                  id="f-amount"
                  value={form.amount}
                  onChange={(e) => { setAmountTouched(true); update("amount")(e); }}
                  onBlur={() => setAmountTouched(true)}
                  placeholder="0,00"
                />
              </FormField>

              <FormField label="Natureza" htmlFor="f-nature">
                <div className={styles.natureRow}>
                  <Select id="f-nature" value={form.nature} onChange={handleNatureChange}>
                    {Object.entries(ENTRY_NATURE_LABELS).filter(([k]) => k !== "PENDING_CLASSIFICATION").map(([k, v]) => (
                      <option key={k} value={k}>{v}</option>
                    ))}
                  </Select>
                  <NatureBadge nature={form.nature} />
                </div>
              </FormField>

              <FormField label="Tipo de lançamento" htmlFor="f-type">
                <Select id="f-type" value={form.entryType} onChange={update("entryType")}>
                  <option value="DEBIT">Débito</option>
                  <option value="CREDIT">Crédito</option>
                </Select>
              </FormField>

              <FormField label="Conta bancária" htmlFor="f-account" required>
                <BankAccountSelect
                  accounts={bankAccounts}
                  value={form.bankAccountId}
                  onChange={(id) => setForm((prev) => ({ ...prev, bankAccountId: id }))}
                />
              </FormField>

              <FormField
                label="Vencimento"
                htmlFor="f-due"
                error={dueAtInvalid ? "Data inválida — verifique o ano digitado (use um ano entre 1900 e 2100)." : undefined}
              >
                <Input
                  id="f-due"
                  type="date"
                  min="1900-01-01"
                  max="2100-12-31"
                  error={dueAtInvalid}
                  value={form.dueAt}
                  onChange={handleDueAtChange}
                />
              </FormField>

              <FormField
                label="Competência (mês)"
                htmlFor="f-competence"
                helper="Opcional. Sem informar, vale o mês do vencimento. Use MM/AAAA ou escolha o mês."
                error={competenceInvalid ? "Competência inválida. Use o formato MM/AAAA." : undefined}
              >
                <Input
                  id="f-competence"
                  type="month"
                  value={parseCompetenceInput(form.competenceMonth) || form.competenceMonth}
                  onChange={update("competenceMonth")}
                />
              </FormField>

              <FormField label="Conta contábil" htmlFor="f-chart" helper="Opcional. Só contas analíticas recebem lançamento (contas com subcontas são agrupadoras).">
                <Select id="f-chart" value={form.chartOfAccountId} onChange={update("chartOfAccountId")}>
                  <option value="">Sem conta contábil</option>
                  {analyticAccounts.map((a) => (
                    <option key={a.id} value={a.id}>{a.code} — {a.name}</option>
                  ))}
                </Select>
              </FormField>

              <FormField
                label="Centro de custo"
                htmlFor="f-cc"
                required={form.nature === "PAYABLE"}
                helper={form.nature === "PAYABLE" ? "Obrigatório para despesa" : "Opcional"}
                error={costCenterMissing ? "Obrigatório para lançamentos de despesa." : undefined}
              >
                <Select id="f-cc" value={form.costCenterId} onChange={update("costCenterId")}>
                  <option value="">Nenhum</option>
                  {costCenters.map((c) => (
                    <option key={c.id} value={c.id}>{c.code} — {c.name}</option>
                  ))}
                </Select>
              </FormField>

              <FormField
                label="Centro de resultado"
                htmlFor="f-rc"
                required={form.nature === "RECEIVABLE"}
                helper={form.nature === "RECEIVABLE" ? "Obrigatório para receita" : "Opcional"}
                error={resultCenterMissing ? "Obrigatório para lançamentos de receita." : undefined}
              >
                <Select id="f-rc" value={form.resultCenterId} onChange={update("resultCenterId")}>
                  <option value="">Nenhum</option>
                  {resultCenters.map((r) => (
                    <option key={r.id} value={r.id}>{r.code} — {r.name}</option>
                  ))}
                </Select>
              </FormField>

            </div>
          </Card>
        )}

        {/* FIN-TS-005 / M4-16 (auditoria externa Abacus AI, 11/10/2026): "Caução separada de
            receita — nenhuma categoria ou tela específica encontrada". O backend já suportava
            isThirdPartyFunds/thirdPartyReference (dinheiro que só transita, nunca é receita
            própria), mas o formulário de lançamento nunca expôs esse campo — gap achado na
            verificação cética final do Marco 4, 11/10/2026. */}
        {!loading && (
          <Card title="Dinheiro de terceiro (caução, repasse)">
            <div className={styles.formGrid}>
              <Checkbox
                id="f-third-party"
                label="Este lançamento é dinheiro de terceiro (ex: caução) — não é receita/despesa própria"
                checked={form.isThirdPartyFunds}
                onChange={(e) => setForm((prev) => ({ ...prev, isThirdPartyFunds: e.target.checked }))}
              />
              {isTerceiroSaida ? (
                <Alert tone="info" title="Devolução ou compensação de caução">
                  A saída de dinheiro de terceiro precisa estar ligada à caução recebida. Abra o recebimento da caução e use o botão Devolver ou compensar caução. Aqui você registra apenas o recebimento.
                </Alert>
              ) : null}
              {form.isThirdPartyFunds && !isTerceiroSaida ? (
                <>
                  <FormField
                    label="Contrato"
                    htmlFor="f-third-party-contract"
                    required
                    helper="Contrato ao qual a caução pertence."
                    error={contractMissing ? "Escolha o contrato da caução." : undefined}
                  >
                    <Select id="f-third-party-contract" value={form.contractId} onChange={handleContractChange}>
                      <option value="">Selecione o contrato...</option>
                      {contracts.map((c) => (
                        <option key={c.id} value={c.id}>{formatContractLabel(c)}</option>
                      ))}
                    </Select>
                  </FormField>
                  <FormField
                    label="Titular da caução"
                    htmlFor="f-third-party-holder"
                    required
                    helper="Quem pagou a caução: locatário, comprador ou fiador do contrato."
                    error={holderMissing && form.contractId ? "Escolha o titular da caução." : undefined}
                  >
                    <Select
                      id="f-third-party-holder"
                      value={form.thirdPartyHolderPersonId}
                      onChange={update("thirdPartyHolderPersonId")}
                      disabled={!form.contractId || partiesLoading}
                    >
                      <option value="">{form.contractId ? (partiesLoading ? "Carregando partes..." : "Selecione o titular...") : "Escolha o contrato primeiro"}</option>
                      {holderOptions.map((p) => (
                        <option key={p.personId} value={p.personId}>
                          {(people.find((x) => x.id === p.personId)?.legalName) || "Pessoa sem nome"} — {PARTY_ROLE_LABEL[p.partyRole] || "Parte"}
                        </option>
                      ))}
                    </Select>
                  </FormField>
                  <FormField
                    label="Referência do titular/origem"
                    htmlFor="f-third-party-ref"
                    required
                    helper='Ex: "Caução contrato LOC-2026-0008"'
                    error={referenceMissing ? "Informe a referência da caução." : undefined}
                  >
                    <Input
                      id="f-third-party-ref"
                      value={form.thirdPartyReference}
                      onChange={update("thirdPartyReference")}
                      placeholder="Caução contrato..."
                    />
                  </FormField>
                </>
              ) : null}
            </div>
          </Card>
        )}

        <div className={styles.actionBar}>
          <Button variant="secondary" onClick={() => router.push("/painel/financeiro/lancamentos")}>Cancelar</Button>
          <Button requires="finance:create" onClick={handleSubmit} loading={submitting} disabled={!isValid || loading}>Criar lançamento</Button>
        </div>
      </div>
    </AppShell>
  );
}
