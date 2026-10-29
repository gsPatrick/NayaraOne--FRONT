// Dados FICTÍCIOS do caso FC-2026-0412.
export const RESUMO = [
  ["Proponente principal", "Beatriz Nogueira Lima", "CPF ***.123.456-**"],
  ["Co-proponente", "André Lima Nogueira", "CPF ***.771.320-** · cônjuge"],
  ["Imóvel", "IMV-1087 · Apto 82, Jardim Botânico", "112 m², 3 dormitórios"],
  ["Valor financiado", "R$ 612.000,00", "80% do valor de avaliação"],
  ["Entrada", "R$ 153.000,00", "20% · já comprovada"],
  ["Banco / provider", "Caixa Econômica Federal", "Integração oficial"],
  ["Produto", "SBPE, Tabela Price", "Taxa balcão"],
  ["Finalidade", "Aquisição de imóvel residencial", "Primeiro imóvel"],
  ["Responsável", "Marina Albuquerque", "Correspondente sênior"],
  ["Prazo", "360 meses", "Término em out/2056"],
];
export const PROXIMA_ACAO = "Anexar o comprovante de renda atualizado de André Lima Nogueira (vence em 3 dias) e reenviar à Caixa.";

export const DOCS = [
  { tipo: "Documento de identidade (RG/CNH)", arq: "rg-beatriz.pdf", v: "v2", validade: "12/03/2031", sit: "Validado", versoes: [
    { v: "v2", estado: "Vigente", quando: "22/10/2026 às 10:14", quem: "Camila Duarte", nota: "Validada", hash: "b6ec…f9087" },
    { v: "v1", estado: "Substituída", quando: "19/10/2026 às 16:40", quem: "Marina Albuquerque", nota: "Imagem cortada", hash: "3a91…c20d4" },
  ] },
  { tipo: "Comprovante de renda (titular)", arq: "holerite-set-2026.pdf", v: "v1", validade: "30/11/2026", sit: "Validado" },
  { tipo: "Comprovante de renda (co-proponente)", arq: "holerite-andre-ago.pdf", v: "v1", validade: "01/11/2026", sit: "Pendente" },
  { tipo: "Comprovante de residência", arq: "conta-luz-set.pdf", v: "v1", validade: "31/12/2026", sit: "Validado" },
  { tipo: "Certidão de casamento", arq: "certidao-casamento.pdf", v: "v1", validade: "Sem vencimento", sit: "Validado" },
  { tipo: "Extrato do FGTS", arq: "fgts-extrato.pdf", v: "v1", validade: "15/11/2026", sit: "Ilegível" },
  { tipo: "Matrícula do imóvel", arq: "matricula-1087.pdf", v: "v3", validade: "28/11/2026", sit: "Validado" },
];
export const SIT_TONE = { Validado: "success", Pendente: "warning", "Ilegível": "danger" };

export const SIMULACOES = [
  { banco: "Caixa", parcela: 4812.37, taxa: "10,49% a.a.", cet: "11,32% a.a.", prazo: 360, escolhida: true },
  { banco: "Itaú", parcela: 4976.10, taxa: "10,89% a.a.", cet: "11,80% a.a.", prazo: 360 },
  { banco: "Bradesco", parcela: 5120.55, taxa: "11,19% a.a.", cet: "12,04% a.a.", prazo: 360 },
];

export const EVENTOS = [
  { title: "Documento enviado: extrato do FGTS (ilegível)", when: "27/10/2026 09:12", who: "Marina Albuquerque", tone: "danger" },
  { title: "Simulação da Caixa escolhida", when: "26/10/2026 15:48", who: "Marina Albuquerque", tone: "brand" },
  { title: "Caso enviado à Caixa para pré-análise", when: "24/10/2026 11:05", who: "Marina Albuquerque", tone: "info" },
  { title: "Identidade validada (v2)", when: "22/10/2026 10:14", who: "Camila Duarte", tone: "success" },
  { title: "Caso criado a partir da proposta PRP-0231", when: "17/10/2026 14:30", who: "Rafael Teixeira" },
];
export const NAY = [
  "Renda familiar suporta a parcela escolhida com 31% de comprometimento.",
  "O holerite de André vence em 3 dias e pode travar a análise.",
  "Entrada comprovada cobre a exigência de 20% da Caixa.",
];
export const PENDENCIAS = [
  "Holerite atualizado do co-proponente",
  "Novo extrato do FGTS (legível)",
  "Assinatura da autorização de consulta ao SCR",
];

export const ENVIOS = [
  { quando: "24/10/2026 11:05", acao: "Envio de pré-análise", canal: "API Caixa", resultado: "Recebido", prot: "CX-88140921" },
  { quando: "25/10/2026 08:20", acao: "Retorno do banco", canal: "API Caixa", resultado: "Pendência de documentos", prot: "CX-88140921" },
  { quando: "26/10/2026 17:02", acao: "Reenvio com documentos", canal: "API Caixa", resultado: "Em análise", prot: "CX-88140921" },
];
export const AVALIACAO = [
  ["Valor de avaliação", "R$ 765.000,00"], ["Avaliador", "Engenharia Caixa (laudo 2026/3318)"],
  ["Data da vistoria", "20/10/2026"], ["Relação financiamento/valor (LTV)", "80,0%"],
  ["Situação do laudo", "Aprovado com ressalva de habite-se"],
];
export const COMISSAO = [
  { benef: "Marina Albuquerque", papel: "Correspondente", pct: "0,60%", valor: 3672, sit: "Prevista" },
  { benef: "Rafael Teixeira", papel: "Corretor do imóvel", pct: "0,40%", valor: 2448, sit: "Prevista" },
  { benef: "Nayara Imóveis", papel: "Empresa", pct: "0,25%", valor: 1530, sit: "Prevista" },
];
export const AUDITORIA = [
  { quando: "27/10/2026 09:12", quem: "Marina Albuquerque", acao: "documento.upload", det: "fgts-extrato.pdf (v1)", ip: "187.12.•••.41" },
  { quando: "26/10/2026 15:48", quem: "Marina Albuquerque", acao: "simulacao.escolher", det: "Caixa · parcela R$ 4.812,37", ip: "187.12.•••.41" },
  { quando: "24/10/2026 11:05", quem: "Marina Albuquerque", acao: "caso.enviar_banco", det: "Provider Caixa", ip: "187.12.•••.41" },
  { quando: "22/10/2026 10:14", quem: "Camila Duarte", acao: "documento.validar", det: "rg-beatriz.pdf (v2)", ip: "200.45.•••.18" },
  { quando: "17/10/2026 14:30", quem: "Rafael Teixeira", acao: "caso.criar", det: "Origem PRP-0231", ip: "201.8.•••.77" },
];
