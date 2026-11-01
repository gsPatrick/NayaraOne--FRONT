// Escolha entre conexões ativas do mesmo domínio (Marco 9, M9-D200). Entra na aba "Registro de integrações".
export const ESCOLHA_GROUPS = [
  {
    title: "Escolha da conexão",
    subtitle: "O que fazer quando mais de uma conexão ativa atende o mesmo domínio (por exemplo, dois fornecedores de WhatsApp).",
    fields: [
      {
        key: "integration.registry.domain_resolution",
        label: "Regra de escolha",
        helper: "Vale quando duas conexões ativas atendem o mesmo domínio. Na dúvida, mantenha “Recusar”: ninguém usa o fornecedor errado sem perceber.",
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
];
