// Parâmetros dos provedores de modelo da NAY (Marco 9, M9-D011). Padrão de Maturacao/demandas/parametros.csv; a API valida.
// A conta de cada fornecedor (referência do segredo, região, retenção, preços dos modelos) fica em Integrações; aqui só o que
// vale para a empresa toda.
export const IA_PROVEDORES_GROUPS = [
  {
    title: "Provedores de modelo da NAY",
    subtitle: "A NAY fala com qualquer fornecedor de modelo pela mesma tomada. O provedor de testes responde de forma previsível, sem rede e sem custo; o real só funciona com a conexão ativa e a credencial no cofre (aba Integrações).",
    fields: [
      {
        key: "ia.provedor.padrao",
        label: "Provedor usado quando ninguém escolhe outro",
        type: "text",
        defaultValue: "ai-sandbox",
        helper: "Código do provedor no catálogo de integrações (ai-sandbox, anthropic, openai...). Padrão: o provedor de testes, o mais seguro em custo.",
      },
      {
        key: "ia.provedor.modelo_padrao",
        label: "Modelo usado com o provedor padrão",
        type: "text",
        defaultValue: "auto",
        helper: "Código do modelo ou auto (o primeiro modelo de geração do provedor). Trocar o provedor ou o modelo padrão só é aceito depois que uma avaliação aprovada (golden e adversarial) existir para o novo par; a API recusa antes disso.",
      },
      {
        key: "ia.ambiente",
        label: "Ambiente da NAY",
        type: "text",
        defaultValue: "LAB",
        helper: "LAB ou PRODUCAO. Em PRODUCAO o provedor de testes é recusado para usuário final, sem exceção.",
      },
      {
        key: "ia.provedor.safety_tier_minimo_critico",
        label: "Nível mínimo de segurança do modelo para agente crítico",
        type: "integer",
        min: 1,
        max: 3,
        defaultValue: 2,
        helper: "Número inteiro de 1 a 3. Agente crítico só usa modelo com nível de segurança igual ou maior que este.",
      },
    ],
  },
];
