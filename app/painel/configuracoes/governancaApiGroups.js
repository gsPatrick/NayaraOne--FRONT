// Padrões de API na aba Governança (Marco 9, M9-D843): limite de requisições, paginação e idempotência. Padrões de Maturacao/demandas/parametros.csv; a API valida.
export const GOVERNANCA_API_GROUPS = [
  {
    title: "Padrões de API (limite, paginação e idempotência)",
    subtitle:
      "Valem para a API inteira: quantas requisições por minuto cada usuário ou credencial pode fazer (acima disso a API responde 429 com o tempo de espera), o tamanho padrão da página (o máximo de 200 é fixo) e por quanto tempo uma chave de idempotência devolve a resposta original.",
    fields: [
      { key: "governanca.api.rate_limit.habilitado", label: "Limite de requisições ligado", type: "boolean", defaultValue: true, helper: "Desligado, a empresa fica sem limite por credencial." },
      { key: "governanca.api.rate_limit.interno_por_minuto", label: "Requisições por minuto por usuário logado", type: "integer", defaultValue: 1200, min: 1, max: 1000000 },
      { key: "governanca.api.rate_limit.externo_por_minuto", label: "Requisições por minuto por credencial de API externa", type: "integer", defaultValue: 600, min: 1, max: 1000000 },
      { key: "governanca.api.paginacao.tamanho_padrao", label: "Itens por página quando o cliente não informa", type: "integer", defaultValue: 50, min: 1, max: 200 },
      { key: "governanca.api.idempotencia.validade_horas", label: "Validade da chave de idempotência (horas)", type: "integer", defaultValue: 24, min: 1, max: 720, helper: "Repetir a mesma chave com o mesmo corpo dentro deste prazo devolve a resposta original, sem repetir o efeito." },
      { key: "governanca.api.idempotencia.espera_segundos", label: "Espera de uma repetição simultânea (segundos)", type: "integer", defaultValue: 10, min: 1, max: 120 },
      { key: "governanca.api.limpeza_job_minutos", label: "Intervalo da limpeza de chaves vencidas (minutos)", type: "integer", defaultValue: 10, min: 1, max: 1440 },
    ],
  },
];
