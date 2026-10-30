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
  {
    title: "Defesa contra tentativa de alterar as regras da NAY",
    subtitle: "Antes de qualquer consulta, a NAY confere o pedido contra uma lista de frases-gatilho (ignorar regras, esquecer instruções, fingir ser o administrador, pedir dados de outra empresa, pedir senha ou chave). A conferência vale também para letras espaçadas, troca de letras por números, texto escondido em base64, espanhol e francês. Ajuste a lista da sua empresa aqui.",
    fields: [
      {
        key: "ia.injecao.frases_extra",
        label: "Frases extras que a NAY trata como tentativa de burlar as regras",
        type: "text",
        defaultValue: "",
        helper: "Separe as frases por ponto e vírgula. Uma frase sozinha bloqueia o pedido; use peso|frase (peso de 1 a 100) para dar um peso menor, por exemplo 40|abra o cofre agora. Frases com menos de 8 letras são ignoradas. Deixe vazio para usar só a lista do sistema.",
      },
      {
        key: "ia.injecao.frases_desativadas",
        label: "Grupos da lista do sistema que ficam desligados",
        type: "text",
        defaultValue: "",
        helper: "Códigos separados por vírgula: FRASE_IGNORAR_INSTRUCOES, FRASE_ESQUECER_CONTEXTO, FRASE_ROLEPLAY_PRIVILEGIO, FRASE_DADOS_OUTRA_EMPRESA, FRASE_PEDIR_SEGREDO, FRASE_REVELAR_PROMPT. Deixe vazio para manter todos ligados. Os padrões fixos do sistema continuam valendo.",
      },
    ],
  },
];
