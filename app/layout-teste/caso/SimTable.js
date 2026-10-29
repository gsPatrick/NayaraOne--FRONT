import StatusChip from "../_components/StatusChip";
import { brl } from "../_components/format";
import { SIMULACOES } from "../_mock/caso";
import t from "../_components/Table.module.css";

export default function SimTable() {
  return (
    <div className={t.wrap}>
      <table className={t.table}>
        <caption style={{ position: "absolute", width: 1, height: 1, overflow: "hidden", clip: "rect(0 0 0 0)" }}>Simulações comparadas</caption>
        <thead><tr>
          <th scope="col">Banco</th><th scope="col" className={t.right}>Parcela</th><th scope="col" className={t.right}>Taxa</th><th scope="col" className={t.right}>CET</th><th scope="col" className={t.right}>Prazo</th><th scope="col">Situação</th>
        </tr></thead>
        <tbody>
          {SIMULACOES.map((x) => (
            <tr key={x.banco}>
              <td className={t.strong}>{x.banco}</td>
              <td className={t.right}>{brl(x.parcela)}</td>
              <td className={t.right}>{x.taxa}</td>
              <td className={t.right}>{x.cet}</td>
              <td className={t.right}>{x.prazo} meses</td>
              <td>{x.escolhida ? <StatusChip tone="brand">Escolhida</StatusChip> : <StatusChip>Alternativa</StatusChip>}</td>
            </tr>
          ))}
        </tbody>
      </table>
    </div>
  );
}
