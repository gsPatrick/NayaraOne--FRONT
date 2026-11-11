// Preparo do E2E de fechamento do Marco 5 (marco5-fechamento.spec.js) — SÓ em banco descartável.
// A assinatura da vistoria exige MFA recente na rota (o E2E prova a recusa na tela). Para seguir até a entrega das
// chaves, as assinaturas de locador e locatário são registradas pela CAMADA DE SERVIÇO da API
// (signInspection do serviço de vistorias, o mesmo cálculo de snapshot e hash da rota), no mesmo padrão da captura do
// Marco 5 (wt/api-m5/scripts/captura-m5: "a assinatura exige MFA recente na rota e é feita pela camada de serviço").
// Nenhuma rota de MFA é chamada e nenhum token é forjado.
//
// Uso (cwd = raiz da API): DATABASE_URL=<banco descartável local> node <este arquivo> <inspectionId> <groupId> <companyId> <userId>
"use strict";

const path = require("path");

async function main() {
  const [inspectionId, groupId, companyId, userId] = process.argv.slice(2);
  const url = process.env.DATABASE_URL || "";
  if (!/@(127\.0\.0\.1|localhost)[:/]/.test(url) || process.env.E2E_DISPOSABLE_DB !== "1") {
    throw new Error("RECUSADO: o preparo só roda contra o banco descartável local (DATABASE_URL local e E2E_DISPOSABLE_DB=1).");
  }
  const apiDir = process.cwd();
  const { sequelize } = require(path.join(apiDir, "src/models"));
  // O módulo jurídico mudou para src/modules/legal (Guia §2); o caminho antigo fica como alternativa.
  const fs = require("fs");
  const candidates = ["src/modules/legal/inspections/inspection.service.js", "src/features/legal/inspections.service.js"].map((p) => path.join(apiDir, p));
  const inspections = require(candidates.find((p) => fs.existsSync(p)));
  await sequelize.transaction(async (tx) => {
    await sequelize.query("SET LOCAL app.group_id = :g", { replacements: { g: groupId }, transaction: tx });
    await sequelize.query("SET LOCAL app.company_id = :c", { replacements: { c: companyId }, transaction: tx });
    await sequelize.query("SET LOCAL app.user_id = :u", { replacements: { u: userId }, transaction: tx });
    for (const partyRole of ["LANDLORD", "TENANT"]) {
      await inspections.signInspection(inspectionId, { partyRole, signaturePayload: `Aceite ${partyRole} (fictício, E2E)` }, userId, tx);
    }
  });
  await sequelize.close();
  console.log("assinaturas de locador e locatário registradas pela camada de serviço");
}

main().catch((err) => {
  console.error(err.message);
  process.exit(1);
});
