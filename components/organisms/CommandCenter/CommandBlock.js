import Link from "next/link";
import CommandItem from "./CommandItem";
import styles from "./CommandCenter.module.css";

// M9-D685 — um dos seis blocos (as seis perguntas do livro). Bloco que depende de indicador ruim mostra "Conclusão adiada" e a razão, nunca itens (M9-D697).
export default function CommandBlock({ block, projects = {} }) {
  return (
    <section className={styles.block} data-command-block={block.key} data-deferred={block.deferred ? "true" : "false"} aria-labelledby={`bloco-${block.key}`}>
      <div className={styles.blockHead}>
        <h3 id={`bloco-${block.key}`} className={styles.blockTitle}>{block.title}</h3>
        <p className={styles.blockQuestion}>{block.question}</p>
      </div>
      {block.deferred ? (
        <div className={styles.deferred} role="status">
          <strong>{block.deferredText}</strong>
          <ul className={styles.deferredList}>
            {(block.reasons || []).map((r) => <li key={r.metricCode}>{r.metricCode}: {r.reason}</li>)}
          </ul>
        </div>
      ) : block.items.length ? (
        <ul className={styles.items}>{block.items.map((item) => <CommandItem key={item.id} item={item} projects={projects} />)}</ul>
      ) : (
        <p className={styles.empty}>Nada a mostrar neste bloco.</p>
      )}
      {block.hiddenText ? <p className={styles.hidden} data-command-hidden>{block.hiddenText}</p> : null}
      {block.viewAllHref ? <Link className={styles.link} href={block.viewAllHref}>Ver todos ({block.total})</Link> : null}
    </section>
  );
}
