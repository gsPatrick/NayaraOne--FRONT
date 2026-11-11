"use client";

// Nova garantia (Caderno M5 §9): códigos do livro e os dados de cada tipo. Sem todos os dados a garantia nasce
// Pendente (a tela avisa antes o que vai faltar). Com `?substituir=<id>` a mesma tela substitui uma garantia: a nova
// nasce no mesmo contrato e a antiga fica Liberada, ligada à nova (POST /legal/guarantees/:id/replace).
import { useEffect, useState } from "react";
import { useRouter } from "next/navigation";
import AppShell from "@/components/organisms/AppShell/AppShell";
import Card from "@/components/molecules/Card/Card";
import FormField from "@/components/molecules/FormField/FormField";
import Select from "@/components/atoms/Select/Select";
import Button from "@/components/atoms/Button/Button";
import Alert from "@/components/molecules/Alert/Alert";
import AsyncState from "@/components/molecules/AsyncState/AsyncState";
import { UI_STATE } from "@/lib/asyncState/states";
import { useAsyncState } from "@/lib/asyncState/useAsyncState";
import { listContracts, createGuarantee, replaceGuarantee, getGuarantee, uploadFile } from "@/lib/api/legal";
import { GUARANTEE_TYPES, GUARANTEE_TYPE_LABELS, GUARANTEE_FIELD_LABELS, GUARANTEE_TYPES_REQUIRING_VALIDITY, normalizeGuaranteeType } from "@/lib/labels/juridico";
import { formatContractLabel } from "@/lib/format";
import { legalErrorMessage } from "@/lib/legal/legalErrors";
import GuaranteeTypeFields from "../GuaranteeTypeFields";
import { emptyGuaranteeForm, missingForType, installmentsProblem, flowProblem, buildGuaranteePayload, depositOriginCandidates } from "../guaranteeForm";
import { useGuaranteeSupport } from "../useGuaranteeSupport";
import styles from "./page.module.css";

export default function NovaGarantiaPage() {
  const router = useRouter();
  const [contracts, setContracts] = useState([]);
  const [contractId, setContractId] = useState("");
  const [guaranteeType, setGuaranteeType] = useState("GUARANTOR");
  const [form, setForm] = useState(emptyGuaranteeForm());
  const [replacing, setReplacing] = useState(null); // garantia a substituir
  const [actionError, setActionError] = useState("");
  const [submitting, setSubmitting] = useState(false);
  const support = useGuaranteeSupport();

  const loadQuery = useAsyncState(async () => {
    const replaceId = typeof window !== "undefined" ? new URLSearchParams(window.location.search).get("substituir") : null;
    const [contractsRes, old] = await Promise.all([listContracts(), replaceId ? getGuarantee(replaceId) : Promise.resolve(null)]);
    setContracts(contractsRes || []);
    setReplacing(old);
    setContractId((prev) => (old ? old.contractId : prev || contractsRes?.[0]?.id || ""));
    return true;
  }, { deps: [], isEmpty: () => false });

  // Tipo do livro com fluxo: OTHER só quando a empresa homologou um fluxo (configuração legal.guarantee_other_flows).
  const otherAvailable = support.otherFlows.length > 0;
  useEffect(() => {
    if (guaranteeType === "OTHER" && !otherAvailable) setGuaranteeType("GUARANTOR");
  }, [guaranteeType, otherAvailable]);

  const depositEntries = depositOriginCandidates(support.entries, contractId);
  const missing = missingForType(guaranteeType, form);
  // A API recusa já na criação (400) fiador sem pessoa e tipo com vigência sem o fim da vigência (Caderno §9).
  const baseProblem = guaranteeType === "GUARANTOR" && !form.guarantorPersonId
    ? "Escolha a pessoa fiadora."
    : GUARANTEE_TYPES_REQUIRING_VALIDITY.includes(guaranteeType) && !form.endsAt ? "Informe o fim da vigência: é obrigatório para este tipo de garantia." : "";
  const problem = baseProblem || installmentsProblem(form) || (guaranteeType === "OTHER" ? flowProblem(guaranteeType, form, support.otherFlows) : "");
  const isValid = contractId && guaranteeType && !problem;

  async function handleSubmit() {
    if (!isValid) return;
    setActionError("");
    setSubmitting(true);
    try {
      const payload = { guaranteeType, ...(await buildGuaranteePayload(guaranteeType, form, uploadFile)) };
      if (replacing) {
        const result = await replaceGuarantee(replacing.id, payload);
        router.push(`/painel/contratos/garantias/${result.newGuarantee.id}`);
      } else {
        const created = await createGuarantee(contractId, payload);
        router.push(`/painel/contratos/garantias/${created.id}`);
      }
    } catch (err) {
      setActionError(legalErrorMessage(err, "Erro ao gravar a garantia."));
    } finally {
      setSubmitting(false);
    }
  }

  const title = replacing ? "Substituir garantia" : "Nova garantia";
  if (loadQuery.status !== UI_STATE.CONTENT) {
    return (
      <AppShell title={title} backHref="/painel/contratos/garantias">
        <AsyncState result={loadQuery} loadingLabel="Carregando dados..." />
      </AppShell>
    );
  }

  const replacedContract = replacing ? contracts.find((c) => c.id === replacing.contractId) : null;
  return (
    <AppShell title={title} backHref={replacing ? `/painel/contratos/garantias/${replacing.id}` : "/painel/contratos/garantias"}>
      <div className={styles.wrap}>
        {actionError ? (
          <div style={{ position: "fixed", top: "var(--space-4)", left: "50%", transform: "translateX(-50%)", zIndex: 200, width: "min(560px, calc(100vw - 2 * var(--space-4)))" }}>
            <Alert tone="danger">{actionError}</Alert>
          </div>
        ) : null}

        {replacing ? (
          <Alert tone="info" title="Substituição sem perder histórico">
            A garantia atual ({GUARANTEE_TYPE_LABELS[normalizeGuaranteeType(replacing.guaranteeType)]}) do contrato {formatContractLabel(replacedContract) || "vinculado"} fica Liberada e ligada à nova; nada é apagado.
          </Alert>
        ) : null}

        <Card title="Dados da garantia" subtitle="Cada tipo pede os dados do livro: fiador, seguro-fiança, caução, título de capitalização ou outra forma homologada">
          <div className={styles.formGrid}>
            <FormField label="Contrato" htmlFor="f-contract" required>
              <Select id="f-contract" value={contractId} onChange={(e) => setContractId(e.target.value)} disabled={Boolean(replacing)}>
                {contracts.map((c) => (
                  <option key={c.id} value={c.id}>{formatContractLabel(c)}</option>
                ))}
              </Select>
            </FormField>

            <FormField
              label="Tipo de garantia"
              htmlFor="f-type"
              required
              helper={otherAvailable ? undefined : support.flowsReadable ? "“Outra (homologada)” fica disponível quando a empresa configurar um fluxo homologado." : "Não foi possível ler os fluxos homologados de “Outra (homologada)” (veja o aviso acima)."}
            >
              <Select id="f-type" value={guaranteeType} onChange={(e) => { setGuaranteeType(e.target.value); setForm(emptyGuaranteeForm()); }}>
                {GUARANTEE_TYPES.map((k) => (
                  <option key={k} value={k} disabled={k === "OTHER" && !otherAvailable}>{GUARANTEE_TYPE_LABELS[k]}</option>
                ))}
              </Select>
            </FormField>
          </div>
        </Card>

        <Card title={`Dados de ${GUARANTEE_TYPE_LABELS[guaranteeType]}`}>
          <GuaranteeTypeFields type={guaranteeType} form={form} onChange={setForm} support={{ people: support.people, depositEntries, otherFlows: support.otherFlows }} />
        </Card>

        {problem ? <Alert tone={baseProblem ? "info" : "danger"}>{problem}</Alert> : null}
        {missing.length ? (
          <Alert tone="warning" title="A garantia será criada como Pendente (faltam dados)">
            Ela não vale como garantia ativa até completar: {missing.map((k) => GUARANTEE_FIELD_LABELS[k] || "dado do tipo").join(", ")}.
          </Alert>
        ) : (
          <Alert tone="success" title="Dados completos">A garantia será criada como Ativa.</Alert>
        )}

        <div className={styles.actionBar}>
          <Button variant="secondary" onClick={() => router.push("/painel/contratos/garantias")}>Cancelar</Button>
          <Button onClick={handleSubmit} loading={submitting} disabled={!isValid || submitting}>{replacing ? "Substituir garantia" : "Criar garantia"}</Button>
        </div>
      </div>
    </AppShell>
  );
}
