// Rótulos de todos os parâmetros das abas de /painel/configuracoes (chave técnica -> nome mostrado ao administrador).
// Usado pela tela de Atividades para nunca mostrar a chave técnica. O teste m9d852.atividades exige que todo *Groups.js esteja aqui.
import * as g0 from "@/app/painel/configuracoes/biAceiteGroups";
import * as g1 from "@/app/painel/configuracoes/biAlertasGroups";
import * as g2 from "@/app/painel/configuracoes/biAtendimentoKpiGroups";
import * as g3 from "@/app/painel/configuracoes/biBriefingGroups";
import * as g4 from "@/app/painel/configuracoes/biCaixaGroups";
import * as g5 from "@/app/painel/configuracoes/biCargaGroups";
import * as g6 from "@/app/painel/configuracoes/biCentroComandoFatosGroups";
import * as g7 from "@/app/painel/configuracoes/biCentroComandoGroups";
import * as g8 from "@/app/painel/configuracoes/biComercialGroups";
import * as g9 from "@/app/painel/configuracoes/biCorretoresKpiGroups";
import * as g10 from "@/app/painel/configuracoes/biDecisaoFilaGroups";
import * as g11 from "@/app/painel/configuracoes/biDesempenhoGroups";
import * as g12 from "@/app/painel/configuracoes/biDrilldownGroups";
import * as g13 from "@/app/painel/configuracoes/biExportacaoGroups";
import * as g14 from "@/app/painel/configuracoes/biFinanceiroGroups";
import * as g15 from "@/app/painel/configuracoes/biFinanceiroInadimplenciaGroups";
import * as g16 from "@/app/painel/configuracoes/biFinanceiroJanelasGroups";
import * as g17 from "@/app/painel/configuracoes/biFinanceiroResultadosGroups";
import * as g18 from "@/app/painel/configuracoes/biFunilComercialGroups";
import * as g19 from "@/app/painel/configuracoes/biIaKpiGroups";
import * as g20 from "@/app/painel/configuracoes/biImoveisKpiGroups";
import * as g21 from "@/app/painel/configuracoes/biJuridicoCorrespondenteKpiGroups";
import * as g22 from "@/app/painel/configuracoes/biJuridicoGroups";
import * as g23 from "@/app/painel/configuracoes/biLocacaoAtendimentoKpiGroups";
import * as g24 from "@/app/painel/configuracoes/biLocacaoCarteiraKpiGroups";
import * as g25 from "@/app/painel/configuracoes/biLocacaoGroups";
import * as g26 from "@/app/painel/configuracoes/biLocacaoPrazosKpiGroups";
import * as g27 from "@/app/painel/configuracoes/biMarketingKpiGroups";
import * as g28 from "@/app/painel/configuracoes/biObrasGroups";
import * as g29 from "@/app/painel/configuracoes/biObrasKpiGroups";
import * as g30 from "@/app/painel/configuracoes/biObrasOperacaoGroups";
import * as g31 from "@/app/painel/configuracoes/biQualidadeGroups";
import * as g32 from "@/app/painel/configuracoes/biSaudeGeralGroups";
import * as g33 from "@/app/painel/configuracoes/biSnapshotGroups";
import * as g34 from "@/app/painel/configuracoes/biTecnologiaKpiGroups";
import * as g35 from "@/app/painel/configuracoes/governancaAcessoCampoGroups";
import * as g36 from "@/app/painel/configuracoes/governancaApiGroups";
import * as g37 from "@/app/painel/configuracoes/governancaBcpGroups";
import * as g38 from "@/app/painel/configuracoes/governancaClassificacaoGroups";
import * as g39 from "@/app/painel/configuracoes/governancaDlpAnexosGroups";
import * as g40 from "@/app/painel/configuracoes/governancaDlpExportGroups";
import * as g41 from "@/app/painel/configuracoes/governancaDlpGroups";
import * as g42 from "@/app/painel/configuracoes/governancaFinopsGroups";
import * as g43 from "@/app/painel/configuracoes/governancaFlagsGroups";
import * as g44 from "@/app/painel/configuracoes/governancaLegalHoldGroups";
import * as g45 from "@/app/painel/configuracoes/governancaMigracaoGroups";
import * as g46 from "@/app/painel/configuracoes/governancaRetencaoGroups";
import * as g47 from "@/app/painel/configuracoes/iaAprovacaoGroups";
import * as g48 from "@/app/painel/configuracoes/iaAtendimentoGroups";
import * as g49 from "@/app/painel/configuracoes/iaAvaliacaoGroups";
import * as g50 from "@/app/painel/configuracoes/iaCacheGroups";
import * as g51 from "@/app/painel/configuracoes/iaComercialGroups";
import * as g52 from "@/app/painel/configuracoes/iaConversaGroups";
import * as g53 from "@/app/painel/configuracoes/iaCorrespondenteGroups";
import * as g54 from "@/app/painel/configuracoes/iaDiretoriaGroups";
import * as g55 from "@/app/painel/configuracoes/iaDocumentalGroups";
import * as g56 from "@/app/painel/configuracoes/iaExecucaoGroups";
import * as g57 from "@/app/painel/configuracoes/iaFallbackGroups";
import * as g58 from "@/app/painel/configuracoes/iaFinanceiraGroups";
import * as g59 from "@/app/painel/configuracoes/iaJuridicaGroups";
import * as g60 from "@/app/painel/configuracoes/iaMemoriaGroups";
import * as g61 from "@/app/painel/configuracoes/iaObrasGroups";
import * as g62 from "@/app/painel/configuracoes/iaObservabilidadeGroups";
import * as g63 from "@/app/painel/configuracoes/iaOrcamentoGroups";
import * as g64 from "@/app/painel/configuracoes/iaProvedoresGroups";
import * as g65 from "@/app/painel/configuracoes/iaRagGroups";
import * as g66 from "@/app/painel/configuracoes/iaRoteamentoGroups";
import * as g67 from "@/app/painel/configuracoes/iaSegurancaGroups";
import * as g68 from "@/app/painel/configuracoes/integracoesAcoesGroups";
import * as g69 from "@/app/painel/configuracoes/integracoesContingenciaCanaisGroups";
import * as g70 from "@/app/painel/configuracoes/integracoesContingenciaGroups";
import * as g71 from "@/app/painel/configuracoes/integracoesContratoGroups";
import * as g72 from "@/app/painel/configuracoes/integracoesEnvioGroups";
import * as g73 from "@/app/painel/configuracoes/integracoesEscolhaGroups";
import * as g74 from "@/app/painel/configuracoes/integracoesFamiliasGroups";
import * as g75 from "@/app/painel/configuracoes/integracoesInfraGroups";
import * as g76 from "@/app/painel/configuracoes/integracoesLiberacaoGroups";
import * as g77 from "@/app/painel/configuracoes/integracoesMensageriaGroups";
import * as g78 from "@/app/painel/configuracoes/integracoesMinimizacaoGroups";
import * as g79 from "@/app/painel/configuracoes/integracoesPublicacaoGroups";
import * as g80 from "@/app/painel/configuracoes/integracoesSaudeGroups";
import * as g81 from "@/app/painel/configuracoes/integracoesSegurancaGroups";
import * as g82 from "@/app/painel/configuracoes/integracoesWebhookGroups";
import * as g83 from "@/app/painel/configuracoes/marketingAgendamentoGroups";
import * as g84 from "@/app/painel/configuracoes/marketingAtribuicaoGroups";
import * as g85 from "@/app/painel/configuracoes/marketingAutomacoesProntasGroups";
import * as g86 from "@/app/painel/configuracoes/marketingAutopublicacaoGroups";
import * as g87 from "@/app/painel/configuracoes/marketingCadenceGroups";
import * as g88 from "@/app/painel/configuracoes/marketingCanaisGroups";
import * as g89 from "@/app/painel/configuracoes/marketingConsentGroups";
import * as g90 from "@/app/painel/configuracoes/marketingCustosGroups";
import * as g91 from "@/app/painel/configuracoes/marketingDrillGroups";
import * as g92 from "@/app/painel/configuracoes/marketingFactualGroups";
import * as g93 from "@/app/painel/configuracoes/marketingFunilGroups";
import * as g94 from "@/app/painel/configuracoes/marketingKillSwitchGroups";
import * as g95 from "@/app/painel/configuracoes/marketingMensagensGroups";
import * as g96 from "@/app/painel/configuracoes/marketingPublicacoesGroups";
import * as g97 from "@/app/painel/configuracoes/marketingRedesGroups";
import * as g98 from "@/app/painel/configuracoes/marketingRunnerGroups";
import * as g99 from "@/app/painel/configuracoes/marketingSegmentacaoGroups";
import * as g100 from "@/app/painel/configuracoes/marketingSeoBlogGroups";
import * as g101 from "@/app/painel/configuracoes/marketingTiposConteudoGroups";
import * as g102 from "@/app/painel/configuracoes/marketingUrlGroups";
import * as g103 from "@/app/painel/configuracoes/marketingVideoGroups";
import * as g104 from "@/app/painel/configuracoes/financeiroGroups";
import * as g105 from "@/app/painel/configuracoes/iaComercialCapacidadesGroups";
import * as g106 from "@/app/painel/configuracoes/iaComercialSensivelGroups";

const MODULES = [g0, g1, g2, g3, g4, g5, g6, g7, g8, g9, g10, g11, g12, g13, g14, g15, g16, g17, g18, g19, g20, g21, g22, g23, g24, g25, g26, g27, g28, g29, g30, g31, g32, g33, g34, g35, g36, g37, g38, g39, g40, g41, g42, g43, g44, g45, g46, g47, g48, g49, g50, g51, g52, g53, g54, g55, g56, g57, g58, g59, g60, g61, g62, g63, g64, g65, g66, g67, g68, g69, g70, g71, g72, g73, g74, g75, g76, g77, g78, g79, g80, g81, g82, g83, g84, g85, g86, g87, g88, g89, g90, g91, g92, g93, g94, g95, g96, g97, g98, g99, g100, g101, g102, g103, g104, g105, g106, ];

let cache = null;

function collect(node, out) {
  if (!node || typeof node !== "object") return;
  if (Array.isArray(node)) {
    node.forEach((item) => collect(item, out));
    return;
  }
  if (typeof node.key === "string" && typeof node.label === "string") out[node.key] = node.label;
  Object.values(node).forEach((value) => collect(value, out));
}

/** Mapa chave -> rótulo de todos os parâmetros declarados nas abas de configuração. */
export function allSettingLabels() {
  if (cache) return cache;
  const out = {};
  MODULES.forEach((mod) => Object.values(mod).forEach((value) => collect(value, out)));
  cache = out;
  return cache;
}
