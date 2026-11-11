"use client";

// Estado de uma consulta à NAY Comercial (ocioso, carregando, pronta, erro). Só a última consulta pedida atualiza a tela.
import { useCallback, useRef, useState } from "react";
import { createAiRun, getAiRun } from "@/lib/api/ai";
import { buildRunBody, nayErrorMessage } from "./nayComercial.format.js";
import { executeNayRun } from "./nayComercial.run.js";

const IDLE = { status: "idle", taskType: null, result: null, error: "" };

export function useNayRun({ notFound } = {}) {
  const [state, setState] = useState(IDLE);
  const seq = useRef(0);

  const run = useCallback(async (taskType, params) => {
    seq.current += 1;
    const mine = seq.current;
    setState({ status: "loading", taskType, result: null, error: "" });
    try {
      const result = await executeNayRun(buildRunBody(taskType, params), { createRun: createAiRun, getRun: getAiRun });
      if (mine === seq.current) setState({ status: "done", taskType, result, error: "" });
    } catch (err) {
      if (mine === seq.current) setState({ status: "error", taskType, result: null, error: nayErrorMessage(err, { notFound }) });
    }
  }, [notFound]);

  const reset = useCallback(() => {
    seq.current += 1;
    setState(IDLE);
  }, []);

  return { ...state, run, reset };
}
