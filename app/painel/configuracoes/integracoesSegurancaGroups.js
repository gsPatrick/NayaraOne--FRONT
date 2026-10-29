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
];
