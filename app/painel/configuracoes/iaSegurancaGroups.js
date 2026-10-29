// Parâmetros de segurança das chamadas de ferramenta da NAY (Marco 9, M9-D017). Padrão de Maturacao/demandas/parametros.csv; a API valida.
export const IA_SEGURANCA_GROUPS = [
  {
    title: "Segurança das ferramentas da NAY",
    subtitle: "Cada chamada de ferramenta da NAY confere a permissão de quem pediu, a empresa do dado e se o pedido é de senha ou credencial. Tentativa bloqueada fica na auditoria.",
    fields: [
      {
        key: "ia.seguranca.trecho_auditoria_max_caracteres",
        label: "Tamanho do trecho do pedido guardado na auditoria de tentativa bloqueada (caracteres)",
        type: "integer",
        min: 20,
        max: 1000,
        defaultValue: 200,
        helper: "Número inteiro de 20 a 1000. O trecho é sempre redigido (dados pessoais e credenciais viram máscara) e nunca é o pedido inteiro.",
      },
      {
        key: "ia.seguranca.termos_segredo_extra",
        label: "Termos extras que a NAY trata como pedido de segredo",
        type: "text",
        defaultValue: "",
        helper: "Lista separada por vírgula, além dos termos fixos do sistema (senha, token, api key, secret, .env, connection string, credencial e chave de API). Deixe vazio para usar só os fixos.",
      },
    ],
  },
];
