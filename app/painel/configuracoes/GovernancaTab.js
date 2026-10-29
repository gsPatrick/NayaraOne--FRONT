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
import { GOVERNANCA_DLP_GROUPS } from "./governancaDlpGroups";
import { GOVERNANCA_DLP_EXPORT_GROUPS } from "./governancaDlpExportGroups";

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
    title: "Dados mestres",
    subtitle: "Domínios de dados que têm um responsável (owner) e um curador (steward) designados pela API de Dados mestres.",
    fields: [
      {
        key: "governanca.dados.dominios",
        label: "Domínios de dados",
        type: "text",
        defaultValue: "PESSOAS,IMOVEIS,FORNECEDORES,CRM,FINANCEIRO,CONTRATOS,COMISSOES,OBRAS,ESTOQUE,CORRESPONDENTE,FISCAL",
        helper: "Códigos separados por vírgula (maiúsculas, números e _). Domínio novo aparece sem responsável até alguém ser designado.",
      },
      {
        key: "governanca.dados.campos_criticos",
        label: "Campos críticos (exigem origem e comprovante)",
        type: "text",
        defaultValue:
          "PERSON.taxIdNormalized, PERSON.legalName, PERSON.birthOrFoundationDate, PERSON.bankCode, PERSON.agency, PERSON.accountNumber, PERSON.pixKey, PERSON.ownerPersonId, PROPERTY.registryNumber, PROPERTY.owner, SUPPLIER.taxIdNormalized, SUPPLIER.bankCode, SUPPLIER.agency, SUPPLIER.accountNumber, SUPPLIER.pixKey, SUPPLIER.ownerPersonId, REPASSE.bankAccountId",
        helper:
          "Itens FAMÍLIA.campo separados por vírgula. Famílias: PERSON, PROPERTY, SUPPLIER (fornecedor é pessoa com o papel Fornecedor) e REPASSE. Alterar um destes campos sem informar a origem e o comprovante é recusado.",
      },
      {
        key: "governanca.dados.evidencia.nota_minima",
        label: "Tamanho mínimo da descrição da origem (caracteres)",
        type: "integer",
        defaultValue: 10,
        min: 1,
        max: 500,
      },
      { key: "governanca.dados.merge.score_minimo", label: "Fila de união de cadastros: score mínimo para entrar na fila", type: "integer", defaultValue: 70, min: 0, max: 100 },
      {
        key: "governanca.dados.merge.scores",
        label: "Fila de união de cadastros: score de cada regra de detecção",
        type: "text",
        defaultValue:
          "PERSON_TAX_ID=100, PERSON_NAME_CONTACT=85, PERSON_NAME_BIRTH=70, PROPERTY_REGISTRY=95, PROPERTY_ADDRESS_UNIT=95, PROPERTY_ADDRESS_AREA=75, SUPPLIER_CNPJ_ROOT=90, SUPPLIER_NAME=80",
        helper:
          "Formato REGRA=score (0 a 100). Pessoa: mesmo CPF/CNPJ (PERSON_TAX_ID), nome igual e mesmo contato (PERSON_NAME_CONTACT), nome parecido e mesmo nascimento (PERSON_NAME_BIRTH). Imóvel: mesma matrícula (PROPERTY_REGISTRY), mesmo endereço com unidade (PROPERTY_ADDRESS_UNIT), mesmo endereço e área parecida (PROPERTY_ADDRESS_AREA). Fornecedor: mesmo CNPJ raiz (SUPPLIER_CNPJ_ROOT) e mesma razão social (SUPPLIER_NAME). Nenhum score une sozinho: toda união é decisão de uma pessoa.",
      },
      { key: "governanca.dados.merge.distancia_nome_max", label: "Fila de união de cadastros: diferença máxima entre nomes (letras)", type: "integer", defaultValue: 2, min: 0, max: 10 },
      { key: "governanca.dados.merge.area_diferenca_max_pct", label: "Fila de união de cadastros: diferença máxima de área entre imóveis (%)", type: "integer", defaultValue: 3, min: 0, max: 100 },
      { key: "governanca.dados.merge.deteccao_hora", label: "Fila de união de cadastros: hora da detecção noturna (0 a 23, horário de Brasília)", type: "integer", defaultValue: 3, min: 0, max: 23 },
      { key: "governanca.dados.merge.lista_tamanho_padrao", label: "Fila de união de cadastros: itens por página", type: "integer", defaultValue: 50, min: 1, max: 200 },
      {
        key: "governanca.dados.qualidade.pesos",
        label: "Qualidade de cadastro: peso de cada regra",
        type: "text",
        defaultValue:
          "PERSON_TAX_ID_PRESENT=20, PERSON_TAX_ID_VALID=25, PERSON_CONTACT_PRESENT=15, PERSON_ADDRESS_COMPLETE=15, PERSON_BIRTH_COHERENT=10, PERSON_NAME_NO_DIGITS=5, PERSON_ROLE_DEFINED=10, PROPERTY_REGISTRY_PRESENT=20, PROPERTY_ADDRESS_COMPLETE=20, PROPERTY_OWNER_LINKED=25, PROPERTY_AREA_POSITIVE=15, PROPERTY_PURPOSE_DEFINED=10, PROPERTY_MEDIA_MIN=10, SUPPLIER_TAX_ID_VALID=30, SUPPLIER_CONTACT_PRESENT=20, SUPPLIER_BANK_VALIDATED=25, SUPPLIER_CATEGORY_DEFINED=10, SUPPLIER_QUALIFICATION_VALID=15",
        helper:
          "Formato REGRA=peso (0 a 999). A nota do cadastro é 100 x (soma dos pesos das regras que passam) / (soma dos pesos das regras que se aplicam). Pessoa: PERSON_*; imóvel: PROPERTY_*; fornecedor: SUPPLIER_*.",
      },
      {
        key: "governanca.dados.qualidade.severidades",
        label: "Qualidade de cadastro: severidade de cada regra",
        type: "text",
        defaultValue:
          "PERSON_TAX_ID_PRESENT=HIGH, PERSON_TAX_ID_VALID=CRITICAL, PERSON_CONTACT_PRESENT=MEDIUM, PERSON_ADDRESS_COMPLETE=MEDIUM, PERSON_BIRTH_COHERENT=MEDIUM, PERSON_NAME_NO_DIGITS=LOW, PERSON_ROLE_DEFINED=LOW, PROPERTY_REGISTRY_PRESENT=HIGH, PROPERTY_ADDRESS_COMPLETE=HIGH, PROPERTY_OWNER_LINKED=CRITICAL, PROPERTY_AREA_POSITIVE=MEDIUM, PROPERTY_PURPOSE_DEFINED=MEDIUM, PROPERTY_MEDIA_MIN=LOW, SUPPLIER_TAX_ID_VALID=CRITICAL, SUPPLIER_CONTACT_PRESENT=MEDIUM, SUPPLIER_BANK_VALIDATED=HIGH, SUPPLIER_CATEGORY_DEFINED=LOW, SUPPLIER_QUALIFICATION_VALID=MEDIUM",
        helper: "Formato REGRA=LOW, MEDIUM, HIGH ou CRITICAL. A regra reprovada abre um problema com essa severidade.",
      },
      {
        key: "governanca.dados.qualidade.regras_desativadas",
        label: "Qualidade de cadastro: regras fora do cálculo",
        type: "text",
        defaultValue: "NENHUMA",
        helper: "NENHUMA ou a lista de regras (separadas por vírgula) que deixam de valer. Os problemas abertos dessas regras são encerrados na próxima avaliação.",
      },
      {
        key: "governanca.dados.qualidade.endereco_campos",
        label: "Qualidade de cadastro: campos que o endereço completo exige",
        type: "text",
        defaultValue: "zip_code, street, number, neighborhood, city, state",
        helper: "Campos entre zip_code (CEP), street (logradouro), number (número), neighborhood (bairro), city (cidade) e state (UF).",
      },
      { key: "governanca.dados.qualidade.midia_minima", label: "Qualidade de cadastro: quantidade mínima de fotos/mídias do imóvel", type: "integer", defaultValue: 1, min: 0, max: 100 },
      {
        key: "governanca.dados.qualidade.categorias_qualificacao",
        label: "Qualidade de cadastro: categorias de fornecedor que exigem qualificação vigente",
        type: "text",
        defaultValue: "*",
        helper: "* vale para todo fornecedor (Compras já exige qualificação de todos); ou liste categorias separadas por vírgula.",
      },
      {
        key: "governanca.dados.qualidade.severidade_revisao",
        label: "Qualidade de cadastro: a partir de qual severidade o problema vai à fila de revisão do curador",
        type: "text",
        defaultValue: "CRITICAL",
        helper: "LOW, MEDIUM, HIGH ou CRITICAL. Padrão CRITICAL.",
      },
      { key: "governanca.dados.qualidade.varredura_hora", label: "Qualidade de cadastro: hora da varredura noturna (0 a 23, horário de Brasília)", type: "integer", defaultValue: 3, min: 0, max: 23 },
      { key: "governanca.dados.qualidade.lista_tamanho_padrao", label: "Qualidade de cadastro: itens por página da consulta", type: "integer", defaultValue: 50, min: 1, max: 200 },
      { key: "governanca.dados.bulk.max_registros", label: "Alteração em massa: limite de registros de um lote", type: "integer", defaultValue: 5000, min: 1, max: 100000, helper: "Lote que casa com mais registros que isso é recusado e a tentativa fica na auditoria." },
      { key: "governanca.dados.bulk.motivo_minimo", label: "Alteração em massa: tamanho mínimo do motivo (caracteres)", type: "integer", defaultValue: 10, min: 1, max: 500 },
      { key: "governanca.dados.bulk.pagina_tamanho", label: "Alteração em massa: itens por página das consultas de lotes", type: "integer", defaultValue: 50, min: 1, max: 200 },
    ],
  },
  {
    title: "Linhagem de dados",
    subtitle: "Registro de onde cada número crítico vem (campo de origem, campo de domínio, evento, read model e indicador). A cobertura aparece em GET /data-lineage; o portão de CI cobra sempre todos os indicadores críticos.",
    fields: [
      {
        key: "governanca.lineage.kpis_criticos",
        label: "KPIs executivos cobrados na visão de cobertura",
        type: "text",
        defaultValue: "*",
        helper: "* cobra todos os KPIs críticos da tabela de criticidade do BI; ou liste códigos separados por vírgula (ex.: fin.free_cash, crm.proposals). Dinheiro, contratos, comissões e DIMOB são sempre cobrados.",
      },
      {
        key: "governanca.lineage.dominios_adicionais",
        label: "Domínios responsáveis aceitos além dos de dados mestres",
        type: "text",
        defaultValue: "TECNOLOGIA",
        helper: "Códigos separados por vírgula. Um nó de lineage só aceita como responsável um domínio de dados mestres ou um destes.",
      },
    ],
  },
  ...GOVERNANCA_DLP_GROUPS,
  ...GOVERNANCA_DLP_EXPORT_GROUPS,
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
