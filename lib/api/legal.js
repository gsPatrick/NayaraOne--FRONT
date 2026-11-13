// Chamadas ao módulo Jurídico/Contratos da API real. Fechamento M5: o arquivo foi dividido por assunto (cada
// um com no máximo 400 linhas) e este módulo só re-exporta, para as telas continuarem importando de "@/lib/api/legal".
//   legalContracts.js — contratos, partes, versões (aprovação por versão), assinaturas, aditivos, checklist, upload
//   legalLibrary.js   — modelos versionados e biblioteca de cláusulas
//   legalLease.js     — garantias, vistorias e entrega de chaves
//   legalCases.js     — processos, prazos, dossiê e notificações versionadas

export * from "@/lib/api/legalContracts";
export * from "@/lib/api/legalLibrary";
export * from "@/lib/api/legalLease";
export * from "@/lib/api/legalCases";
