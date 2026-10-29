// Parâmetros de segurança das integrações (Marco 9, bloco B: M9-D248, M9-D244 e M9-D245). Padrão de Maturacao/demandas/parametros.csv; a API valida.
export const INTEGRACOES_SEGURANCA_GROUPS = [
  {
    title: "Dependências e SDKs de fornecedor",
    subtitle: "A auditoria diária das dependências abre um erro de integração e avisa quem gerencia integrações quando surge vulnerabilidade grave. SDK de fornecedor só entra com versão exata.",
    fields: [
      { key: "integration.sdk.pin_exact", label: "Exigir versão exata (sem ^, ~ ou latest) nos SDKs de fornecedor", type: "boolean", defaultValue: true },
      { key: "integration.sdk.denylist", label: "Pacotes tratados como SDK de fornecedor", type: "text", defaultValue: "twilio,@sendgrid/mail,aws-sdk,@aws-sdk/*,googleapis,stripe", helper: "Nomes de pacote separados por vírgula; use /* no fim para uma família inteira. Esses pacotes só podem ser usados dentro do adaptador do fornecedor." },
      { key: "integration.sdk.audit_exception_max_days", label: "Validade máxima de uma exceção da auditoria (dias)", type: "integer", defaultValue: 30, helper: "De 1 a 30. Passado o prazo, o aviso volta a bloquear a entrega." },
      { key: "integration.sdk.audit_hour", label: "Hora da auditoria diária das dependências (horário de São Paulo)", type: "integer", defaultValue: 3, helper: "De 0 a 23. A auditoria roda uma vez por dia, a partir dessa hora." },
    ],
  },
  {
    title: "Saída para fornecedores e retenção",
    subtitle: "Toda chamada a fornecedor usa conexão segura (HTTPS, TLS 1.2 ou mais) e só pode ir para os endereços que o fornecedor declara. O expurgo dos registros vencidos roda uma vez por dia e é feito por uma única função do banco.",
    fields: [
      {
        key: "integration.egress.mode",
        label: "Endereço fora da lista permitida",
        type: "enum",
        defaultValue: "enforce",
        options: [
          { value: "enforce", label: "Bloquear a chamada e registrar o erro (produção e homologação)" },
          { value: "log", label: "Só registrar no log e deixar a chamada seguir (sandbox e desenvolvimento)" },
        ],
        helper: "Sem escolha aqui, o sistema bloqueia em produção e homologação e só registra em sandbox. Os endereços permitidos são os que o adaptador do fornecedor declara e os informados na política da conexão.",
      },
      { key: "integration.retention.job_hour", label: "Hora do expurgo diário dos registros vencidos (horário de São Paulo)", type: "integer", defaultValue: 2, helper: "De 0 a 23. Os prazos de cada tabela ficam nos grupos de erros, caixa de entrada, envios e saúde." },
    ],
  },
];
