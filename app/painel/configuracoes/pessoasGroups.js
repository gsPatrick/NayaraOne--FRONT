// Parâmetros de Pessoas em Configurações > Pessoas. Padrões de Maturacao/demandas/parametros.csv; a API valida cada valor (422/400
// "Valor inválido") e audita a alteração. O livro fixa as regras; aqui ficam só os pontos que ele deixa para a empresa decidir.
export const PESSOAS_VINCULO_FIELDS = [
  {
    key: "people.vinculo.tentativas_max",
    label: "Tentativas sem conferência por pessoa usuária (vínculo de pessoa do grupo)",
    type: "integer",
    defaultValue: 10,
    min: 1,
    max: 1000,
    helper: "Conta os vínculos em que o CPF/CNPJ e o nome não conferiram e os cadastros recusados porque o CPF/CNPJ ou o contato já existe em outra empresa do grupo. Passado o limite, a pessoa usuária espera a janela para tentar de novo.",
  },
  {
    key: "people.vinculo.janela_minutos",
    label: "Janela da contagem de tentativas (minutos)",
    type: "integer",
    defaultValue: 60,
    min: 1,
    max: 1440,
    helper: "Período em que as tentativas sem conferência são somadas.",
  },
];

export const PESSOAS_GROUPS = [
  {
    title: "Pessoas do grupo",
    subtitle: "Quem tem a permissão de vincular pessoas traz para esta empresa um cadastro que outra empresa do grupo já fez, informando o CPF/CNPJ e o nome. Estes números limitam as tentativas que não conferem.",
    fields: PESSOAS_VINCULO_FIELDS,
  },
  {
    title: "Papéis da pessoa",
    subtitle: "A mesma pessoa pode ter vários papéis ao mesmo tempo. Cliente, proprietário, vendedor, locatário e fornecedor (os do livro) ficam sempre no catálogo; os demais esta empresa acrescenta ou retira. Retirar um papel não apaga o papel de quem já o tem.",
    fields: [
      {
        key: "people.papeis",
        label: "Catálogo de papéis",
        type: "text",
        defaultValue: "CLIENTE=Cliente, PROPRIETARIO=Proprietário, VENDEDOR=Vendedor, LOCATARIO=Locatário, FORNECEDOR=Fornecedor, CORRETOR=Corretor, COMPRADOR=Comprador, FIADOR=Fiador, COLABORADOR=Colaborador, LOCADOR=Locador",
        helper: "Itens CODIGO=Rótulo separados por vírgula. Código só com letras maiúsculas, números e _ (até 40). Rótulo de 1 a 60 caracteres.",
      },
    ],
  },
  {
    title: "Cadastro repetido (deduplicação)",
    subtitle: "Antes de criar, o sistema procura o mesmo CPF/CNPJ (bloqueia e mostra o cadastro existente), o mesmo telefone ou e-mail (só cria com a permissão de exceção e um motivo, que vai para a auditoria) e nome parecido com a mesma data de nascimento ou endereço (só cria depois de confirmar a revisão). Os pares vão para a fila de revisão.",
    fields: [
      { key: "people.deduplicacao.ddi_padrao", label: "Código do país padrão dos telefones", type: "text", defaultValue: "55", helper: "De 1 a 3 dígitos. Telefone digitado sem o código do país recebe este código na comparação (ex.: (11) 98888-7777 e +55 11 98888-7777 são o mesmo número)." },
      { key: "people.deduplicacao.motivo_minimo", label: "Tamanho mínimo do motivo da exceção (caracteres)", type: "integer", defaultValue: 10, min: 5, max: 500, helper: "Motivo exigido para criar o cadastro mesmo com o telefone ou e-mail de outro." },
      { key: "people.deduplicacao.contato_no_grupo", label: "Procurar o telefone e o e-mail também nas outras empresas do grupo", type: "boolean", defaultValue: true, helper: "A resposta diz só que o contato existe no grupo, sem dizer de quem, e conta como tentativa no limite acima." },
    ],
  },
  {
    title: "Cadastro por documento",
    subtitle: "O documento enviado passa por antivírus, guarda o código do arquivo (hash), é classificado (tipo informado, nome do arquivo e conteúdo), lido e só então traz dados sugeridos, que uma pessoa confirma. Ilegível, baixa confiança, campo crítico faltando ou tipo que não confere abrem pendência de revisão.",
    fields: [
      { key: "people.documentos.confianca_minima", label: "Confiança mínima da leitura", type: "decimal", defaultValue: 0.7, min: 0, max: 1, maxDecimals: 2, helper: "De 0 a 1 (0,7 = 70%). Abaixo dela a leitura abre pendência de revisão." },
      { key: "people.documentos.campos_criticos", label: "Campos críticos por tipo de documento", type: "text", defaultValue: "RG=name; CIN=name; CNH=name+issuedAt+expiresAt; IR=name+taxId+income; HOLERITE=name+income; BANK_STATEMENT=name+accountNumber; CPF=name+taxId; RG_CPF=name+taxId; CNPJ=taxId", helper: "TIPO=campo+campo; separados por ponto e vírgula. Campos: name (nome), taxId (CPF/CNPJ), income (renda), accountNumber (conta), issuedAt (emissão), expiresAt (validade)." },
      { key: "people.documentos.classificacao", label: "Expressões que identificam cada tipo de documento", type: "text", defaultValue: "CIN=carteira de identidade nacional; RG=registro geral|carteira de identidade|secretaria de seguranca publica; CNH=carteira nacional de habilitacao|permissao para dirigir; CPF=comprovante de inscricao no cpf|cadastro de pessoas fisicas; CNPJ=cadastro nacional da pessoa juridica|comprovante de inscricao e de situacao cadastral; IR=declaracao de ajuste anual|imposto sobre a renda da pessoa fisica; HOLERITE=holerite|contracheque|demonstrativo de pagamento|recibo de pagamento de salario; BANK_STATEMENT=extrato de conta|extrato bancario|saldo anterior", helper: "TIPO=expressão|expressão; separados por ponto e vírgula, sem acento. No empate vale o tipo listado primeiro." },
      { key: "people.documentos.motores_laboratorio", label: "Permitir os motores de laboratório (só para teste)", type: "boolean", defaultValue: false, helper: "Desligado (recomendado): sem o antivírus do servidor nenhum documento é aceito, e sem a leitura do servidor o documento entra sem dado lido e com pendência. Ligar só em ambiente de teste." },
    ],
  },
];

export const PESSOAS_FIELDS = PESSOAS_GROUPS.flatMap((group) => group.fields);
