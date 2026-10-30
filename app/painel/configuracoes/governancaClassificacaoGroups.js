// Registro de classificação de dados na aba Governança (Marco 9, M9-D910). Padrões de Maturacao/demandas/parametros.csv; a API valida.
export const GOVERNANCA_CLASSIFICACAO_GROUPS = [
  {
    title: "Classificação de dados: regra automática inicial",
    subtitle:
      "O registro classifica cada coluna do sistema (sensibilidade, finalidade, retenção, máscara, exportação, uso pela IA e dono). Na primeira classificação, o nome da coluna é dividido em palavras por _ e a regra casa a palavra inteira: rg casa rg_number e não casa merge_flag. As listas abaixo são as do livro; o steward ajusta cada coluna depois (PUT /data-classification). Coluna sem linha no registro vale a classe padrão da aba DLP, com máscara parcial.",
    fields: [
      { key: "governanca.dados.classificacao.palavras_restritas", label: "Palavras que tornam a coluna RESTRICTED", type: "text", defaultValue: "cpf, cnpj, rg, passport, bank, account, pix, password, secret, token, mfa", helper: "Separe por vírgula; só letras e números. Vale para colunas novas e para empresas ainda sem registro." },
      { key: "governanca.dados.classificacao.palavras_altas", label: "Palavras que tornam a coluna HIGH", type: "text", defaultValue: "email, phone, birth, address, salary, income, name", helper: "Separe por vírgula; \"name\" só vale para nome de pessoa." },
      { key: "governanca.dados.classificacao.pagina_tamanho", label: "Itens por página na consulta do registro de classificação", type: "integer", defaultValue: 50, min: 1, max: 200 },
    ],
  },
];
