"use client";

import { useEffect, useState } from "react";
import Card from "@/components/molecules/Card/Card";
import Input from "@/components/atoms/Input/Input";
import Select from "@/components/atoms/Select/Select";
import Checkbox from "@/components/atoms/Checkbox/Checkbox";
import Button from "@/components/atoms/Button/Button";
import Alert from "@/components/molecules/Alert/Alert";
import FormField from "@/components/molecules/FormField/FormField";
import Spinner from "@/components/atoms/Spinner/Spinner";
import { listSettings, updateSetting } from "@/lib/api/settings";
import { toNumber } from "@/lib/format";
import styles from "./page.module.css";

// Parâmetros do registro de integrações (Marco 9, M9-D200 e seguintes do bloco B) que o administrador controla.
// A API valida (SETTINGS_SCHEMA); o padrão mostrado é o do catálogo (Maturacao/demandas/parametros.csv) e só vale
// enquanto a empresa não configurou nada. Cada demanda do bloco acrescenta as suas entradas aqui.
const REGISTRO_GROUPS = [
  {
    title: "Segurança das conexões",
    subtitle: "Controles aplicados quando alguém altera ou testa uma conexão de integração em ambiente de produção.",
    fields: [
      {
        key: "integration.admin.mfa_on_prod_connection_change",
        label: "Exigir verificação MFA recente para criar, alterar ou ativar conexão em produção",
        type: "boolean",
        defaultValue: true,
      },
      {
        key: "integration.admin.mfa_on_prod_test_connection",
        label: "Exigir verificação MFA recente para testar conexão em produção",
        type: "boolean",
        defaultValue: true,
      },
      {
        key: "integration.registry.secret_scan_min_length",
        label: "Tamanho mínimo (caracteres) de texto sem espaço tratado como segredo embutido na configuração",
        type: "integer",
        defaultValue: 40,
        helper: "De 24 a 256. A configuração da conexão nunca guarda segredo: só a referência do cofre.",
      },
    ],
  },
  {
    title: "Escolha da conexão",
    subtitle: "O que fazer quando mais de uma conexão ativa atende o mesmo domínio (por exemplo, dois fornecedores de WhatsApp).",
    fields: [
      {
        key: "integration.registry.domain_resolution",
        label: "Regra de escolha",
        type: "enum",
        defaultValue: "error_if_multiple",
        options: [
          { value: "error_if_multiple", label: "Recusar e pedir que o fornecedor seja informado" },
          { value: "oldest_active", label: "Usar a conexão ativa mais antiga" },
          { value: "newest_active", label: "Usar a conexão ativa mais recente" },
        ],
      },
    ],
  },
  {
    title: "Fila de eventos (publicação interna)",
    subtitle: "Esperas entre as tentativas quando um evento do sistema não consegue ser entregue. A falha do fornecedor externo não entra aqui: ela segue a política própria do envio.",
    fields: [
      {
        key: "integration.outbox.backoff_ms",
        label: "Esperas entre tentativas, em milissegundos, separadas por vírgula",
        type: "text",
        defaultValue: "60000,300000,900000,3600000,14400000",
        helper: "Padrão: 1 min, 5 min, 15 min, 1 h e 4 h. A quantidade de números é o limite de tentativas: depois da última, o evento vai para a fila de falhas.",
      },
    ],
  },
];

// Cofre de segredos (M9-D202): o segredo mora no cofre; aqui só as regras de uso, rotação e vencimento.
REGISTRO_GROUPS.push({
  title: "Cofre de segredos",
  subtitle: "Regras de leitura, rotação e vencimento das credenciais das integrações. O valor do segredo nunca é digitado nem exibido aqui: o cadastro guarda só a referência do cofre.",
  fields: [
    { key: "integration.secret.cache_ttl_s", label: "Tempo (segundos) que o segredo lido fica em memória", type: "integer", defaultValue: 60, helper: "De 0 a 3600. Zero desliga o cache: uma troca de segredo vale na próxima leitura." },
    { key: "integration.secret.grace_period_min", label: "Janela de graça da rotação (minutos)", type: "integer", defaultValue: 30, helper: "De 0 a 1440. A versão antiga continua aceita nesse tempo, para webhooks já em andamento." },
    { key: "integration.secret.rotation_max_age_days.BANK", label: "Idade máxima da credencial bancária (dias)", type: "integer", defaultValue: 90, helper: "De 1 a 365. Passado esse prazo a integração bancária fica com falha de autenticação até a rotação." },
    { key: "integration.secret.expiry_alert_days", label: "Avisos de credencial expirando (dias antes, separados por vírgula)", type: "text", defaultValue: "30,14,7" },
    { key: "integration.secret.require_company_prefix", label: "Exigir que a referência do cofre comece por company/<id da empresa>/", type: "boolean", defaultValue: true },
    { key: "integration.secret.mfa_on_bank_secret_change", label: "Exigir verificação MFA recente para trocar ou rotacionar a credencial bancária", type: "boolean", defaultValue: true },
  ],
});

// Criticidade de cada uma das 14 famílias do catálogo (M9-D201). Padrão = o do catálogo; define o SLO e se a família
// exige contingência (CRITICAL). A API valida a chave `integration.catalog.criticality.<família>`.
const CRITICIDADE_OPCOES = [
  { value: "CRITICAL", label: "Crítica" },
  { value: "HIGH", label: "Alta" },
  { value: "MEDIUM", label: "Média" },
  { value: "LOW", label: "Baixa" },
];
const CRITICIDADE_FAMILIAS = [
  ["messaging", "WhatsApp e atendimento", "HIGH"],
  ["email", "E-mail", "MEDIUM"],
  ["site", "Site", "MEDIUM"],
  ["portal", "Portais imobiliários", "MEDIUM"],
  ["signature", "Assinatura digital", "CRITICAL"],
  ["bank", "Bancos, extratos e pagamentos", "CRITICAL"],
  ["insurance", "Seguradoras e garantias", "HIGH"],
  ["financing", "Financiamento e promotoras", "CRITICAL"],
  ["fiscal", "NFS-e e fiscal", "HIGH"],
  ["social", "Redes sociais e publicação", "LOW"],
  ["storage", "Armazenamento de objetos", "HIGH"],
  ["identity", "Identidade e autenticação", "CRITICAL"],
  ["ai", "Modelos de IA", "MEDIUM"],
  ["analytics", "Analytics e monitoramento", "LOW"],
];
REGISTRO_GROUPS.push({
  title: "Criticidade das famílias de integração",
  subtitle: "Define o nível de cada família do catálogo (SLO e contingência). Famílias críticas precisam de modo de contingência definido.",
  fields: CRITICIDADE_FAMILIAS.map(([familia, label, defaultValue]) => ({
    key: `integration.catalog.criticality.${familia}`,
    label,
    type: "enum",
    defaultValue,
    options: CRITICIDADE_OPCOES,
  })),
});

// Sincronização retomável (M9-D208): páginas, lease do worker, janela de sobreposição e quando um fluxo é dado como parado.
REGISTRO_GROUPS.push({
  title: "Sincronização com fornecedores",
  subtitle: "Leituras periódicas (extratos, status de anúncios, mensagens) que continuam do ponto onde pararam, sem perder nem repetir dados.",
  fields: [
    { key: "integration.sync.page_size", label: "Itens por página lida", type: "integer", defaultValue: 200, helper: "De 1 a 5000. Cada página é gravada e o ponto de leitura avança juntos." },
    { key: "integration.sync.lease_s", label: "Tempo (segundos) que um worker reserva o fluxo", type: "integer", defaultValue: 300, helper: "De 10 a 3600. Passado esse tempo sem avanço, outro worker assume." },
    { key: "integration.sync.overlap_s", label: "Sobreposição da leitura por data (segundos)", type: "integer", defaultValue: 60, helper: "De 0 a 86400. A leitura recomeça esses segundos antes do ponto salvo; itens repetidos são descartados." },
    { key: "integration.sync.failures_to_stall", label: "Falhas seguidas até o fluxo ser dado como parado", type: "integer", defaultValue: 5, helper: "De 1 a 100. Fluxo parado só volta com nova tentativa manual." },
    { key: "integration.sync.stalled_after_minutes.CRITICAL", label: "Alerta de sync parado - integração crítica (minutos sem sucesso)", type: "integer", defaultValue: 15, helper: "De 1 a 10080." },
    { key: "integration.sync.stalled_after_minutes.HIGH", label: "Alerta de sync parado - integração alta (minutos sem sucesso)", type: "integer", defaultValue: 30, helper: "De 1 a 10080." },
    { key: "integration.sync.stalled_after_minutes.MEDIUM", label: "Alerta de sync parado - integração média (minutos sem sucesso)", type: "integer", defaultValue: 120, helper: "De 1 a 10080." },
    { key: "integration.sync.stalled_after_minutes.LOW", label: "Alerta de sync parado - integração baixa (minutos sem sucesso)", type: "integer", defaultValue: 1440, helper: "De 1 a 10080." },
  ],
});

const ALL_FIELDS = REGISTRO_GROUPS.flatMap((group) => group.fields);

function initialValues() {
  const values = {};
  ALL_FIELDS.forEach((field) => {
    values[field.key] = field.type === "integer" ? String(field.defaultValue) : field.defaultValue;
  });
  return values;
}

export default function IntegracoesRegistroTab() {
  const [values, setValues] = useState(initialValues);
  const [original, setOriginal] = useState(null);
  const [loading, setLoading] = useState(true);
  const [saving, setSaving] = useState(false);
  const [error, setError] = useState("");
  const [forbidden, setForbidden] = useState(false);
  const [success, setSuccess] = useState("");

  useEffect(() => {
    let cancelled = false;
    setLoading(true);
    setError("");
    setForbidden(false);
    listSettings("integration.")
      .then((data) => {
        if (cancelled) return;
        const list = Array.isArray(data) ? data : Object.values(data || {});
        const next = initialValues();
        list.forEach((item) => {
          if (!item || !item.key || !Object.prototype.hasOwnProperty.call(next, item.key)) return;
          next[item.key] = typeof item.value === "number" ? String(item.value) : item.value;
        });
        setValues(next);
        setOriginal(next);
      })
      .catch((err) => {
        if (cancelled) return;
        if (err?.status === 403) setForbidden(true);
        else setError(err?.message || "Não foi possível carregar as configurações do registro de integrações.");
      })
      .finally(() => {
        if (!cancelled) setLoading(false);
      });
    return () => {
      cancelled = true;
    };
  }, []);

  function handleChange(key, value) {
    setValues((prev) => ({ ...prev, [key]: value }));
  }

  async function handleSave() {
    if (!original) return;
    setSaving(true);
    setError("");
    setSuccess("");
    try {
      const changed = ALL_FIELDS.filter((field) => values[field.key] !== original[field.key]);
      for (const field of changed) {
        let value = values[field.key];
        if (field.type === "integer") {
          const numeric = toNumber(value);
          if (Number.isNaN(numeric) || !Number.isInteger(numeric)) {
            throw new Error(`Informe um número inteiro em "${field.label}".`);
          }
          value = numeric;
        }
        await updateSetting(field.key, value);
      }
      setOriginal(values);
      setSuccess("Configurações do registro de integrações salvas.");
    } catch (err) {
      if (err?.status === 403) setForbidden(true);
      else setError(err?.message || "Não foi possível salvar as configurações do registro de integrações.");
    } finally {
      setSaving(false);
    }
  }

  if (forbidden) {
    return (
      <Card title="Registro de integrações">
        <Alert tone="warning" title="Sem permissão">
          Você não tem permissão para visualizar ou alterar as configurações do registro de integrações.
        </Alert>
      </Card>
    );
  }

  return (
    <Card
      title="Registro de integrações"
      subtitle="Regras do cadastro único de fornecedores e conexões: segurança em produção, escolha entre conexões e criticidade das famílias."
      actions={
        <Button onClick={handleSave} loading={saving} disabled={loading}>
          Salvar
        </Button>
      }
    >
      {loading ? (
        <Spinner />
      ) : (
        <div className={styles.formGrid}>
          {error || success ? (
            <div className="formGridFull">
              {error ? <Alert tone="danger" title="Erro">{error}</Alert> : null}
              {success ? <Alert tone="success">{success}</Alert> : null}
            </div>
          ) : null}

          {REGISTRO_GROUPS.map((group) => (
            <div key={group.title} className="formGridFull">
              <h3>{group.title}</h3>
              <p>{group.subtitle}</p>
              <div className={styles.formGrid}>
                {group.fields.map((field) => {
                  const id = `integracao-registro-${field.key}`;
                  if (field.type === "boolean") {
                    return (
                      <Checkbox
                        key={field.key}
                        id={id}
                        label={field.label}
                        checked={Boolean(values[field.key])}
                        onChange={(e) => handleChange(field.key, e.target.checked)}
                      />
                    );
                  }
                  if (field.type === "enum") {
                    return (
                      <FormField key={field.key} label={field.label} htmlFor={id} helper={field.helper}>
                        <Select id={id} value={values[field.key]} onChange={(e) => handleChange(field.key, e.target.value)}>
                          {field.options.map((option) => (
                            <option key={option.value} value={option.value}>{option.label}</option>
                          ))}
                        </Select>
                      </FormField>
                    );
                  }
                  return (
                    <FormField key={field.key} label={field.label} htmlFor={id} helper={field.helper}>
                      <Input id={id} inputMode={field.type === "text" ? "text" : "numeric"} value={values[field.key] ?? ""} onChange={(e) => handleChange(field.key, e.target.value)} />
                    </FormField>
                  );
                })}
              </div>
            </div>
          ))}
        </div>
      )}
    </Card>
  );
}
