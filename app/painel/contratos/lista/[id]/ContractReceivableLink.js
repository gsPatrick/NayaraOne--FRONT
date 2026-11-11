"use client";

import Link from "next/link";
import { receivableUrlForContract } from "@/lib/crm/journeyLinks";

// M3-25: contrato assinado ou ativo abre o novo recebível já ligado a ele (Financeiro); a comissão nasce depois desse recebimento.
const STATUSES_WITH_RECEIVABLE = ["SIGNED", "ACTIVE"];

export default function ContractReceivableLink({ contract }) {
  if (!contract || !STATUSES_WITH_RECEIVABLE.includes(contract.status)) return null;
  return <Link href={receivableUrlForContract(contract)} data-testid="contrato-lancar-recebivel">Lançar recebível deste contrato</Link>;
}
