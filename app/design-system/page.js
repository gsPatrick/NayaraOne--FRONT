"use client";

import { useState } from "react";
import BrandMark from "@/components/atoms/BrandMark/BrandMark";
import Button from "@/components/atoms/Button/Button";
import Input from "@/components/atoms/Input/Input";
import Badge from "@/components/atoms/Badge/Badge";
import Checkbox from "@/components/atoms/Checkbox/Checkbox";
import Radio from "@/components/atoms/Radio/Radio";
import Select from "@/components/atoms/Select/Select";
import Avatar from "@/components/atoms/Avatar/Avatar";
import Spinner from "@/components/atoms/Spinner/Spinner";
import Tooltip from "@/components/atoms/Tooltip/Tooltip";
import Divider from "@/components/atoms/Divider/Divider";
import Icon from "@/components/atoms/Icon/Icon";

import FormField from "@/components/molecules/FormField/FormField";
import Card from "@/components/molecules/Card/Card";
import Tabs from "@/components/molecules/Tabs/Tabs";
import Alert from "@/components/molecules/Alert/Alert";
import Pagination from "@/components/molecules/Pagination/Pagination";
import Breadcrumb from "@/components/molecules/Breadcrumb/Breadcrumb";
import StatTile from "@/components/molecules/StatTile/StatTile";
import SearchInput from "@/components/molecules/SearchInput/SearchInput";
import DropdownMenu from "@/components/molecules/DropdownMenu/DropdownMenu";
import TagGroup from "@/components/molecules/TagGroup/TagGroup";

import NavBar from "@/components/organisms/NavBar/NavBar";
import Sidebar from "@/components/organisms/Sidebar/Sidebar";
import Modal from "@/components/organisms/Modal/Modal";
import Table from "@/components/organisms/Table/Table";
import Toast from "@/components/organisms/Toast/Toast";
import Footer from "@/components/organisms/Footer/Footer";

import styles from "./page.module.css";

const NAV = [
  { id: "foundation", label: "Fundação" },
  { id: "brand", label: "Marca" },
  { id: "buttons", label: "Botões" },
  { id: "forms", label: "Formulários" },
  { id: "status", label: "Badges & Status" },
  { id: "surfaces", label: "Cards & Superfícies" },
  { id: "navigation", label: "Navegação" },
  { id: "feedback", label: "Feedback" },
  { id: "data", label: "Dados" },
  { id: "applied", label: "Tipografia aplicada" },
];

const COLOR_TOKENS = [
  { name: "--color-brand", value: "#BE9130", label: "Brand / Dourado" },
  { name: "--color-brand-hover", value: "#A97D28", label: "Brand Hover" },
  { name: "--color-brand-active", value: "#8A6620", label: "Brand Active / Dourado escuro" },
  { name: "--color-accent", value: "#17130F", label: "Accent / Preto quente" },
  { name: "--color-canvas", value: "#ffffff", label: "Canvas (branco)" },
  { name: "--color-canvas-sunken", value: "#F7F5F1", label: "Canvas Sunken" },
  { name: "--color-ink", value: "#17130F", label: "Ink" },
  { name: "--color-ink-soft", value: "#4A4033", label: "Ink Soft" },
  { name: "--color-ink-muted", value: "#8C7F68", label: "Ink Muted" },
  { name: "--color-border", value: "#EAE6DE", label: "Border" },
];

const SEMANTIC_TOKENS = [
  { name: "--color-success", value: "#1E7A4C", label: "Sucesso" },
  { name: "--color-warning", value: "#B8790C", label: "Atenção" },
  { name: "--color-danger", value: "#C0392B", label: "Erro" },
  { name: "--color-info", value: "#2563A6", label: "Informação" },
];

const TYPE_SCALE = [
  { tag: "H1", cls: "var(--text-h1)", sample: "Gestão imobiliária, sem fricção" },
  { tag: "H2", cls: "var(--text-h2)", sample: "Contratos e obras em um só lugar" },
  { tag: "H3", cls: "var(--text-h3)", sample: "Painel financeiro consolidado" },
  { tag: "H4", cls: "var(--text-h4)", sample: "Detalhes do empreendimento" },
  { tag: "H5", cls: "var(--text-h5)", sample: "Unidades disponíveis" },
  { tag: "H6", cls: "var(--text-h6)", sample: "Resumo da unidade" },
];

const SPACING_TOKENS = ["1", "2", "3", "4", "5", "6", "8", "10", "12", "16", "20", "24"];

const PROPERTY_ROWS = [
  { id: 1, name: "Edifício Aurora — Apto 302", type: "Residencial", owner: "Marina Costa", status: "Ativo" },
  { id: 2, name: "Galpão Industrial Zona Sul", type: "Comercial", owner: "Construtora Vale", status: "Em Análise" },
  { id: 3, name: "Casa Jardim das Palmeiras", type: "Residencial", owner: "Ricardo Alves", status: "Vencido" },
  { id: 4, name: "Sala Comercial Centro, 405", type: "Comercial", owner: "Beatriz Nunes", status: "Pendente" },
  { id: 5, name: "Terreno Loteamento Vista Verde", type: "Terreno", owner: "Fernando Lima", status: "Ativo" },
];

const STATUS_TONE = {
  Ativo: "success",
  Pendente: "warning",
  Vencido: "danger",
  "Em Análise": "info",
};

export default function DesignSystemPage() {
  const [modalOpen, setModalOpen] = useState(false);
  const [toastVisible, setToastVisible] = useState(false);
  const [page, setPage] = useState(2);
  const [tags, setTags] = useState(["Financiamento", "Praia", "Alto padrão"]);

  return (
    <>
      <NavBar active="Painel" />
      <div className={styles.shell}>
        <aside className={styles.index}>
          <p className={styles.indexTitle}>Design System</p>
          <ul className={styles.indexList}>
            {NAV.map((item) => (
              <li key={item.id}>
                <a href={`#${item.id}`} className={styles.indexLink}>
                  {item.label}
                </a>
              </li>
            ))}
          </ul>
        </aside>

        <main className={styles.main}>
          <header className={styles.hero}>
            <span className={styles.eyebrow}>Fundação visual</span>
            <h1 className={styles.h1}>Nayara One Design System</h1>
            <p className={styles.lead}>
              Tokens, primitivas e componentes que sustentam o ERP de gestão imobiliária e construção civil
              da Nayara — herdando a identidade terracota-vinho da Nayara Imóveis, traduzida para um produto
              de software sério e moderno.
            </p>
          </header>

          {/* 1. FOUNDATION */}
          <section id="foundation" className={styles.section}>
            <h2 className={styles.h2}>1. Fundação</h2>

            <h3 className={styles.h3}>Paleta de marca</h3>
            <div className={styles.swatchGrid}>
              {COLOR_TOKENS.map((t) => (
                <div className={styles.swatch} key={t.name}>
                  <span className={styles.swatchColor} style={{ background: t.value }} />
                  <div>
                    <p className={styles.swatchName}>{t.name}</p>
                    <p className={styles.swatchValue}>{t.label} · {t.value}</p>
                  </div>
                </div>
              ))}
            </div>

            <h3 className={styles.h3}>Paleta semântica (status de negócio)</h3>
            <div className={styles.swatchGrid}>
              {SEMANTIC_TOKENS.map((t) => (
                <div className={styles.swatch} key={t.name}>
                  <span className={styles.swatchColor} style={{ background: t.value }} />
                  <div>
                    <p className={styles.swatchName}>{t.name}</p>
                    <p className={styles.swatchValue}>{t.label} · {t.value}</p>
                  </div>
                </div>
              ))}
            </div>

            <h3 className={styles.h3}>Escala tipográfica</h3>
            <div className={styles.typeScale}>
              {TYPE_SCALE.map((t) => (
                <div className={styles.typeRow} key={t.tag}>
                  <span className={styles.typeTag}>{t.tag}</span>
                  <p className={styles.typeSample} style={{ fontSize: t.cls }}>{t.sample}</p>
                </div>
              ))}
              <div className={styles.typeRow}>
                <span className={styles.typeTag}>Body</span>
                <p className={styles.typeSample} style={{ fontSize: "var(--text-body)", fontWeight: 400 }}>
                  Texto de corpo para tabelas, formulários e conteúdo operacional do sistema.
                </p>
              </div>
              <div className={styles.typeRow}>
                <span className={styles.typeTag}>Caption</span>
                <p className={styles.typeSample} style={{ fontSize: "var(--text-caption)", fontWeight: 500, color: "var(--color-ink-muted)" }}>
                  Metadados, rótulos e legendas auxiliares.
                </p>
              </div>
            </div>

            <h3 className={styles.h3}>Escala de espaçamento</h3>
            <div className={styles.spacingRow}>
              {SPACING_TOKENS.map((s) => (
                <div className={styles.spacingItem} key={s}>
                  <span className={styles.spacingBar} style={{ width: `var(--space-${s})` }} />
                  <span className={styles.spacingLabel}>--space-{s}</span>
                </div>
              ))}
            </div>

            <h3 className={styles.h3}>Breakpoints & Motion</h3>
            <div className={styles.tokenPairs}>
              <span>--bp-sm: 375px</span>
              <span>--bp-md: 1024px</span>
              <span>--bp-lg: 1440px</span>
              <span>--ease-out-expo: cubic-bezier(0.16, 1, 0.3, 1)</span>
              <span>--duration-fast: 120ms</span>
              <span>--duration-base: 200ms</span>
              <span>--duration-slow: 360ms</span>
            </div>
          </section>

          {/* 2. BRAND */}
          <section id="brand" className={styles.section}>
            <h2 className={styles.h2}>2. Marca</h2>
            <p className={styles.sectionCopy}>
              Símbolo geométrico da casinha — telhado, corpo e porta em negativo — sem wordmark, em três molduras
              e dois tons.
            </p>
            <div className={styles.brandGrid}>
              <div className={styles.brandCell}><BrandMark size="sm" tone="dark" shape="none" /><span>sm · sem moldura</span></div>
              <div className={styles.brandCell}><BrandMark size="md" tone="dark" shape="none" /><span>md · sem moldura</span></div>
              <div className={styles.brandCell}><BrandMark size="lg" tone="dark" shape="none" /><span>lg · sem moldura</span></div>
              <div className={styles.brandCell}><BrandMark size="lg" tone="dark" shape="square" /><span>quadrada</span></div>
              <div className={styles.brandCell}><BrandMark size="lg" tone="dark" shape="circle" /><span>redonda</span></div>
              <div className={[styles.brandCell, styles.brandCellDark].join(" ")}>
                <BrandMark size="lg" tone="light" shape="none" /><span>sem moldura · sobre vinho</span>
              </div>
              <div className={[styles.brandCell, styles.brandCellDark].join(" ")}>
                <BrandMark size="lg" tone="light" shape="square" /><span>quadrada · sobre vinho</span>
              </div>
              <div className={[styles.brandCell, styles.brandCellDark].join(" ")}>
                <BrandMark size="lg" tone="light" shape="circle" /><span>redonda · sobre vinho</span>
              </div>
            </div>
          </section>

          {/* 3. BUTTONS */}
          <section id="buttons" className={styles.section}>
            <h2 className={styles.h2}>3. Botões</h2>
            <h3 className={styles.h3}>Variantes</h3>
            <div className={styles.row}>
              <Button variant="primary">Primário</Button>
              <Button variant="secondary">Secundário</Button>
              <Button variant="ghost">Ghost</Button>
              <Button variant="danger">Perigo</Button>
            </div>
            <h3 className={styles.h3}>Tamanhos</h3>
            <div className={styles.row}>
              <Button size="sm">Pequeno</Button>
              <Button size="md">Médio</Button>
              <Button size="lg">Grande</Button>
            </div>
            <h3 className={styles.h3}>Estados</h3>
            <div className={styles.row}>
              <Button>Padrão</Button>
              <Button disabled>Desabilitado</Button>
              <Button loading>Carregando</Button>
            </div>
          </section>

          {/* 4. FORMS */}
          <section id="forms" className={styles.section}>
            <h2 className={styles.h2}>4. Formulários</h2>
            <div className={styles.formGrid}>
              <FormField label="Nome do imóvel" helper="Como aparece nos contratos" htmlFor="f-name">
                <Input id="f-name" placeholder="Edifício Aurora, Apto 302" />
              </FormField>
              <FormField label="Valor de venda" htmlFor="f-value" required>
                <Input id="f-value" type="number" placeholder="0,00" />
              </FormField>
              <FormField label="CEP inválido" htmlFor="f-error" error="Informe um CEP válido">
                <Input id="f-error" error defaultValue="00000-00" />
              </FormField>
              <FormField label="Campo bloqueado" htmlFor="f-disabled">
                <Input id="f-disabled" disabled defaultValue="Somente leitura" />
              </FormField>
              <FormField label="Tipo de imóvel" htmlFor="f-select">
                <Select id="f-select" defaultValue="residencial">
                  <option value="residencial">Residencial</option>
                  <option value="comercial">Comercial</option>
                  <option value="terreno">Terreno</option>
                </Select>
              </FormField>
              <FormField label="Observações" htmlFor="f-textarea">
                <textarea id="f-textarea" className={styles.textarea} rows={3} placeholder="Detalhes adicionais..." />
              </FormField>
            </div>
            <div className={styles.row}>
              <Checkbox id="c1" label="Aceitar termos de locação" defaultChecked />
              <Checkbox id="c2" label="Notificar corretor" />
              <Radio name="r" id="r1" label="Pessoa física" defaultChecked />
              <Radio name="r" id="r2" label="Pessoa jurídica" />
            </div>
          </section>

          {/* 5. STATUS */}
          <section id="status" className={styles.section}>
            <h2 className={styles.h2}>5. Badges, Tags & Status</h2>
            <p className={styles.sectionCopy}>
              Status de negócio usam a paleta semântica separada — o dourado é reservado para marca e ação primária.
            </p>
            <div className={styles.row}>
              <Badge tone="success">Ativo</Badge>
              <Badge tone="warning">Pendente</Badge>
              <Badge tone="danger">Vencido</Badge>
              <Badge tone="info">Em Análise</Badge>
              <Badge tone="brand">Plano Premium</Badge>
              <Badge tone="neutral">Arquivado</Badge>
            </div>
            <h3 className={styles.h3}>Tags removíveis</h3>
            <TagGroup tags={tags} onRemove={(t) => setTags((prev) => prev.filter((x) => x !== t))} />
          </section>

          {/* 6. SURFACES */}
          <section id="surfaces" className={styles.section}>
            <h2 className={styles.h2}>6. Cards & Superfícies</h2>
            <div className={styles.statGrid}>
              <StatTile label="Imóveis Ativos" value="248" delta="+12 este mês" tone="success" icon="building" />
              <StatTile label="Contratos Vencendo" value="7" delta="atenção" tone="danger" icon="document" />
              <StatTile label="Receita do Mês" value="R$ 482.900" delta="+8,4%" tone="success" icon="chart" />
              <StatTile label="Novos Clientes" value="19" delta="estável" tone="neutral" icon="users" />
            </div>
            <div className={styles.cardGrid}>
              <Card title="Edifício Aurora" subtitle="Apto 302 · Zona Sul" actions={<Badge tone="success">Ativo</Badge>}>
                <p className={styles.cardBody}>
                  Unidade de 84m², 3 dormitórios, vaga de garagem. Contrato de locação vigente até 12/2026.
                </p>
              </Card>
              <Card title="Documentação pendente" subtitle="Contrato #4821" actions={<Badge tone="warning">Pendente</Badge>}>
                <p className={styles.cardBody}>Aguardando assinatura do fiador para liberação da chave.</p>
              </Card>
            </div>
          </section>

          {/* 7. NAVIGATION */}
          <section id="navigation" className={styles.section}>
            <h2 className={styles.h2}>7. Navegação</h2>
            <p className={styles.sectionCopy}>NavBar estrutural acima da página. Sidebar com seções colapsáveis:</p>
            <div className={styles.navDemo}>
              <Sidebar />
              <div className={styles.navDemoAside}>
                <Breadcrumb items={[{ label: "Painel", href: "#" }, { label: "Imóveis", href: "#" }, { label: "Edifício Aurora" }]} />
                <div className={styles.row}>
                  <SearchInput placeholder="Buscar imóveis, clientes..." />
                  <DropdownMenu
                    label="Ações"
                    items={[{ label: "Exportar CSV" }, { label: "Novo imóvel" }, { label: "Arquivar" }]}
                  />
                  <Tooltip label="Filtros avançados">
                    <button className={styles.iconGhost} aria-label="Filtros"><Icon name="filter" size={18} /></button>
                  </Tooltip>
                  <Avatar name="Renata Souza" />
                  <Spinner size="sm" />
                </div>
              </div>
            </div>
          </section>

          {/* 8. FEEDBACK */}
          <section id="feedback" className={styles.section}>
            <h2 className={styles.h2}>8. Feedback</h2>
            <h3 className={styles.h3}>Alertas</h3>
            <div className={styles.stack}>
              <Alert tone="info" title="Manutenção programada">O sistema ficará indisponível às 23h de domingo.</Alert>
              <Alert tone="success" title="Contrato assinado">Todas as partes concluíram a assinatura digital.</Alert>
              <Alert tone="warning" title="Documentos incompletos">3 imóveis estão sem certidão atualizada.</Alert>
              <Alert tone="danger" title="Pagamento recusado">A cobrança do boleto #9021 não foi processada.</Alert>
            </div>
            <h3 className={styles.h3}>Toast & Modal</h3>
            <div className={styles.row}>
              <Button onClick={() => setToastVisible(true)}>Disparar toast</Button>
              <Button variant="secondary" onClick={() => setModalOpen(true)}>Abrir modal</Button>
            </div>
            {toastVisible ? (
              <div className={styles.toastDemo}>
                <Toast
                  tone="success"
                  title="Imóvel cadastrado"
                  description="Edifício Aurora — Apto 302 foi adicionado com sucesso."
                  onClose={() => setToastVisible(false)}
                />
              </div>
            ) : null}
          </section>

          {/* 9. DATA */}
          <section id="data" className={styles.section}>
            <h2 className={styles.h2}>9. Dados</h2>
            <h3 className={styles.h3}>Tabela</h3>
            <Table
              columns={[
                { key: "name", label: "Imóvel" },
                { key: "type", label: "Tipo" },
                { key: "owner", label: "Proprietário" },
                {
                  key: "status",
                  label: "Status",
                  render: (row) => <Badge tone={STATUS_TONE[row.status]}>{row.status}</Badge>,
                },
              ]}
              rows={PROPERTY_ROWS}
            />
            <div className={styles.paginationRow}>
              <Pagination page={page} totalPages={6} onChange={setPage} />
            </div>
            <h3 className={styles.h3}>Estado vazio</h3>
            <Table columns={[{ key: "a", label: "Imóvel" }, { key: "b", label: "Status" }]} rows={[]} />
            <h3 className={styles.h3}>Carregando (skeleton)</h3>
            <Table columns={[{ key: "a", label: "Imóvel" }, { key: "b", label: "Tipo" }, { key: "c", label: "Status" }]} rows={[]} loading />
          </section>

          {/* 10. APPLIED */}
          <section id="applied" className={styles.section}>
            <h2 className={styles.h2}>10. Tipografia aplicada</h2>
            <Card padded={false} className={styles.applied}>
              <div className={styles.appliedMedia} aria-hidden="true" />
              <div className={styles.appliedBody}>
                <Badge tone="success">Ativo</Badge>
                <h3 className={styles.appliedTitle}>Edifício Aurora — Apto 302</h3>
                <p className={styles.appliedMeta}>Zona Sul, São Paulo · 84m² · 3 dormitórios · 1 vaga</p>
                <Divider />
                <p className={styles.appliedText}>
                  Unidade reformada em 2024, com acabamento em porcelanato e cozinha planejada. Condomínio com
                  portaria 24h, piscina e salão de festas. Documentação em dia, disponível para locação imediata.
                </p>
                <div className={styles.appliedFooter}>
                  <span className={styles.appliedPrice}>R$ 3.850<span>/mês</span></span>
                  <Button>Ver contrato</Button>
                </div>
              </div>
            </Card>
          </section>

          <Footer />
        </main>
      </div>

      <Modal
        open={modalOpen}
        onClose={() => setModalOpen(false)}
        title="Confirmar novo contrato"
        footer={
          <>
            <Button variant="secondary" onClick={() => setModalOpen(false)}>Cancelar</Button>
            <Button onClick={() => setModalOpen(false)}>Confirmar</Button>
          </>
        }
      >
        <p>
          Você está prestes a gerar um novo contrato de locação para o Edifício Aurora — Apto 302. Essa ação
          notificará o inquilino e o corretor responsável.
        </p>
      </Modal>
    </>
  );
}
