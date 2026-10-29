// Dados FICTÍCIOS. CPFs mascarados; nenhum dado real.
export const SITUACOES = {
  "Rascunho": "neutral",
  "Em análise": "info",
  "Aguardando documentos": "warning",
  "Enviado ao banco": "brand",
  "Aprovado": "success",
  "Em contratação": "success",
  "Cancelado": "danger",
};
export const BANCOS = ["Caixa", "Itaú", "Bradesco", "Santander", "Sicredi", "Manual"];
export const RESPONSAVEIS = ["Marina Albuquerque", "Rafael Teixeira", "Camila Duarte", "Henrique Sales"];

const r = (n, proponente, cpf, cod, bairro, banco, valor, entrada, situacao, resp, min, dup = false) => ({
  id: `FC-2026-0${n}`, proponente, cpf, cod, bairro, banco, valor, entrada, situacao, resp, min, dup,
});

export const CASOS = [
  r(412, "Beatriz Nogueira Lima", "***.123.456-**", "IMV-1087", "Jardim Botânico", "Caixa", 612000, 153000, "Em análise", RESPONSAVEIS[0], 18),
  r(411, "Eduardo Vasconcelos Prado", "***.482.910-**", "IMV-0954", "Vila Madalena", "Itaú", 845000, 211250, "Enviado ao banco", RESPONSAVEIS[1], 95),
  r(409, "Luciana Ferraz Monteiro", "***.337.208-**", "IMV-1120", "Moema", "Bradesco", 1120000, 480000, "Aprovado", RESPONSAVEIS[2], 340),
  r(407, "Thiago Moraes Carvalho", "***.905.114-**", "IMV-0871", "Santana", "Santander", 395000, 79000, "Aguardando documentos", RESPONSAVEIS[3], 2880),
  r(405, "Fernanda Queiroz Azevedo", "***.221.673-**", "IMV-1034", "Pinheiros", "Caixa", 730000, 182500, "Em contratação", RESPONSAVEIS[0], 1500),
  r(404, "Ricardo Almeida Barros", "***.658.027-**", "IMV-0990", "Tatuapé", "Sicredi", 468000, 117000, "Em análise", RESPONSAVEIS[1], 12960),
  r(402, "Patrícia Souza Andrade", "***.774.389-**", "IMV-1066", "Perdizes", "Itaú", 910000, 300000, "Aguardando documentos", RESPONSAVEIS[2], 11520, true),
  r(401, "Marcos Vinícius Pereira", "***.019.552-**", "IMV-0812", "Mooca", "Manual", 330000, 132000, "Rascunho", RESPONSAVEIS[3], 60),
  r(399, "Juliana Rezende Cardoso", "***.540.861-**", "IMV-1101", "Itaim Bibi", "Bradesco", 1380000, 552000, "Enviado ao banco", RESPONSAVEIS[0], 4320),
  r(397, "Gustavo Henrique Lacerda", "***.286.744-**", "IMV-0903", "Lapa", "Caixa", 520000, 104000, "Aprovado", RESPONSAVEIS[1], 2200),
  r(396, "Aline Teixeira Fontes", "***.613.095-**", "IMV-1059", "Vila Mariana", "Santander", 689000, 172250, "Em análise", RESPONSAVEIS[2], 14400),
  r(394, "Bruno Cavalcante Dias", "***.832.470-**", "IMV-0847", "Butantã", "Sicredi", 298000, 59600, "Cancelado", RESPONSAVEIS[3], 20160),
  r(392, "Carolina Mendes Freitas", "***.147.906-**", "IMV-1142", "Higienópolis", "Itaú", 1050000, 420000, "Em contratação", RESPONSAVEIS[0], 720),
  r(390, "Leonardo Batista Rangel", "***.398.215-**", "IMV-0925", "Saúde", "Caixa", 447000, 111750, "Aguardando documentos", RESPONSAVEIS[1], 10080),
  r(388, "Sabrina Oliveira Costa", "***.725.380-**", "IMV-1078", "Brooklin", "Bradesco", 795000, 238500, "Em análise", RESPONSAVEIS[2], 45, true),
  r(386, "Rodrigo Pimentel Nunes", "***.064.839-**", "IMV-0868", "Ipiranga", "Manual", 365000, 73000, "Rascunho", RESPONSAVEIS[3], 8640),
];

export const INDICADORES = [
  { id: "analise", label: "Em análise", n: 18, filtro: { situacao: "Em análise" } },
  { id: "docs", label: "Aguardando documentos", n: 9, filtro: { situacao: "Aguardando documentos" } },
  { id: "banco", label: "Enviados ao banco", n: 11, filtro: { situacao: "Enviado ao banco" } },
  { id: "aprov", label: "Aprovados no mês", n: 6, filtro: { situacao: "Aprovado" } },
  { id: "parado", label: "Sem atividade há mais de 7 dias", n: 14, filtro: { parado: true }, alerta: true },
];
