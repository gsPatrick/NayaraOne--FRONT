"use client";

import { useEffect, useState } from "react";
import Card from "@/components/molecules/Card/Card";
import Checkbox from "@/components/atoms/Checkbox/Checkbox";
import Input from "@/components/atoms/Input/Input";
import FormField from "@/components/molecules/FormField/FormField";
import Button from "@/components/atoms/Button/Button";
import Alert from "@/components/molecules/Alert/Alert";
import Spinner from "@/components/atoms/Spinner/Spinner";
import { listSettings, updateSetting } from "@/lib/api/settings";
import { toNumber } from "@/lib/format";
import styles from "./page.module.css";
import { IA_SEGURANCA_GROUPS } from "./iaSegurancaGroups";

// Parâmetros da NAY (Marco 9, bloco A) que o administrador controla. A API valida (SETTINGS_SCHEMA); o padrão mostrado é
// o de Maturacao/demandas/parametros.csv e só vale enquanto a empresa não configurou nada. Cada demanda do bloco acrescenta
// as suas entradas em IA_GROUPS.
const IA_GROUPS = [
  ...IA_SEGURANCA_GROUPS,
  {
    title: "Chave geral da NAY",
    subtitle: "Liga ou desliga a NAY inteira nesta empresa. Desligada, toda função da NAY responde que está desativada. Só quem administra a NAY altera.",
    fields: [
      {
        key: "ia.habilitada",
        label: "NAY habilitada nesta empresa",
        type: "boolean",
        defaultValue: false,
        helper: "Desligada por padrão: a NAY está em fase de laboratório e só roda onde o administrador a liga.",
      },
      {
        key: "ai.agents.enabled",
        label: "Agentes habilitados",
        type: "text",
        defaultValue: "*",
        helper: "Use * para todos os agentes ou liste os códigos separados por vírgula. Agente fora da lista responde que está desativado.",
      },
    ],
  },
  {
    title: "Agentes: limites por consulta",
    subtitle: "Valem para a versão do agente que não define o próprio limite. O limite escrito na versão do agente vence o valor daqui.",
    fields: [
      {
        key: "ia.agente.max_tool_calls_por_run",
        label: "Máximo de ferramentas por consulta",
        type: "integer",
        min: 1,
        max: 50,
        defaultValue: 5,
        helper: "Número inteiro de 1 a 50. Passando disso, a consulta é encerrada com o aviso de limite de ferramentas.",
      },
      {
        key: "ia.agente.max_tokens_run",
        label: "Máximo de processamento por consulta (tokens)",
        type: "integer",
        min: 100,
        max: 1000000,
        defaultValue: 8000,
        helper: "Número inteiro de 100 a 1000000, somando entrada e saída. Passando disso, a consulta falha com o aviso de limite de processamento.",
      },
      {
        key: "ia.agente.max_runs_por_minuto_usuario",
        label: "Máximo de consultas por minuto, por pessoa",
        type: "integer",
        min: 1,
        max: 600,
        defaultValue: 10,
        helper: "Número inteiro de 1 a 600. Passando disso, a pessoa precisa esperar um instante.",
      },
      {
        key: "ia.agente.timeout_ms",
        label: "Tempo máximo de cada chamada ao agente (milissegundos)",
        type: "integer",
        min: 1000,
        max: 300000,
        defaultValue: 30000,
        helper: "Número inteiro de 1000 a 300000.",
      },
    ],
  },
  {
    title: "Agentes: homologação e ativação",
    subtitle: "Regras para uma nova versão de agente entrar em uso. A decisão final continua sendo de uma pessoa.",
    fields: [
      {
        key: "ia.agente.avaliacao_verde_obrigatoria",
        label: "Exigir avaliação aprovada antes de homologar a versão",
        type: "boolean",
        defaultValue: true,
        helper: "Ligado por padrão. Desligado, a pessoa autorizada pode homologar sem avaliação aprovada.",
      },
      {
        key: "ia.agente.segregacao_funcoes",
        label: "Separar quem cria, quem homologa e quem ativa a versão",
        type: "boolean",
        defaultValue: true,
        helper: "Ligado por padrão: quem criou não homologa, e quem homologou não ativa. Desligado, a mesma pessoa pode fazer os passos.",
      },
    ],
  },
  {
    title: "Fontes da resposta",
    subtitle: "Cada execução da NAY guarda as fontes que usou. O trecho guardado é sempre curto e sem credenciais, nunca o documento inteiro.",
    fields: [
      {
        key: "ia.fonte.excerpt_max_caracteres",
        label: "Tamanho máximo do trecho guardado por fonte (caracteres)",
        type: "integer",
        min: 50,
        max: 2000,
        defaultValue: 500,
        helper: "Número inteiro de 50 a 2000. Trechos maiores são cortados antes de gravar.",
      },
    ],
  },
  {
    title: "Ferramentas da NAY: limites dos argumentos",
    subtitle: "Cada pedido da NAY a uma ferramenta é conferido pelo servidor. Estes limites valem para o campo que a ferramenta não limita por conta própria; pedido fora do limite é recusado inteiro.",
    fields: [
      {
        key: "ia.tool.string_max_caracteres",
        label: "Tamanho máximo de cada texto enviado a uma ferramenta (caracteres)",
        type: "integer",
        min: 1,
        max: 100000,
        defaultValue: 500,
        helper: "Número inteiro de 1 a 100000. Texto maior que isso faz o pedido ser recusado.",
      },
      {
        key: "ia.tool.array_max_itens",
        label: "Máximo de itens de cada lista enviada a uma ferramenta",
        type: "integer",
        min: 1,
        max: 1000,
        defaultValue: 50,
        helper: "Número inteiro de 1 a 1000. Lista maior que isso faz o pedido ser recusado.",
      },
    ],
  },
  {
    title: "Recomendações da NAY",
    subtitle: "A NAY sugere, e sempre uma pessoa decide. A recomendação fica registrada com o motivo de quem aceitou ou rejeitou e, depois, com o resultado.",
    fields: [
      {
        key: "ia.recomendacao.motivo_rejeicao_obrigatorio",
        label: "Exigir motivo ao rejeitar uma recomendação",
        type: "boolean",
        defaultValue: true,
        helper: "Ligado por padrão. Desligado, a pessoa pode rejeitar sem escrever o motivo.",
      },
      {
        key: "ia.aprovacao.aprovador_distinto",
        label: "Quem pediu a consulta à NAY não decide a recomendação de risco alto ou crítico dela",
        type: "boolean",
        defaultValue: true,
        helper: "Ligado por padrão: outra pessoa precisa decidir. Desligado, a mesma pessoa pode pedir e decidir.",
      },
      {
        key: "ia.recomendacao.justificativa_max_caracteres",
        label: "Tamanho máximo da justificativa da recomendação (caracteres)",
        type: "integer",
        min: 100,
        max: 4000,
        defaultValue: 1000,
        helper: "Número inteiro de 100 a 4000. Justificativas maiores são cortadas antes de gravar.",
      },
      {
        key: "ia.recomendacao.lista_max_itens",
        label: "Máximo de recomendações por listagem",
        type: "integer",
        min: 1,
        max: 500,
        defaultValue: 100,
        helper: "Número inteiro de 1 a 500.",
      },
    ],
  },
  {
    title: "Retenção e auditoria da NAY",
    subtitle: "A NAY guarda só um resumo redigido do que recebeu e respondeu, nunca o texto completo. Vencido o prazo, o conteúdo é apagado e ficam só os dados de controle (datas, custo, situação). Quanto mais sensível o dado, menor o prazo; se o contrato com o fornecedor da IA exigir prazo menor, vale o menor.",
    fields: [
      {
        key: "ia.retencao.public_dias",
        label: "Prazo para execuções com dado público (dias)",
        type: "integer",
        min: 1,
        max: 3650,
        defaultValue: 365,
        helper: "Número inteiro de 1 a 3650. A execução vale pela fonte mais sensível que usou.",
      },
      {
        key: "ia.retencao.internal_dias",
        label: "Prazo para execuções com dado interno (dias)",
        type: "integer",
        min: 1,
        max: 3650,
        defaultValue: 365,
        helper: "Número inteiro de 1 a 3650. Vale também para a execução que não usou fonte alguma.",
      },
      {
        key: "ia.retencao.confidential_dias",
        label: "Prazo para execuções com dado confidencial (dias)",
        type: "integer",
        min: 1,
        max: 3650,
        defaultValue: 180,
        helper: "Número inteiro de 1 a 3650.",
      },
      {
        key: "ia.retencao.restricted_dias",
        label: "Prazo para execuções com dado restrito (dias)",
        type: "integer",
        min: 1,
        max: 3650,
        defaultValue: 30,
        helper: "Número inteiro de 1 a 3650.",
      },
      {
        key: "ia.retencao.intervalo_horas",
        label: "Intervalo entre os expurgos automáticos (horas)",
        type: "integer",
        min: 1,
        max: 168,
        defaultValue: 24,
        helper: "Número inteiro de 1 a 168. De quanto em quanto tempo o sistema apaga o conteúdo vencido.",
      },
      {
        key: "ia.auditoria.resumo_max_caracteres",
        label: "Tamanho máximo do resumo guardado por execução (caracteres)",
        type: "integer",
        min: 100,
        max: 2000,
        defaultValue: 2000,
        helper: "Número inteiro de 100 a 2000. Vale para o resumo do que a NAY recebeu e do que respondeu; textos maiores são cortados.",
      },
    ],
  },
  {
    title: "Privacidade dos dados enviados à NAY",
    subtitle: "Antes de qualquer texto sair para um provedor de IA, a NAY retira CPF, telefone, conta bancária e segredos. Conteúdo restrito só entra nas condições fixas do livro.",
    fields: [
      {
        key: "ia.privacidade.pseudonimizar_nomes",
        label: "Trocar nomes de pessoas por \"Cliente A\", \"Cliente B\" quando a tarefa não precisa do nome",
        type: "boolean",
        defaultValue: true,
        helper: "Ligado por padrão e vale para provedores externos. O nome volta a aparecer só na resposta mostrada à própria pessoa que perguntou.",
      },
    ],
  },
  {
    title: "Fundamentação das respostas",
    subtitle: "Toda resposta da NAY sobre dado da empresa cita fontes. Sem fonte suficiente, ela diz que não sabe em vez de inventar.",
    fields: [
      {
        key: "ia.grounding.relevancia_minima",
        label: "Relevância mínima para uma fonte valer como base",
        type: "decimal",
        min: 0,
        max: 1,
        defaultValue: 0.5,
        helper: "Número de 0 a 1 (use vírgula). Fonte menos relevante que isso não sustenta a resposta.",
      },
      {
        key: "ia.grounding.bloquear_sem_fonte",
        label: "Bloquear resposta factual sem fonte (em vez de responder que não há informação)",
        type: "boolean",
        defaultValue: false,
        helper: "Desligado por padrão: a NAY responde que não tem informações suficientes. Ligado, a resposta é bloqueada com aviso.",
      },
      {
        key: "ia.grounding.peso_relevancia",
        label: "Peso da relevância na confiança estimada",
        type: "decimal",
        min: 0,
        max: 1,
        defaultValue: 0.6,
        helper: "Número de 0 a 1. A confiança é só um sinal auxiliar: nunca libera ação nem dispensa a fonte.",
      },
      {
        key: "ia.grounding.tarefas_nao_factuais",
        label: "Tipos de tarefa que não afirmam dado da empresa",
        type: "text",
        defaultValue: "conversa,saudacao,formatacao,traducao",
        helper: "Códigos separados por vírgula. Respostas dessas tarefas, sem números, datas ou códigos, não exigem fonte.",
      },
      {
        key: "ia.grounding.termos_criticos",
        label: "Termos que marcam prazo ou contrato crítico",
        type: "text",
        defaultValue: "prazo legal,prazo contratual,vencimento do contrato,vencimento de contrato,contrato vence,vence o contrato,multa,rescisão,obrigação",
        helper: "Termos separados por vírgula. Resposta com algum deles exige fonte exata (contrato, versão, cláusula) e confirmação humana.",
      },
    ],
  },
  {
    title: "Memória da NAY",
    subtitle: "A NAY guarda só fatos estruturados. Guardar a conversa inteira é exceção e segue regras fixas.",
    fields: [
      {
        key: "ia.memoria.guardar_conversa_inteira",
        label: "Permitir guardar a conversa inteira como memória",
        type: "boolean",
        defaultValue: false,
        helper: "Desligado por padrão. Ligado, só vale para decisão ou resultado de recomendação, por administrador de IA, com validade curta, sem dado restrito.",
      },
    ],
  },
  {
    title: "Defesa contra instruções escondidas em documentos",
    subtitle: "Documentos, e-mails e mensagens lidos pela NAY são só texto para ler, nunca ordem. A NAY dá uma nota de 0 a 1 para cada trecho. Acima do limite de bloqueio o trecho é descartado e a resposta avisa; entre o de alerta e o de bloqueio o trecho é mantido, marcado como suspeito, e o fato é registrado.",
    fields: [
      {
        key: "ia.injecao.limiar_bloqueio",
        label: "Nota a partir da qual o trecho é descartado",
        type: "decimal",
        min: 0,
        max: 1,
        defaultValue: 0.7,
        helper: "Número de 0 a 1 (use vírgula). Quanto menor, mais trechos são descartados.",
      },
      {
        key: "ia.injecao.limiar_alerta",
        label: "Nota a partir da qual o trecho é marcado como suspeito",
        type: "decimal",
        min: 0,
        max: 1,
        defaultValue: 0.4,
        helper: "Número de 0 a 1. Se for maior que o limite de descarte, vale o limite de descarte.",
      },
      {
        key: "ia.injecao.derivado_min_caracteres",
        label: "Tamanho mínimo de um valor para contar como copiado de documento",
        type: "integer",
        min: 1,
        max: 100,
        defaultValue: 4,
        helper: "Número inteiro de 1 a 100. Valor copiado de um documento para um pedido que altera dados ou envia algo para fora vira proposta para aprovação humana, nunca execução direta.",
      },
    ],
  },
];

const ALL_FIELDS = IA_GROUPS.flatMap((group) => group.fields);

function initialValues() {
  const values = {};
  ALL_FIELDS.forEach((field) => {
    values[field.key] = field.type === "integer" ? String(field.defaultValue) : field.type === "decimal" ? String(field.defaultValue).replace(".", ",") : field.defaultValue;
  });
  return values;
}

export default function IaNayTab() {
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
    Promise.all([listSettings("ia."), listSettings("ai.")])
      .then((results) => {
        if (cancelled) return;
        const list = results.flatMap((data) => (Array.isArray(data) ? data : Object.values(data || {})));
        const next = initialValues();
        list.forEach((item) => {
          if (!item || !item.key || !Object.prototype.hasOwnProperty.call(next, item.key)) return;
          const field = ALL_FIELDS.find((f) => f.key === item.key);
          next[item.key] = field && field.type === "integer" ? String(item.value) : field && field.type === "decimal" ? String(item.value).replace(".", ",") : item.value;
        });
        setValues(next);
        setOriginal(next);
      })
      .catch((err) => {
        if (cancelled) return;
        if (err?.status === 403) setForbidden(true);
        else setError(err?.message || "Não foi possível carregar as configurações da NAY.");
      })
      .finally(() => {
        if (!cancelled) setLoading(false);
      });
    return () => {
      cancelled = true;
    };
  }, []);

  async function handleSave() {
    if (!original) return;
    setSaving(true);
    setError("");
    setSuccess("");
    try {
      const changed = ALL_FIELDS.filter((field) => values[field.key] !== original[field.key]);
      for (const field of changed) {
        if (field.type === "integer") {
          const numeric = toNumber(values[field.key]);
          if (Number.isNaN(numeric) || !Number.isInteger(numeric) || numeric < field.min || numeric > field.max) {
            throw new Error(`Informe um número inteiro de ${field.min} a ${field.max} em "${field.label}".`);
          }
          await updateSetting(field.key, numeric);
        } else if (field.type === "decimal") {
          const numeric = toNumber(values[field.key]);
          if (Number.isNaN(numeric) || numeric < field.min || numeric > field.max) {
            throw new Error(`Informe um número de ${String(field.min).replace(".", ",")} a ${String(field.max).replace(".", ",")} em "${field.label}".`);
          }
          await updateSetting(field.key, numeric);
        } else {
          await updateSetting(field.key, values[field.key]);
        }
      }
      setOriginal(values);
      setSuccess("Configurações da NAY salvas.");
    } catch (err) {
      if (err?.status === 403) setForbidden(true);
      else setError(err?.message || "Não foi possível salvar as configurações da NAY.");
    } finally {
      setSaving(false);
    }
  }

  if (forbidden) {
    return (
      <Card title="IA NAY">
        <Alert tone="warning" title="Sem permissão">
          Você não tem permissão para visualizar ou alterar as configurações da NAY.
        </Alert>
      </Card>
    );
  }

  return (
    <Card
      title="IA NAY"
      subtitle="Regras de segurança e de uso da inteligência da NAY nesta empresa."
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

          {IA_GROUPS.map((group) => (
            <div key={group.title} className="formGridFull">
              <h3>{group.title}</h3>
              <p>{group.subtitle}</p>
              <div className={styles.formGrid}>
                {group.fields.map((field) => (
                  <div key={field.key}>
                    {field.type === "text" || field.type === "integer" || field.type === "decimal" ? (
                      <FormField label={field.label} htmlFor={`ia-nay-${field.key}`} helper={field.helper}>
                        <Input
                          id={`ia-nay-${field.key}`}
                          inputMode={field.type === "integer" ? "numeric" : field.type === "decimal" ? "decimal" : undefined}
                          value={values[field.key] ?? ""}
                          onChange={(e) => setValues((prev) => ({ ...prev, [field.key]: e.target.value }))}
                        />
                      </FormField>
                    ) : (
                      <>
                        <Checkbox
                          id={`ia-nay-${field.key}`}
                          label={field.label}
                          checked={Boolean(values[field.key])}
                          onChange={(e) => setValues((prev) => ({ ...prev, [field.key]: e.target.checked }))}
                        />
                        {field.helper ? <p>{field.helper}</p> : null}
                      </>
                    )}
                  </div>
                ))}
              </div>
            </div>
          ))}
        </div>
      )}
    </Card>
  );
}
