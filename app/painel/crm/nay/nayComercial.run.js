// Execução de uma consulta à NAY Comercial: POST /ai/runs e, quando a API responde 202 (consulta longa), acompanha GET /ai/runs/:id até
// um estado final (COMPLETED, FAILED, BLOCKED ou CANCELLED), com limite de tentativas. As dependências entram por parâmetro (testável).

export const FINAL_STATUSES = ["COMPLETED", "FAILED", "BLOCKED", "CANCELLED"];
export const POLL_MAX_ATTEMPTS = 20;
export const POLL_DELAY_MS = 1500;

const defaultSleep = (ms) => new Promise((resolve) => setTimeout(resolve, ms));

/** Resposta 200 do POST /ai/runs -> formato da tela. */
export function fromRunResponse(data) {
  return {
    runId: data?.runId || null,
    status: data?.status || "COMPLETED",
    answer: data?.answer || "",
    sources: Array.isArray(data?.sources) ? data.sources : [],
    structured: data?.structured || null,
    proposals: Array.isArray(data?.proposals) ? data.proposals : [],
    snapshotAt: data?.snapshotAt || null,
    fromPolling: false,
  };
}

/** Run lido por GET /ai/runs/:id (consulta longa) -> formato da tela. O detalhamento estruturado só vem na resposta imediata. */
export function fromPolledRun(run) {
  const failed = run?.status === "FAILED" || run?.status === "BLOCKED" || run?.status === "CANCELLED";
  return {
    runId: run?.id || null,
    status: run?.status || "COMPLETED",
    answer: (failed ? run?.message : run?.outputSummary) || run?.outputSummary || run?.message || "",
    sources: Array.isArray(run?.sources) ? run.sources : [],
    structured: null,
    proposals: [],
    snapshotAt: run?.snapshotAt || run?.finishedAt || null,
    fromPolling: true,
  };
}

function timeoutError() {
  const err = new Error("A NAY ainda está trabalhando nesta consulta.");
  err.code = "NAY_RUN_TIMEOUT";
  return err;
}

/** Consulta o run até um estado final. Passando de `maxAttempts`, lança o erro de consulta ainda em andamento. */
export async function pollRun(runId, { getRun, sleep = defaultSleep, maxAttempts = POLL_MAX_ATTEMPTS, delayMs = POLL_DELAY_MS }) {
  for (let attempt = 1; attempt <= maxAttempts; attempt += 1) {
    await sleep(delayMs);
    const run = await getRun(runId);
    if (run && FINAL_STATUSES.includes(run.status)) return run;
  }
  throw timeoutError();
}

/** Executa o pedido: 200 devolve a resposta; 202 acompanha o run. `deps`: { createRun, getRun, sleep, maxAttempts, delayMs }. */
export async function executeNayRun(body, deps) {
  const first = await deps.createRun(body);
  const data = first?.data || null;
  const pending = first?.httpStatus === 202 || data?.status === "RUNNING";
  if (!pending) return fromRunResponse(data);
  if (!data?.runId) throw timeoutError();
  return fromPolledRun(await pollRun(data.runId, deps));
}
