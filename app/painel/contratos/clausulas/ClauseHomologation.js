"use client";

// Selo e ação de homologação da versão da cláusula (Caderno M5 §4 "Versões homologadas"). Só versão homologada entra na
// minuta sugerida pela NAY. Quem escreveu a versão não homologa (a API recusa do mesmo jeito).
import Badge from "@/components/atoms/Badge/Badge";
import Button from "@/components/atoms/Button/Button";
import useConfirm from "@/components/organisms/ConfirmDialog/useConfirm";
import { homologateClause } from "@/lib/api/legal";
import { hasPermission } from "@/lib/rbac/permissions";
import { getCurrentUser } from "@/lib/auth/session";
import { canHomologate, homologationLabel } from "@/lib/legal/clauseHomologation";
import { legalErrorMessage } from "@/lib/legal/legalErrors";

export default function ClauseHomologation({ clause, onUpdated, onError }) {
  const { confirm, ConfirmDialog } = useConfirm();
  const label = homologationLabel(clause);
  const me = getCurrentUser();
  const allowed = canHomologate(clause, { userId: me && me.id, canApprove: hasPermission("legal:approve") });

  async function handleHomologate() {
    const ok = await confirm({
      title: `Homologar "${clause.title}" v${clause.versionNumber}?`,
      message: "Você confirma que revisou o texto desta versão. Depois de homologada, ela pode entrar nas minutas sugeridas pela NAY; a homologação não é desfeita (para mudar o texto, crie uma nova versão).",
      confirmLabel: "Homologar",
    });
    if (!ok) return;
    try {
      onUpdated(await homologateClause(clause.id));
    } catch (err) {
      onError(legalErrorMessage(err, "Erro ao homologar a cláusula."));
    }
  }

  return (
    <>
      <Badge tone={label.tone}>{label.text}</Badge>
      {allowed ? <Button size="sm" variant="secondary" onClick={handleHomologate} data-testid="clause-homologate">Homologar</Button> : null}
      <ConfirmDialog />
    </>
  );
}
