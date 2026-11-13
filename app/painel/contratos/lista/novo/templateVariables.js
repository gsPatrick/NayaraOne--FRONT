// Helpers do preenchimento do modelo na criação do contrato (extraídos de page.js).
import { formatDate, formatBRL, toNumber, dateOnlyInputToIso } from "@/lib/format";

// Placeholders "{{chave}}" que sobraram no texto renderizado: o servidor deixa o placeholder intacto quando não recebe
// valor, para nunca esconder que faltou preencher algo; a tela pede esses campos antes de criar a versão.
export function findUnresolvedPlaceholders(text) {
  const matches = String(text || "").matchAll(/\{\{\s*([a-zA-Z0-9_]+)\s*\}\}/g);
  return [...new Set([...matches].map((m) => m[1]))];
}

// Placeholders comuns preenchidos com o que o formulário já tem (partes, imóvel, valor, datas).
export function buildKnownVariables({ parties, people, property, form }) {
  const byRole = (role) => {
    const party = parties.find((p) => p.partyRole === role);
    return party ? people.find((p) => p.id === party.personId) : null;
  };
  const landlord = byRole("LANDLORD") || byRole("SELLER");
  const tenant = byRole("TENANT") || byRole("BUYER");

  const vars = {};
  if (landlord) {
    vars.nome_locador = landlord.legalName;
    vars.doc_locador = landlord.taxIdNormalized || "(documento não cadastrado)";
  }
  if (tenant) {
    vars.nome_locatario = tenant.legalName;
    vars.doc_locatario = tenant.taxIdNormalized || "(documento não cadastrado)";
  }
  if (property) vars.endereco_imovel = property.addressLine || property.name;
  if (form.totalValue) vars.valor_aluguel = formatBRL(toNumber(form.totalValue)).replace("R$", "").trim();
  if (form.startsAt) vars.data_inicio = formatDate(dateOnlyInputToIso(form.startsAt));
  if (form.endsAt) vars.data_fim = formatDate(dateOnlyInputToIso(form.endsAt));
  return vars;
}
