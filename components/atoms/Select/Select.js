import styles from "./Select.module.css";

export default function Select({ error = false, className = "", style, children, ...rest }) {
  // BUG REAL CORRIGIDO (achado pelo cliente, 05/10/2026): `style` (ex.: `style={{ flex: 2 }}`
  // pra posicionar o campo numa linha flex, mesmo padrão usado por Input/DecimalInput) entrava
  // em `...rest` e era aplicado no `<select>` INTERNO — que já é `width: 100%` dentro do
  // `.wrap` — nunca no `.wrap` em si, que é o elemento que de fato participa do layout flex do
  // pai. Resultado: `flex` nunca tinha efeito nenhum no tamanho real do campo, e o `.wrap`
  // ficava com o `flex: 0 1 auto` padrão (largura pelo conteúdo), roubando o espaço dos campos
  // vizinhos que tinham `flex` aplicado corretamente (ex.: Input/DecimalInput ao lado, que
  // colapsavam a poucos pixels). `style` agora vai pro `.wrap`, igual já acontecia com `className`.
  return (
    <div className={[styles.wrap, error ? styles.error : "", className].filter(Boolean).join(" ")} style={style}>
      <select className={styles.select} {...rest}>
        {children}
      </select>
      <svg className={styles.chevron} viewBox="0 0 12 8" aria-hidden="true">
        <path d="M1 1.5L6 6.5L11 1.5" fill="none" stroke="currentColor" strokeWidth="1.6" strokeLinecap="round" strokeLinejoin="round" />
      </svg>
    </div>
  );
}
