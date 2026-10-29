// Ações do operador sobre as integrações (Marco 9, bloco B: M9-D250). Padrão = Maturacao/demandas/parametros.csv; a API valida a faixa.
// Entra na aba "Registro de integrações". O MFA para testar conexão em produção fica no grupo "Segurança das conexões".
export const ACOES_GROUPS = [
  {
    title: "Ações do operador: repetir erro, testar conexão e girar credencial",
    subtitle:
      "Repetir um erro (envio, evento de webhook ou fluxo de sincronização), testar a ligação com o fornecedor e girar a credencial são ações de quem opera as integrações. Operação perigosa, como um pagamento, sempre pede verificação MFA recente, o motivo e a confirmação de quem repete.",
    fields: [
      { key: "integration.admin.test_connection_timeout_ms", label: "Tempo máximo do teste de conexão (milissegundos)", type: "integer", defaultValue: 10000, helper: "De 1000 a 120000. Passado o tempo, o teste responde que não deu certo e explica o motivo; o padrão do livro é 10 segundos." },
      { key: "integration.retry.human_extra_attempts", label: "Tentativas a mais concedidas quando uma pessoa manda repetir um envio da fila morta ou um evento de webhook", type: "integer", defaultValue: 3, helper: "De 1 a 20. O padrão do livro é 3. O contador de tentativas já gastas não zera." },
      { key: "integration.admin.mfa_on_secret_rotation", label: "Exigir verificação MFA recente para girar a credencial de uma integração em qualquer ambiente", type: "boolean", defaultValue: true, helper: "Em produção a verificação continua exigida pela regra de mudar conexão em produção." },
    ],
  },
];
