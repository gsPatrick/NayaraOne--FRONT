import { NextResponse } from "next/server";
import fs from "fs";
import path from "path";

// VERSION é gerado no build da imagem Docker (ver Dockerfile, estágio "version") a partir do
// commit real que o build usou. Lido uma vez no boot do processo — cada deploy sobe um
// processo novo, então isso já reflete o commit certo, sem depender de nenhum passo manual.
const VERSION_FILE = path.join(process.cwd(), "VERSION");
let commit = "unknown";
try {
  commit = fs.readFileSync(VERSION_FILE, "utf8").trim();
} catch {
  // Ambiente local sem o arquivo (fora do build Docker) — não é erro, só não tem commit pra informar.
}
const deployedAt = new Date().toISOString();

export async function GET() {
  return NextResponse.json({ status: "ok", commit, deployedAt });
}
