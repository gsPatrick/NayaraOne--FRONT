// Parâmetros da NAY Diretoria (M9-D035) e da NAY Financeira (M9-D036). Padrão de Maturacao/demandas/parametros.csv; a API valida.
export const IA_DIRETORIA_GROUPS = [
  {
    title: "NAY Diretoria",
    subtitle: "Severidade dos riscos, faixas de vencimento e fronteira do agente da diretoria. A NAY Diretoria só lê, só mostra totais e faixas e nunca executa nem propõe ação.",
    fields: [
      {
        key: "ia.diretoria.faixas_contrato_vencer_dias",
        label: "Faixas de vencimento dos contratos (dias)",
        type: "text",
        defaultValue: "30,60,90",
        helper: "Dias crescentes separados por vírgula, de 1 a 3650. Cada faixa conta os contratos ativos que terminam até aquele dia, sem repetir os da faixa anterior (ex.: 30,60,90)."
      },
      {
        key: "ia.diretoria.max_itens_carteira",
        label: "Máximo de obras lidas na carteira",
        type: "integer",
        min: 1,
        max: 500,
        defaultValue: 100,
        helper: "Número inteiro de 1 a 500. Limita quantas obras em execução entram no resumo da carteira."
      },
      {
        key: "ia.diretoria.risco_medio_min_itens",
        label: "Ocorrências mínimas para risco médio",
        type: "integer",
        min: 1,
        max: 1000,
        defaultValue: 1,
        helper: "Número inteiro de 1 a 1000. A partir deste número de ocorrências o risco é médio; abaixo, baixo."
      },
      {
        key: "ia.diretoria.risco_alto_min_itens",
        label: "Ocorrências mínimas para risco alto",
        type: "integer",
        min: 1,
        max: 1000,
        defaultValue: 5,
        helper: "Número inteiro de 1 a 1000. A partir deste número de ocorrências o risco é alto (contratos, obras, casos parados e estoque)."
      },
      {
        key: "ia.diretoria.inadimplencia_media_pct",
        label: "Inadimplência para risco médio (%)",
        type: "integer",
        min: 0,
        max: 100,
        defaultValue: 5,
        helper: "Número inteiro de 0 a 100. Inadimplência sobre o total elegível a partir deste percentual vira risco médio."
      },
      {
        key: "ia.diretoria.inadimplencia_alta_pct",
        label: "Inadimplência para risco alto (%)",
        type: "integer",
        min: 0,
        max: 100,
        defaultValue: 10,
        helper: "Número inteiro de 0 a 100. Inadimplência sobre o total elegível a partir deste percentual vira risco alto."
      },
      {
        key: "ia.diretoria.max_riscos",
        label: "Máximo de riscos listados",
        type: "integer",
        min: 1,
        max: 50,
        defaultValue: 10,
        helper: "Número inteiro de 1 a 50. Os riscos são ordenados por severidade e só os primeiros aparecem."
      },
      {
        key: "ia.diretoria.termos_escopo",
        label: "Termos do assunto da Diretoria",
        type: "text",
        defaultValue: "empresa,saude,risco,riscos,prioridade,prioridades,semana,indicador,indicadores,inadimpl,contrato,contratos,obra,obras,estoque,financeir,comercial,funil,pipeline,caso,casos,correspondente,juridic,diretoria,resumo,situacao,como esta,explique,explicar,vencer,vencendo,atrasad,fluxo,caixa,saldo,margem,cliente,clientes,lancamento,lancamentos,faturamento,resultado,carteira,gargalo",
        helper: "Termos separados por vírgula, sem acento e sem diferenciar maiúsculas. Pedido sem nenhum destes termos é recusado como fora do propósito, sem chamar modelo."
      },
      {
        key: "ia.diretoria.proibicao.executar_acao",
        label: "Termos que pedem executar ou propor ação",
        type: "text",
        defaultValue: "executar,execute,pague,pagar,faca o pagamento,aprove,aprovar,cancele,cancelar,crie uma tarefa,crie tarefa,criar tarefa,crie uma proposta,gere uma proposta,abra um chamado,envie,enviar mensagem,dispare,demita,contrate,assine,assinar,feche o periodo,altere,alterar,mude,mudar,exclua,apague,proponha uma acao",
        helper: "Termos separados por vírgula, sem acento e sem diferenciar maiúsculas. A NAY Diretoria só resume e sugere em texto; pedido com estes termos é recusado."
      },
      {
        key: "ia.diretoria.proibicao.detalhe_nominal",
        label: "Termos que pedem lista nominal ou valor individual",
        type: "text",
        defaultValue: "liste os clientes,lista de clientes,nome dos clientes,quais clientes,qual cliente,quais contratos,numero do contrato,numeros dos contratos,cliente por cliente,detalhe por cliente,detalhar por cliente,detalhe os,detalhar os,em detalhe,valores individuais,cada lancamento,lista nominal,cpf,cnpj,quem sao os inadimplentes,quais sao os inadimplentes,detalhes do caso,detalhe do caso",
        helper: "Termos separados por vírgula, sem acento e sem diferenciar maiúsculas. A NAY Diretoria responde só com totais e faixas; pedido com estes termos é recusado."
      },
      {
        key: "ia.diretoria.proibicao.numero_sem_fonte",
        label: "Termos que pedem número sem fonte",
        type: "text",
        defaultValue: "estime,estimativa de cabeca,chute,palpite,invente,quanto voce acha,de cabeca,qual seria o numero,adivinhe",
        helper: "Termos separados por vírgula, sem acento e sem diferenciar maiúsculas. A NAY só informa números dos relatórios do sistema; pedido de estimativa ou chute é recusado."
      }
    ],
  },
];
