// Retenção legal (legal hold) na aba Governança (Marco 9, M9-D912). Padrões de Maturacao/demandas/parametros.csv; a API valida.
// A trava em si não tem parâmetro: legal hold sempre prevalece sobre retenção, anonimização e exclusão. Só a consulta e o tamanho do escopo variam.
export const GOVERNANCA_LEGAL_HOLD_GROUPS = [
  {
    title: "Retenção legal (legal hold)",
    subtitle:
      "A retenção legal protege registros de apagamento, anonimização, união e descarte por retenção, sem exceção de papel e sem opção de desligar. Criar e liberar exige a permissão governance:legal-hold:manage; liberar exige MFA e a confirmação com o impacto. Os dois campos abaixo só ajustam a consulta e o tamanho do escopo de cada retenção.",
    fields: [
      { key: "governanca.legal_hold.pagina_tamanho", label: "Itens por página na consulta das retenções legais", type: "integer", defaultValue: 50, min: 1, max: 200 },
      { key: "governanca.legal_hold.escopo_max_itens", label: "Máximo de itens no escopo de uma retenção legal", type: "integer", defaultValue: 50, min: 1, max: 500, helper: "Cada item pode ser um registro, uma pessoa, um contrato, um processo, a empresa inteira ou um tipo de dado (com ou sem período)." },
    ],
  },
];
