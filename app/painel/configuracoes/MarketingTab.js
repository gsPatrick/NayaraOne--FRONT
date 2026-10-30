"use client";

import { useEffect, useState } from "react";
import Card from "@/components/molecules/Card/Card";
import Input from "@/components/atoms/Input/Input";
import Checkbox from "@/components/atoms/Checkbox/Checkbox";
import Button from "@/components/atoms/Button/Button";
import Alert from "@/components/molecules/Alert/Alert";
import FormField from "@/components/molecules/FormField/FormField";
import Spinner from "@/components/atoms/Spinner/Spinner";
import { listSettings, updateSetting } from "@/lib/api/settings";
import { toNumber } from "@/lib/format";
import styles from "./page.module.css";
import { MARKETING_CADENCE_GROUPS } from "./marketingCadenceGroups";
import { MARKETING_RUNNER_GROUPS } from "./marketingRunnerGroups";
import { MARKETING_AGENDAMENTO_GROUPS } from "./marketingAgendamentoGroups";
import { MARKETING_PUBLICACOES_GROUPS } from "./marketingPublicacoesGroups";
import { MARKETING_AUTOPUBLICACAO_GROUPS } from "./marketingAutopublicacaoGroups";
import { MARKETING_CONSENT_GROUPS } from "./marketingConsentGroups";
import { MARKETING_TIPOS_CONTEUDO_GROUPS } from "./marketingTiposConteudoGroups";
import { MARKETING_FACTUAL_GROUPS } from "./marketingFactualGroups";
import { MARKETING_SEGMENTACAO_GROUPS } from "./marketingSegmentacaoGroups";
import { MARKETING_ATRIBUICAO_GROUPS } from "./marketingAtribuicaoGroups";
import { MARKETING_CUSTOS_GROUPS } from "./marketingCustosGroups";
import { MARKETING_CANAIS_GROUPS } from "./marketingCanaisGroups";
import { MARKETING_SEO_BLOG_GROUPS } from "./marketingSeoBlogGroups";
import { MARKETING_MENSAGENS_GROUPS } from "./marketingMensagensGroups";
import { MARKETING_KILLSWITCH_GROUPS } from "./marketingKillSwitchGroups";
import { MARKETING_AUTOMACOES_PRONTAS_GROUPS } from "./marketingAutomacoesProntasGroups";

// Parâmetros de Marketing que o administrador controla (Marco 9, bloco C). Cada demanda do bloco acrescenta as suas
// entradas aqui, sempre com o padrão do catálogo (Maturacao/demandas/parametros.csv). A API é a fonte da validação
// (SETTINGS_SCHEMA); o padrão mostrado é só o valor inicial quando a empresa ainda não configurou nada.
const MARKETING_GROUPS = [
  ...MARKETING_CADENCE_GROUPS,
  ...MARKETING_RUNNER_GROUPS,
  ...MARKETING_AGENDAMENTO_GROUPS,
  ...MARKETING_PUBLICACOES_GROUPS,
  ...MARKETING_AUTOPUBLICACAO_GROUPS,
  ...MARKETING_CONSENT_GROUPS,
  ...MARKETING_TIPOS_CONTEUDO_GROUPS,
  ...MARKETING_FACTUAL_GROUPS,
  ...MARKETING_SEGMENTACAO_GROUPS,
  ...MARKETING_ATRIBUICAO_GROUPS,
  ...MARKETING_CUSTOS_GROUPS,
  ...MARKETING_CANAIS_GROUPS,
  ...MARKETING_SEO_BLOG_GROUPS,
  ...MARKETING_MENSAGENS_GROUPS,
  ...MARKETING_KILLSWITCH_GROUPS,
  ...MARKETING_AUTOMACOES_PRONTAS_GROUPS,
  {
    title: "Mensagem em massa",
    subtitle: "Limites de destinatários por disparo. Acima do primeiro limite, só quem tem a permissão de envio em massa dispara; acima do teto absoluto, o disparo é sempre recusado.",
    fields: [
      {
        key: "marketing.mass.max_recipients_sem_aprovacao",
        label: "Destinatários permitidos sem a permissão de envio em massa",
        type: "integer",
        defaultValue: 50,
        helper: "Número inteiro de 1 a 100000.",
      },
      {
        key: "marketing.mass.max_recipients_absoluto",
        label: "Teto absoluto de destinatários por disparo",
        type: "integer",
        defaultValue: 5000,
        helper: "Número inteiro de 1 a 1000000. Nem quem tem permissão ultrapassa este valor.",
      },
    ],
  },
  {
    title: "Perfis padrão de Marketing",
    subtitle: "Nomes dos perfis (separados por vírgula) que recebem cada pacote de permissões de Marketing. O Assistente cria e edita rascunhos; o Gerente também aprova, publica e gere campanhas e automações; a Diretoria também liga e desliga o kill switch. Só o administrador recebe todas as permissões.",
    fields: [
      { key: "marketing.permissoes.perfis_assistente", label: "Perfis de Assistente de Marketing", type: "text", defaultValue: "ASSISTENTE DE MARKETING", helper: "Ex.: ASSISTENTE DE MARKETING, ANALISTA DE MARKETING" },
      { key: "marketing.permissoes.perfis_gerente", label: "Perfis de Gerente de Marketing", type: "text", defaultValue: "GERENTE DE MARKETING", helper: "Ex.: GERENTE DE MARKETING" },
      { key: "marketing.permissoes.perfis_diretoria", label: "Perfis da Diretoria", type: "text", defaultValue: "DIRETORIA", helper: "Ex.: DIRETORIA, SOCIO" },
    ],
  },
  {
    title: "Campos publicáveis em conteúdo público",
    subtitle: "Só os campos desta lista saem em posts, site, portais e e-mails; endereço, ocorrência interna, documentos e dados do proprietário nunca saem. Remover um campo é sempre permitido; incluir um campo exige a permissão de gerir templates de Marketing. Toda mudança fica na auditoria.",
    fields: [
      {
        key: "marketing.public_fields.allowlist",
        label: "Campos publicáveis",
        type: "text",
        defaultValue: "publicId, tipo, finalidade, bairro, cidade, uf, quartos, suites, banheiros, vagas, areaUtilM2, areaTotalM2, precoVenda, precoLocacao, precoAnterior, condominio, iptu, features, fotosAutorizadas, logradouro, numeroEndereco, publicadoEm, enderecoPublico, nomeEmpreendimento, etapaPublica, titulo, texto, legenda, descricao, assunto, corpo",
        helper: "Nomes separados por vírgula. Nomes fora desta lista de campos conhecidos são recusados. Rua e número só saem se a política de endereço do imóvel permitir.",
      },
      {
        key: "marketing.public_fields.features_permitidas",
        label: "Características do imóvel permitidas",
        type: "text",
        defaultValue: "piscina, churrasqueira, varanda, elevador, academia, playground, salão de festas, portaria 24h, ar-condicionado, mobiliado, aceita pets, vaga coberta",
        helper: "Só estas características podem aparecer em conteúdo público.",
      },
    ],
  },
  {
    title: "Conteúdo e mudança na fonte",
    subtitle: "Quando uma informação do imóvel muda depois da publicação, o post publicado nunca é reescrito: o sistema cria uma atualização em rascunho, ligada ao conteúdo anterior. Conteúdo ainda não publicado com dado velho volta sempre para revisão, com ou sem esta opção.",
    fields: [
      {
        key: "marketing.conteudo.atualizacao_automatica_fonte",
        label: "Criar a atualização automaticamente quando o imóvel mudar",
        type: "boolean",
        defaultValue: true,
      },
    ],
  },
  {
    title: "Templates de Marketing",
    subtitle: "Template é o molde (texto, cores, logo) do conteúdo. Alguns canais só aceitam template aprovado pelo provedor: nesses, o template só pode ser publicado com a referência oficial informada.",
    fields: [
      {
        key: "marketing.templates.canais_com_template_oficial",
        label: "Canais que exigem template oficial aprovado",
        type: "text",
        defaultValue: "WHATSAPP",
        helper: "Canais separados por vírgula (WHATSAPP, EMAIL, SITE, INSTAGRAM, FACEBOOK, LINKEDIN, YOUTUBE, TIKTOK, PORTAL). Pelo menos um canal.",
      },
    ],
  },
  {
    title: "Templates de Marketing",
    subtitle: "Template é o molde (texto, cores, logo) do conteúdo. Alguns canais só aceitam template aprovado pelo provedor: nesses, o template só pode ser publicado com a referência oficial informada.",
    fields: [
      {
        key: "marketing.templates.canais_com_template_oficial",
        label: "Canais que exigem template oficial aprovado",
        type: "text",
        defaultValue: "WHATSAPP",
        helper: "Canais separados por vírgula (WHATSAPP, EMAIL, SITE, INSTAGRAM, FACEBOOK, LINKEDIN, YOUTUBE, TIKTOK, PORTAL). Pelo menos um canal.",
      },
    ],
  },
  {
    title: "Campanhas de Marketing",
    subtitle: "O sistema inicia e encerra as campanhas sozinho, no horário agendado, e dispara os steps na data prevista. Quando o público é grande, cada rodada (a cada minuto) processa só uma parte dos destinatários de cada step; o restante sai nas rodadas seguintes.",
    fields: [
      {
        key: "marketing.campanhas.lote_destinatarios",
        label: "Destinatários processados por step a cada rodada",
        type: "integer",
        defaultValue: 200,
        helper: "Número inteiro de 1 a 10000.",
      },
];

const ALL_FIELDS = MARKETING_GROUPS.flatMap((group) => group.fields);

function initialValues() {
  const values = {};
  ALL_FIELDS.forEach((field) => {
    values[field.key] = field.type === "integer" ? String(field.defaultValue) : field.defaultValue;
  });
  return values;
}

export default function MarketingTab() {
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
    listSettings("marketing.")
      .then((data) => {
        if (cancelled) return;
        const list = Array.isArray(data) ? data : Object.values(data || {});
        const next = initialValues();
        list.forEach((item) => {
          if (item && item.key && Object.prototype.hasOwnProperty.call(next, item.key)) {
            const field = ALL_FIELDS.find((f) => f.key === item.key);
            next[item.key] = field && field.type === "integer" ? String(item.value) : item.value;
          }
        });
        setValues(next);
        setOriginal(next);
      })
      .catch((err) => {
        if (cancelled) return;
        if (err?.status === 403) setForbidden(true);
        else setError(err?.message || "Não foi possível carregar as configurações de Marketing.");
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
        const value = values[field.key];
        if (field.type === "integer") {
          const numeric = toNumber(value);
          const minimum = field.min ?? 1;
          if (Number.isNaN(numeric) || !Number.isInteger(numeric) || numeric < minimum) {
            throw new Error(minimum === 0 ? `Informe um número inteiro igual ou maior que zero em "${field.label}".` : `Informe um número inteiro maior que zero em "${field.label}".`);
          }
          await updateSetting(field.key, numeric);
        } else if (field.type === "boolean") {
          await updateSetting(field.key, Boolean(value));
        } else {
          if (typeof value !== "string" || value.trim() === "") continue; // vazio não é aceito pela API
          await updateSetting(field.key, value);
        }
      }
      setOriginal(values);
      setSuccess("Configurações de Marketing salvas.");
    } catch (err) {
      // MKT_FORBIDDEN (incluir campo publicável sem a permissão de templates) é aviso da ação, não falta de acesso à aba.
      if (err?.status === 403 && err?.code !== "MKT_FORBIDDEN") setForbidden(true);
      else setError(err?.message || "Não foi possível salvar as configurações de Marketing.");
    } finally {
      setSaving(false);
    }
  }

  if (forbidden) {
    return (
      <Card title="Marketing">
        <Alert tone="warning" title="Sem permissão">
          Você não tem permissão para visualizar ou alterar as configurações de Marketing.
        </Alert>
      </Card>
    );
  }

  return (
    <Card
      title="Marketing"
      subtitle="Regras de Marketing desta empresa: limites de mensagem em massa e perfis padrão de permissão."
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

          {MARKETING_GROUPS.map((group) => (
            <div key={group.title} className="formGridFull">
              <h3>{group.title}</h3>
              <p>{group.subtitle}</p>
              <div className={styles.formGrid}>
                {group.fields.map((field) => (field.type === "boolean" ? (
                  <Checkbox
                    key={field.key}
                    id={`mkt-${field.key}`}
                    label={field.label}
                    checked={Boolean(values[field.key])}
                    onChange={(e) => handleChange(field.key, e.target.checked)}
                  />
                ) : (
                  <FormField key={field.key} label={field.label} htmlFor={`mkt-${field.key}`} helper={field.helper}>
                    <Input
                      id={`mkt-${field.key}`}
                      inputMode={field.type === "integer" ? "numeric" : undefined}
                      value={values[field.key] ?? ""}
                      onChange={(e) => handleChange(field.key, e.target.value)}
                    />
                  </FormField>
                )))}
              </div>
            </div>
          ))}
        </div>
      )}
    </Card>
  );
}
