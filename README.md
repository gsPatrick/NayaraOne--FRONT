# Nayara One — Front-end

Fundação visual (design system) do Nayara One, ERP de gestão imobiliária e
construção civil da Nayara. Página principal: `/design-system`.

## Stack

- Next.js 14 (App Router)
- JavaScript puro — sem TypeScript
- CSS Modules — sem Tailwind, sem bibliotecas de UI externas
- Atomic Design (atoms / molecules / organisms)

## Como rodar

```bash
npm install
npm run dev
```

Acesse `http://localhost:3000` — a rota raiz redireciona para `/design-system`.

Build de produção:

```bash
npm run build
npm run start
```

## Estrutura de pastas

```
/app
  layout.js
  globals.css              tokens de design (cor, tipografia, espaçamento, motion)
  page.js                  redireciona para /design-system
  /design-system
    page.js                showcase navegável de todos os componentes
    page.module.css
/components
  /atoms                   BrandMark, Button, Input, Badge, Checkbox, Radio,
                            Select, Avatar, Spinner, Tooltip, Divider, Icon
  /molecules                FormField, Card, Tabs, Alert, Pagination,
                            Breadcrumb, StatTile, SearchInput, DropdownMenu,
                            TagGroup
  /organisms                NavBar, Sidebar, Modal, Table, Toast, Footer
```

Cada componente vive em sua própria pasta com `Componente.js` +
`Componente.module.css`.

## Sobre a paleta de cores

A paleta (terracota-vinho `#8B3A30`, maroon escuro `#5C231D`, terracota clara
`#B85C42`, grafite `#181513`, off-white `#fdfcfa`) foi **aproximada visualmente
a partir de um screenshot** do site institucional existente da Nayara Imóveis
— não a partir do arquivo vetorial oficial da marca, que ainda não foi
recebido do cliente.

O símbolo do BrandMark (silhuetas triangulares sobrepostas + arco vazado) foi
recriado como primitivas geométricas em SVG, fiel ao espírito visual do logo
original, mas não é uma extração pixel-perfect.

**Pendente:** assim que o cliente fornecer o arquivo vetorial oficial da
marca (logo + guia de cores), os tokens de cor em `app/globals.css` e o
componente `BrandMark` devem ser ajustados para bater exatamente com a
identidade oficial.
