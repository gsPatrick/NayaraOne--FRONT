"use client";

// Seção "Oportunidade": o corretor escolhe uma oportunidade da carteira e pede à NAY um resumo, a próxima ação, os imóveis do Radar, a
// classificação do cadastro, um rascunho de recuperação ou a preparação do envio de mensagem. Nada aqui grava ou envia.
import { useState } from "react";
import Button from "@/components/atoms/Button/Button";
import Select from "@/components/atoms/Select/Select";
import Card from "@/components/molecules/Card/Card";
import FormField from "@/components/molecules/FormField/FormField";
import NayAnswer from "./NayAnswer";
import DetalhesOportunidade from "./DetalhesOportunidade";
import ClassificacaoCadastro from "./ClassificacaoCadastro";
import { useNayRun } from "./useNayRun";
import { OPPORTUNITY_CAPABILITIES, SEND_CHANNELS, TASKS, channelLabel } from "./nayComercial.format.js";
import styles from "./page.module.css";

export default function OportunidadeSection({ opportunities, opportunityId, onSelect, opportunityLabel }) {
  const nay = useNayRun();
  const [channel, setChannel] = useState("WHATSAPP");
  const busy = nay.status === "loading";

  function choose(id) {
    nay.reset();
    onSelect(id);
  }

  return (
    <>
      <Card title="Oportunidade" subtitle="Escolha uma oportunidade da sua carteira e peça à NAY. Ela só resume e sugere: não cria, não altera, não envia e não publica nada.">
        <div className={styles.toolbar}>
          <FormField label="Oportunidade" htmlFor="nay-opportunity" className={styles.field}>
            <Select id="nay-opportunity" value={opportunityId} onChange={(e) => choose(e.target.value)}>
              <option value="">Selecionar…</option>
              {opportunities.map((o) => <option key={o.id} value={o.id}>{opportunityLabel(o)}</option>)}
            </Select>
          </FormField>
        </div>
        {opportunities.length === 0 ? <p className={styles.empty}>Nenhuma oportunidade na sua carteira por enquanto.</p> : null}
        <div className={styles.actions} role="group" aria-label="Pedidos à NAY sobre a oportunidade">
          {OPPORTUNITY_CAPABILITIES.filter((c) => c.id !== TASKS.SEND).map((cap) => (
            <Button key={cap.id} size="sm" variant="secondary" disabled={!opportunityId || busy} onClick={() => nay.run(cap.id, { opportunityId })}>
              {cap.label}
            </Button>
          ))}
        </div>
        <div className={styles.sendRow}>
          <FormField label="Canal da mensagem" htmlFor="nay-channel" className={styles.channel}>
            <Select id="nay-channel" value={channel} onChange={(e) => setChannel(e.target.value)}>
              {SEND_CHANNELS.map((c) => <option key={c} value={c}>{channelLabel(c)}</option>)}
            </Select>
          </FormField>
          <Button size="sm" variant="secondary" disabled={!opportunityId || busy} onClick={() => nay.run(TASKS.SEND, { opportunityId, channel })}>
            Preparar envio de mensagem
          </Button>
        </div>
        {!opportunityId ? <p className={styles.meta}>Escolha uma oportunidade para liberar os pedidos.</p> : null}
        <NayAnswer state={nay}>
          {(result) => <DetalhesOportunidade taskType={nay.taskType} structured={result.structured} />}
        </NayAnswer>
      </Card>
      {nay.status === "done" && nay.taskType === TASKS.QUALITY ? <ClassificacaoCadastro data={nay.result.structured} /> : null}
    </>
  );
}
