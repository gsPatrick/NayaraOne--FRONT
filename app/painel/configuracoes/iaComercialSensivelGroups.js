// Dado pessoal sensível na NAY Comercial (Marco 3 §12 "Não inferir atributo sensível do cliente"; LGPD art. 5º, II). O livro não dá a lista
// de palavras: cada categoria é um parâmetro da empresa (DI-M3CB-21). Padrões iguais aos da API (nay_comercial/comercial.sensitive.settings.js).
const SENSITIVE_HELPER = "Lista separada por vírgula, sem acento e sem diferenciar maiúsculas; o termo casa no começo de uma palavra (\"catolic\" pega \"católico\" e \"católica\"). Trecho com estes termos fica de fora do resumo e da resposta da NAY.";

function category(key, label, defaultValue) {
  return { key, label, type: "text", defaultValue, helper: SENSITIVE_HELPER };
}

export const IA_COMERCIAL_SENSIVEL_GROUPS = [
  {
    title: "NAY Comercial: dado pessoal sensível",
    subtitle: "A NAY não deduz nem repete dado pessoal sensível do cliente (LGPD art. 5º, II): origem racial ou étnica, convicção religiosa, opinião política, filiação a sindicato ou organização, saúde, vida sexual, dado genético e dado biométrico.",
    fields: [
      category("ia.comercial.sensivel.origem_racial_etnica", "Termos de origem racial ou étnica", "raca,racial,etnia,etnic,afrodescendente,cor da pele,indigena,quilombola"),
      category("ia.comercial.sensivel.conviccao_religiosa", "Termos de convicção religiosa", "religiao,religios,catolic,evangelic,protestante,espirita,umbanda,candomble,judeu,judia,judaic,muculman,islamic,budista,ateu,ateia,igreja,templo,culto religioso,pastor,padre"),
      category("ia.comercial.sensivel.opiniao_politica", "Termos de opinião política", "opiniao politica,ideologia politica,partido politico,petista,bolsonarista,esquerdista,direitista,comunista,eleitor,vota em,votou em,votar em"),
      category("ia.comercial.sensivel.filiacao_organizacao", "Termos de filiação a sindicato ou organização religiosa, filosófica ou política", "sindicato,sindicaliz,sindical,filiado ao partido,filiada ao partido,maconaria,macom,associacao religiosa,organizacao filosofica"),
      category("ia.comercial.sensivel.saude", "Termos de saúde", "doenca,doente,diagnostic,cancer,hiv,aids,diabet,depressao,depressiv,ansiedade,gravida,gestante,gravidez,deficiencia,deficiente,cadeirante,autis,transtorno,tratamento medico,medicament,cirurgia,quimioterapia,internad,plano de saude dele,plano de saude dela"),
      category("ia.comercial.sensivel.vida_sexual", "Termos de vida sexual", "orientacao sexual,vida sexual,homossexual,heterossexual,bissexual,gay,lesbica,transexual,transgenero,lgbt"),
      category("ia.comercial.sensivel.dado_genetico", "Termos de dado genético", "genetic,dna,genoma,exame de paternidade"),
      category("ia.comercial.sensivel.dado_biometrico", "Termos de dado biométrico", "biometri,impressao digital,reconhecimento facial,leitura de iris"),
      {
        key: "ia.comercial.proibicao.inferir_atributo_sensivel",
        label: "Pedidos para deduzir dado sensível do cliente (recusados)",
        type: "text",
        defaultValue: "religiao do cliente,religiao dele,religiao dela,qual a religiao,orientacao sexual,etnia do cliente,raca do cliente,cor da pele,partido do cliente,em quem ele vota,em quem ela vota,em quem o cliente vota,o cliente e gay,ele e gay,ela e gay,o cliente e sindicalizado,doenca do cliente,saude do cliente,o cliente esta doente,a cliente esta gravida,ela esta gravida,o cliente tem alguma doenca,descubra a religiao,descubra a orientacao,infira a religiao,infira a orientacao",
        helper: "Lista separada por vírgula. Pedido com uma destas frases é recusado sem consultar nada: a NAY não deduz dado pessoal sensível do cliente.",
      },
    ],
  },
];
