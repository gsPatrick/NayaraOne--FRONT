import { linkPerson } from "@/lib/api/people";

// CPF/CNPJ que já tem cadastro em outra empresa do grupo (API: 409 PERSON_TAX_ID_IN_GROUP, DI-M9I-2). Quem tem a permissão de
// vincular pessoas confirma e o cadastro do grupo passa a valer nesta empresa: a API confere o nome digitado com o do cadastro,
// mostra aqui só os dados básicos (nome, documento, nascimento) e grava nesta empresa os contatos, o endereço, os papéis e os
// documentos do formulário. Nada da outra empresa aparece. Devolve a pessoa vinculada, ou null se a pessoa cancelou.
export const VINCULO_DIALOGO = {
  title: "Este CPF/CNPJ já tem cadastro no grupo",
  message:
    "Outra empresa do grupo já cadastrou este CPF/CNPJ. Você pode vincular esse cadastro a esta empresa: conferimos o nome que você digitou com o do cadastro, esta empresa passa a ver só os dados básicos (nome, documento e nascimento) e os contatos, o endereço, os papéis e os documentos deste formulário ficam só nesta empresa. Os dados da outra empresa continuam só dela.",
  confirmLabel: "Vincular a esta empresa",
  tone: "primary",
};

export function podeOferecerVinculo(err) {
  return err?.code === "PERSON_TAX_ID_IN_GROUP" && err?.details?.podeVincular === true;
}

export async function oferecerVinculo(payload, confirm) {
  const ok = await confirm(VINCULO_DIALOGO);
  if (!ok) return null;
  const { taxIdNormalized, legalName, contacts, address, roles, documents } = payload;
  return linkPerson({
    taxIdNormalized,
    legalName,
    contacts,
    address,
    roles,
    documents,
    reason: "Cadastro pela tela de Pessoas: o CPF/CNPJ já tinha cadastro em outra empresa do grupo.",
  });
}
