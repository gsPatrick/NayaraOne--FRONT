import { NextResponse } from "next/server";
import fs from "fs";
import path from "path";

// VERSION é gerado no build da imagem Docker (ver Dockerfile, estágio "runner") a partir do
// commit real que o build usou.
//
// `force-dynamic` é essencial aqui: sem isso, o Next trata este handler como estático (não lê
// request nem cookies) e o EXECUTA UMA VEZ durante `next build`, no estágio "builder" da
// imagem — momento em que o arquivo VERSION ainda nem existe (ele só é escrito depois, no
// estágio "runner"). O resultado ("unknown") ficava congelado como resposta cacheada pra
// sempre, mesmo após redeploys reais — foi exatamente isso que causou o commit sempre aparecer
// como "unknown" em homologação. Forçando dinâmico, o handler roda de novo a cada request, no
// processo real que já tem o VERSION certo.
export const dynamic = "force-dynamic";

const VERSION_FILE = path.join(process.cwd(), "VERSION");

export async function GET() {
  let commit = "unknown";
  try {
    commit = fs.readFileSync(VERSION_FILE, "utf8").trim();
  } catch {
    // Ambiente local sem o arquivo (fora do build Docker) — não é erro, só não tem commit pra informar.
  }
  return NextResponse.json({ status: "ok", commit, deployedAt: new Date().toISOString() });
}
