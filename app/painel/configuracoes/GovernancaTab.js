"use client";

import { useEffect, useState } from "react";
import Card from "@/components/molecules/Card/Card";
import Input from "@/components/atoms/Input/Input";
import Checkbox from "@/components/atoms/Checkbox/Checkbox";
import Button from "@/components/atoms/Button/Button";
import Alert from "@/components/molecules/Alert/Alert";
import FormField from "@/components/molecules/FormField/FormField";
import Spinner from "@/components/atoms/Spinner/Spinner";
import DecimalInput from "@/components/atoms/DecimalInput/DecimalInput";
import { toNumber } from "@/lib/format";
import { listSettings, updateSetting } from "@/lib/api/settings";
import styles from "./page.module.css";

// Parâmetros de governança que o administrador controla (Marco 9, bloco E/F). Cada demanda do bloco acrescenta as suas
// entradas aqui, sempre com o padrão do catálogo (Maturacao/demandas/parametros.csv). A API é a fonte da validação
// (SETTINGS_SCHEMA); o padrão mostrado é só o valor inicial quando a empresa ainda não configurou nada.
const GOVERNANCA_GROUPS = [
  {
    title: "Módulos de governança",
    subtitle: "Liga ou desliga cada módulo para esta empresa. Desligado, a API recusa as rotas do módulo com aviso claro.",
    fields: [
      { key: "governanca.modulos.calendar.habilitado", label: "Calendário unificado", type: "boolean", defaultValue: true },
      { key: "governanca.modulos.data_quality.habilitado", label: "Dados mestres e qualidade", type: "boolean", defaultValue: true },
      { key: "governanca.modulos.lineage.habilitado", label: "Linhagem de dados", type: "boolean", defaultValue: true },
      { key: "governanca.modulos.dlp.habilitado", label: "Proteção contra vazamento (DLP)", type: "boolean", defaultValue: true },
      { key: "governanca.modulos.bcp.habilitado", label: "Continuidade operacional (BCP)", type: "boolean", defaultValue: true },
      { key: "governanca.modulos.api_governance.habilitado", label: "Governança de API", type: "boolean", defaultValue: true },
      { key: "governanca.modulos.finops.habilitado", label: "FinOps", type: "boolean", defaultValue: true },
      { key: "governanca.modulos.feature_flags.habilitado", label: "Feature flags e configuração", type: "boolean", defaultValue: true },
    ],
  },
  {
    title: "Calendário unificado",
    subtitle: "Consulta da agenda (GET /calendar): janela e página padrão, quem enxerga cada tipo de item, severidade por origem e duração padrão de compromisso.",
    fields: [
      { key: "governanca.calendario.janela_padrao_dias", label: "Janela padrão da consulta (dias a partir de hoje)", type: "integer", defaultValue: 30, min: 1, max: 366 },
      { key: "governanca.calendario.tamanho_pagina_padrao", label: "Itens por página quando não informado", type: "integer", defaultValue: 50, min: 1, max: 200 },
      { key: "governanca.calendario.duracao_padrao_min", label: "Duração padrão de compromisso sem fim (minutos)", type: "integer", defaultValue: 60, min: 1, max: 1440 },
      { key: "governanca.calendario.garantia_obra_meses", label: "Prazo da garantia da obra entregue (meses a partir da entrega)", type: "integer", defaultValue: 60, min: 1, max: 600 },
      { key: "governanca.calendario.varredura_hora", label: "Hora da varredura diária das fontes de obras e garantias (0 a 23, horário de Brasília)", type: "integer", defaultValue: 6, min: 0, max: 23 },
      { key: "governanca.calendario.alerta_vencido_hora", label: "Hora do alerta diário de itens vencidos (0 a 23, horário de Brasília)", type: "integer", defaultValue: 6, min: 0, max: 23 },
      { key: "governanca.calendario.conflito_intervalo_min", label: "Intervalo do detector de conflito de agenda (minutos)", type: "integer", defaultValue: 15, min: 1, max: 1440 },
      {
        key: "governanca.calendario.fontes_conflito",
        label: "Tipos de origem que entram no conflito de agenda",
        type: "text",
        defaultValue: "VISIT, COMMITMENT, MAINTENANCE",
        helper: "Tipos separados por vírgula (CRM_TASK, VISIT, LEGAL_DEADLINE, RENEWAL, GUARANTEE, BILLING, CONSTRUCTION, MAINTENANCE, FISCAL, COMMITMENT). Dois itens abertos do mesmo responsável com horários que se sobrepõem geram o aviso.",
      },
      {
        key: "governanca.calendario.papel_por_fonte",
        label: "Perfil que recebe o aviso quando a origem não tem responsável",
        type: "text",
        defaultValue: "BILLING=financeiro, FISCAL=fiscal",
        helper: "Formato TIPO=nome do perfil. Sem responsável, o aviso de item vencido vai a todos os usuários ativos desse perfil.",
      },
      {
        key: "governanca.calendario.severidade_por_fonte",
        label: "Severidade por tipo de origem",
        type: "text",
        defaultValue: "LEGAL_DEADLINE=CRITICAL, FISCAL=CRITICAL, BILLING=WARNING, GUARANTEE=WARNING",
        helper: "Formato TIPO=NIVEL (INFO, WARNING ou CRITICAL). Tipo fora da lista fica INFO.",
      },
      {
        key: "governanca.calendario.permissao_por_fonte",
        label: "Permissão exigida para ver cada tipo de origem",
        type: "text",
        defaultValue: "CRM_TASK=crm:tasks:read, VISIT=crm:visits:read, LEGAL_DEADLINE=legal:read, RENEWAL=procurement:read|legal:read, GUARANTEE=legal:read|construction:read, BILLING=billing:read, CONSTRUCTION=construction:read, MAINTENANCE=construction:read, FISCAL=correspondent:fiscal, COMMITMENT=governance:calendar:read",
        helper: "Formato TIPO=permissão; use | para aceitar qualquer uma de várias. Tipo sem permissão listada fica oculto para todos.",
      },
      {
        key: "governanca.calendario.permissao_por_tipo_origem",
        label: "Permissão extra por tipo de item dentro da origem (fiança x garantia de obra)",
        type: "text",
        defaultValue: "LEGAL_GUARANTEE=legal:read, WARRANTY_CASE=construction:read, PROJECT_WARRANTY=construction:read",
        helper: "Formato TIPO=permissão (LEGAL_GUARANTEE, WARRANTY_CASE, PROJECT_WARRANTY, STAGE, PROJECT); use | para aceitar qualquer uma. Tipo fora da lista segue só a regra da origem.",
      },
    ],
  },
  {
    title: "Permissões padrão por perfil",
    subtitle: "Nomes dos perfis (separados por vírgula) que recebem o pacote de Gestão e o do Financeiro; os demais perfis recebem só a leitura do calendário. Só o administrador recebe as permissões sensíveis.",
    fields: [
      { key: "governanca.permissoes.perfis_gestao", label: "Perfis de Gestão", type: "text", defaultValue: "GESTAO, GESTÃO, DIRETOR, GERENTE, GESTOR", helper: "Ex.: DIRETOR, GERENTE" },
      { key: "governanca.permissoes.perfis_financeiro", label: "Perfis do Financeiro", type: "text", defaultValue: "FINANCEIRO", helper: "Ex.: FINANCEIRO, TESOURARIA" },
    ],
  },
  {
    title: "Padrão de erros",
    subtitle: "Códigos de erro da plataforma que continuam sem o prefixo GOV_ nas rotas de governança.",
    fields: [
      {
        key: "governanca.erros.excecoes_prefixo_gov",
        label: "Códigos sem o prefixo GOV_",
        type: "text",
        defaultValue: "PERMISSION_DENIED, MISSING_ACCESS_TOKEN, MFA_STEP_UP_REQUIRED, MFA_REQUIRED_NOT_ENABLED, INTERNAL_ERROR, VALIDATION_ERROR",
      },
    ],
  },
];

const ALL_FIELDS = GOVERNANCA_GROUPS.flatMap((group) => group.fields);

function initialValues() {
  const values = {};
  ALL_FIELDS.forEach((field) => {
    values[field.key] = field.defaultValue;
  });
  return values;
}

export default function GovernancaTab() {
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
    listSettings("governanca.")
      .then((data) => {
        if (cancelled) return;
        const list = Array.isArray(data) ? data : Object.values(data || {});
        const next = initialValues();
        list.forEach((item) => {
          if (item && item.key && Object.prototype.hasOwnProperty.call(next, item.key)) next[item.key] = item.value;
        });
        setValues(next);
        setOriginal(next);
      })
      .catch((err) => {
        if (cancelled) return;
        if (err?.status === 403) setForbidden(true);
        else setError(err?.message || "Não foi possível carregar as configurações de governança.");
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
      const changed = ALL_FIELDS.filter((field) => String(values[field.key]) !== String(original[field.key]));
      for (const field of changed) {
        let value = values[field.key];
        if (field.type === "text" && (typeof value !== "string" || value.trim() === "")) continue; // vazio não é aceito pela API
        if (field.type === "integer") {
          value = toNumber(value);
          if (Number.isNaN(value) || !Number.isInteger(value) || value < field.min || value > field.max) {
            throw new Error(`"${field.label}" deve ser um número inteiro entre ${field.min} e ${field.max}.`);
          }
        }
        await updateSetting(field.key, value);
      }
      setOriginal(values);
      setSuccess("Configurações de governança salvas.");
    } catch (err) {
      if (err?.status === 403) setForbidden(true);
      else setError(err?.message || "Não foi possível salvar as configurações de governança.");
    } finally {
      setSaving(false);
    }
  }

  if (forbidden) {
    return (
      <Card title="Governança">
        <Alert tone="warning" title="Sem permissão">
          Você não tem permissão para visualizar ou alterar as configurações de governança.
        </Alert>
      </Card>
    );
  }

  return (
    <Card
      title="Governança"
      subtitle="Regras de governança operacional desta empresa: módulos, permissões padrão e padrão de erros."
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

          {GOVERNANCA_GROUPS.map((group) => (
            <div key={group.title} className="formGridFull">
              <h3>{group.title}</h3>
              <p>{group.subtitle}</p>
              <div className={styles.formGrid}>
                {group.fields.map((field) =>
                  field.type === "boolean" ? (
                    <Checkbox
                      key={field.key}
                      id={`gov-${field.key}`}
                      label={field.label}
                      checked={Boolean(values[field.key])}
                      onChange={(e) => handleChange(field.key, e.target.checked)}
                    />
                  ) : field.type === "integer" ? (
                    <FormField key={field.key} label={field.label} htmlFor={`gov-${field.key}`} helper={`Entre ${field.min} e ${field.max}.`}>
                      <DecimalInput
                        id={`gov-${field.key}`}
                        maxDecimals={0}
                        value={String(values[field.key] ?? "")}
                        onChange={(e) => handleChange(field.key, e.target.value)}
                      />
                    </FormField>
                  ) : (
                    <FormField key={field.key} label={field.label} htmlFor={`gov-${field.key}`} helper={field.helper}>
                      <Input
                        id={`gov-${field.key}`}
                        value={values[field.key] ?? ""}
                        onChange={(e) => handleChange(field.key, e.target.value)}
                      />
                    </FormField>
                  )
                )}
              </div>
            </div>
          ))}
        </div>
      )}
    </Card>
  );
}
