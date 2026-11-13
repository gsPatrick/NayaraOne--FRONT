"use client";

// Seção "Mensagens recebidas": as mensagens que o cliente mandou na oportunidade escolhida, cada uma com o botão "Resumo da NAY".
import Badge from "@/components/atoms/Badge/Badge";
import Button from "@/components/atoms/Button/Button";
import Card from "@/components/molecules/Card/Card";
import AsyncState from "@/components/molecules/AsyncState/AsyncState";
import { useAsyncState } from "@/lib/asyncState/useAsyncState";
import { listMessages } from "@/lib/api/crm";
import { formatDateTime } from "@/lib/format";
import NayAnswer from "./NayAnswer";
import ResumoMensagem from "./ResumoMensagem";
import { useNayRun } from "./useNayRun";
import { TASKS, channelLabel } from "./nayComercial.format.js";
import styles from "./page.module.css";

const NOT_FOUND = "Mensagem não encontrada na sua carteira.";

function MensagemItem({ message }) {
  const nay = useNayRun({ notFound: NOT_FOUND });
  return (
    <li className={styles.row}>
      <div className={styles.rowTop}>
        <div>
          <p className={styles.rowTitle}>{`Recebida em ${formatDateTime(message.createdAt)}`}</p>
          <Badge tone="neutral">{channelLabel(message.channel)}</Badge>
        </div>
        <Button size="sm" variant="secondary" loading={nay.status === "loading"} onClick={() => nay.run(TASKS.MESSAGE, { messageId: message.id })}>
          Resumo da NAY
        </Button>
      </div>
      <p className={styles.rowText}>{message.body || "Mensagem sem texto."}</p>
      <NayAnswer state={nay} title="Resumo da NAY">
        {(result) => <ResumoMensagem data={result.structured} />}
      </NayAnswer>
    </li>
  );
}

export default function MensagensSection({ opportunityId }) {
  const query = useAsyncState(
    async () => (await listMessages({ opportunityId })).filter((m) => String(m.direction || "").toUpperCase() === "INBOUND"),
    { deps: [opportunityId], enabled: Boolean(opportunityId) }
  );

  return (
    <Card title="Mensagens recebidas" subtitle="Mensagens que o cliente mandou nesta oportunidade. O resumo da NAY é só apoio.">
      {!opportunityId ? (
        <p className={styles.empty}>Escolha uma oportunidade acima para ver as mensagens recebidas.</p>
      ) : (
        <AsyncState result={query} loadingLabel="Carregando mensagens..." emptyTitle="Nenhuma mensagem recebida nesta oportunidade.">
          {(messages) => <ul className={styles.list}>{(messages || []).map((m) => <MensagemItem key={m.id} message={m} />)}</ul>}
        </AsyncState>
      )}
    </Card>
  );
}
