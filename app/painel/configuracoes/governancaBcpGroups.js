// Parâmetros da continuidade operacional (BCP) na aba Governança (Marco 9, M9-D830, M9-D831, M9-D832 e M9-D834). Padrões de Maturacao/demandas/parametros.csv; a API valida.
export const GOVERNANCA_BCP_GROUPS = [
  {
    title: "Continuidade operacional (BCP)",
    subtitle:
      "Qual setor de contingência cada perfil da empresa atende e quantas operações manuais a listagem mostra por página e quantas folhas numeradas cada impressão de formulário aceita. O perfil ADMIN pertence aos seis setores.",
    fields: [
      {
        key: "governanca.bcp.setor_por_papel",
        label: "Perfis de cada setor (atendimento, locação, financeiro, obras, correspondente e jurídico)",
        type: "text",
        defaultValue:
          '{"ATENDIMENTO":["ATENDIMENTO","ATENDENTE","CORRETOR","RECEPCAO"],"LOCACAO":["LOCACAO","LOCAÇÃO","LOCADOR"],"FINANCEIRO":["FINANCEIRO"],"OBRAS":["OBRAS","ENGENHARIA","MESTRE DE OBRAS"],"CORRESPONDENTE":["CORRESPONDENTE"],"JURIDICO":["JURIDICO","JURÍDICO"]}',
        helper:
          'JSON no formato {"SETOR":["NOME DO PERFIL"]}, com os setores ATENDIMENTO, LOCACAO, FINANCEIRO, OBRAS, CORRESPONDENTE e JURIDICO. Quem tem um perfil listado registra e consulta as operações manuais do setor. Usuário sem setor não usa o BCP.',
      },
      {
        key: "governanca.bcp.listagem_limite",
        label: "Tamanho padrão da página nas listas do BCP",
        type: "integer",
        defaultValue: 100,
        min: 1,
        max: 200,
        helper: "Itens por página em operações manuais e reconciliações quando o cliente não informa pageSize (de 1 a 200).",
      },
      {
        key: "governanca.bcp.impressao_max_folhas",
        label: "Máximo de folhas numeradas por impressão de formulário",
        type: "integer",
        defaultValue: 500,
        min: 1,
        max: 5000,
        helper: "Limite de folhas de uma impressão numerada (de/até) dos formulários de contingência. Acima disso a impressão é recusada.",
      },
      {
        key: "governanca.bcp.importacao_lote_max",
        label: "Máximo de operações por pedido de importação",
        type: "integer",
        defaultValue: 200,
        min: 1,
        max: 1000,
        helper: "Quantas operações manuais (formulários em papel) uma única importação aceita. Acima disso o pedido é recusado: importe em partes.",
      },
      {
        key: "governanca.bcp.importacao_lead_prazo_horas",
        label: "Prazo do primeiro contato de lead ou proposta importados do papel (horas)",
        type: "integer",
        defaultValue: 24,
        min: 1,
        max: 720,
        helper: "Quando um lead ou uma proposta de locação do papel é importado, o CRM cobra o próximo contato dentro deste prazo.",
      },
      {
        key: "governanca.bcp.conciliar_pagamento_dias",
        label: "Prazo para conciliar o pagamento emergencial com o extrato (dias úteis)",
        type: "integer",
        defaultValue: 3,
        min: 1,
        max: 60,
        helper: "Conta a partir da data da operação no papel. Passado o prazo sem uma saída de mesmo valor no extrato, o sistema avisa com alerta crítico quem confere (governance:bcp:approve) e quem importou, uma vez por dia.",
      },
      {
        key: "governanca.calendario.feriados",
        label: "Feriados que não contam como dia útil (AAAA-MM-DD, separados por vírgula)",
        type: "text",
        defaultValue: "",
        helper: "Vale para o prazo de conciliação do pagamento emergencial. Sem lista própria valem os feriados nacionais do ano. Segunda a sexta são dias úteis.",
      },
    ],
  },
];
