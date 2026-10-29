// Parâmetros da NAY Documental (Marco 9, M9-D040). Padrão de Maturacao/demandas/parametros.csv; a API valida.
export const IA_DOCUMENTAL_GROUPS = [
  {
    title: "NAY Documental",
    subtitle: "A NAY Documental lê documentos da empresa (OCR), sugere a classificação, extrai campos e checa a consistência. Tudo é sugestão para uma pessoa revisar: ela não grava no cadastro, não aprova documento e não guarda o texto completo.",
    fields: [
      {
        key: "ia.documental.termos_escopo",
        label: "Termos do assunto da NAY Documental",
        type: "text",
        defaultValue: "documento,arquivo,ocr,transcricao,transcrever,transcreva,classificar,classifique,classificacao,extrair,extraia,extracao,campo,campos,nota,valor total,checar,cheque,confira,checagem,consistencia,divergencia,leia,sugira,nota fiscal,rg,cpf,cnpj,cnh,comprovante,contrato,matricula,holerite,extrato,certidao,iptu,escaneado,digitalizado,imagem,pdf,foto",
        helper: "Pedido sem nenhum destes termos é recusado com \"Isso foge do que este assistente pode fazer.\". Lista separada por vírgula, sem acento e sem diferenciar maiúsculas; a NAY procura cada termo dentro do pedido."
      },
      {
        key: "ia.documental.proibicao.gravar_no_cadastro",
        label: "Pedidos para gravar classificação ou campos no cadastro",
        type: "text",
        defaultValue: "grave no cadastro,gravar no cadastro,salve no cadastro,salvar no cadastro,grave os campos,gravar os campos,salve os campos,salvar os campos,preencha o cadastro,preencher o cadastro,atualize o cadastro,atualizar o cadastro,cadastre os dados,cadastrar os dados,registre no cadastro,registrar no cadastro,sobrescreva o cadastro,sobrescrever o cadastro,grave a classificacao,gravar a classificacao,salve a classificacao,salvar a classificacao",
        helper: "A NAY Documental só sugere; uma pessoa confirma antes de salvar. Pedido com algum destes termos é recusado. Lista separada por vírgula, sem acento e sem diferenciar maiúsculas; a NAY procura cada termo dentro do pedido."
      },
      {
        key: "ia.documental.proibicao.aprovar_documento",
        label: "Pedidos para aprovar ou validar documento",
        type: "text",
        defaultValue: "aprove o documento,aprovar o documento,aprovar documento,valide o documento,validar o documento,marque como verificado,marcar como verificado,marque o documento como,marcar o documento como,confirme o documento,confirmar o documento,aceite o documento,aceitar o documento,de o ok no documento,libere o documento,liberar o documento",
        helper: "A decisão sobre o documento é sempre de uma pessoa. Pedido com algum destes termos é recusado. Lista separada por vírgula, sem acento e sem diferenciar maiúsculas; a NAY procura cada termo dentro do pedido."
      },
      {
        key: "ia.documental.proibicao.arquivo_nao_verificado",
        label: "Pedidos para ler arquivo não verificado ou de outra empresa",
        type: "text",
        defaultValue: "sem antivirus,ignore o antivirus,ignorar o antivirus,ignorando o antivirus,desconsidere o antivirus,sem passar pelo antivirus,sem checar o antivirus,pule o antivirus,pular o antivirus,sem verificar o antivirus,arquivo nao verificado,arquivo sem verificacao,nao verificado pelo antivirus,de outra empresa,da outra empresa,arquivo da empresa b,outro cliente",
        helper: "A NAY só lê arquivos da empresa já verificados pelo antivírus (isso também é conferido pelo sistema, sem depender destes termos). Lista separada por vírgula, sem acento e sem diferenciar maiúsculas; a NAY procura cada termo dentro do pedido."
      },
      {
        key: "ia.documental.proibicao.reter_texto_integral",
        label: "Pedidos para guardar o texto completo do documento",
        type: "text",
        defaultValue: "guarde o texto completo,guardar o texto completo,salve o texto completo,salvar o texto completo,armazene o texto completo,armazenar o texto completo,guarde a transcricao,guardar a transcricao,salve a transcricao,salvar a transcricao,armazene a transcricao,armazenar a transcricao,copie o documento inteiro,copiar o documento inteiro",
        helper: "O texto completo só pode ficar no índice autorizado de conhecimento. Pedido com algum destes termos é recusado. Lista separada por vírgula, sem acento e sem diferenciar maiúsculas; a NAY procura cada termo dentro do pedido."
      },
      {
        key: "ia.documental.termos_resposta_proibida",
        label: "Trechos que a NAY não pode dizer na resposta",
        type: "text",
        defaultValue: "documento aprovado,documento foi aprovado,aprovei o documento,gravei no cadastro,gravei os campos,salvei no cadastro,salvei os campos,cadastro atualizado,cadastro foi atualizado,campos gravados,dados gravados no cadastro,classificacao gravada,documento validado por mim,marquei como verificado,guardei o texto",
        helper: "Se a resposta gerada afirmar que gravou, aprovou ou guardou algo, ela é trocada por uma explicação do que a NAY faz. Lista separada por vírgula, sem acento e sem diferenciar maiúsculas; a NAY procura cada termo dentro do pedido."
      },
      {
        key: "ia.documental.tipos_documento",
        label: "Tipos de documento e os termos que os identificam",
        type: "text",
        defaultValue: "RG=registro geral,carteira de identidade,rg;CPF=cadastro de pessoas fisicas,cpf;CNH=carteira nacional de habilitacao,cnh;COMPROVANTE_RESIDENCIA=comprovante de residencia,conta de luz,conta de agua,fatura de energia;COMPROVANTE_RENDA=comprovante de renda,holerite,contracheque,declaracao de imposto de renda;MATRICULA_IMOVEL=matricula do imovel,registro de imoveis,cartorio de registro;IPTU=iptu,imposto predial;EXTRATO_BANCARIO=extrato bancario,saldo anterior,agencia e conta;CERTIDAO_ESTADO_CIVIL=certidao de casamento,certidao de nascimento,estado civil;INVOICE_NF=nota fiscal,nf-e,danfe,valor total da nota",
        helper: "Formato: TIPO=termo,termo;OUTRO=termo. A NAY sugere o tipo cujos termos mais aparecem no texto do documento."
      },
      {
        key: "ia.documental.campos_obrigatorios",
        label: "Campos obrigatórios por tipo de documento",
        type: "text",
        defaultValue: "RG=name;CPF=name,taxId;CNH=name,issuedAt,expiresAt;COMPROVANTE_RENDA=name,income;EXTRATO_BANCARIO=name,accountNumber;INVOICE_NF=valor_total;CNPJ=taxId",
        helper: "Formato: TIPO=campo,campo;OUTRO=campo. A checagem aponta o campo obrigatório que não foi lido."
      },
      {
        key: "ia.documental.confianca_minima",
        label: "Confiança mínima da leitura do documento",
        type: "decimal",
        min: 0,
        max: 1,
        defaultValue: 0.7,
        helper: "Número de 0 a 1 (use vírgula). Leitura abaixo disso fica marcada para conferência atenta; é sempre só sugestão."
      },
      {
        key: "ia.documental.max_caracteres_transcricao",
        label: "Máximo de caracteres do texto devolvido pela transcrição",
        type: "integer",
        min: 200,
        max: 50000,
        defaultValue: 4000,
        helper: "Número inteiro. O texto acima disso é cortado e o corte é avisado; o texto completo nunca é guardado."
      }
    ],
  },
];
