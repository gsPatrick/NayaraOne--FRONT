import StatusChip from "../_components/StatusChip";
import RowMenu from "../_components/RowMenu";
import { DOCS, SIT_TONE } from "../_mock/caso";
import t from "../_components/Table.module.css";

export default function DocChecklist() {
  return (
    <div className={t.wrap}>
      <table className={t.table}>
        <caption style={{ position: "absolute", width: 1, height: 1, overflow: "hidden", clip: "rect(0 0 0 0)" }}>Checklist de documentos</caption>
        <thead><tr>
          <th scope="col">Tipo</th><th scope="col">Arquivo / versão</th><th scope="col">Validade</th><th scope="col">Situação</th><th scope="col" style={{ width: 40 }}><span style={{ position: "absolute", width: 1, height: 1, overflow: "hidden", clip: "rect(0 0 0 0)" }}>Ação</span></th>
        </tr></thead>
        <tbody>
          {DOCS.map((d) => (
            <tr key={d.tipo}>
              <td className={t.strong}>{d.tipo}</td>
              <td><span className={t.rowLink} style={{ fontWeight: 500 }}>{d.arq}</span> <span className={t.sub} style={{ display: "inline" }}>{d.v}</span></td>
              <td className={t.num}>{d.validade}</td>
              <td><StatusChip tone={SIT_TONE[d.sit]}>{d.sit}</StatusChip></td>
              <td className={t.center}>
                <RowMenu label={`Ações de ${d.tipo}`} items={[{ label: "Visualizar" }, { label: "Enviar nova versão" }, { label: "Marcar como validado" }]} />
              </td>
            </tr>
          ))}
        </tbody>
      </table>
    </div>
  );
}
