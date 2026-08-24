# Plano de integração com a API real (branch `integracao-api`)

API de homologação: `https://homologacao-nayaraone--api.hpztyd.easypanel.host/api/v1`
Banco de homologação: migrado e com seed (`admin@nayaraone.dev` / `DevAdmin#2026`).

Regra geral: **nunca mudar layout/CSS**, só trocar a fonte dos dados (mock → API real).
Cada módulo só é considerado integrado depois de testado contra a API de homologação de
verdade (não só `npm run build` limpo).

## Fase 0 — Base (feita primeiro, sem tocar em módulo nenhum)
- `lib/api/client.js`: wrapper de fetch com `NEXT_PUBLIC_API_URL`, injeta `Authorization: Bearer`,
  entende o envelope `{success, data}` / `{success:false, error:{code,message}}`, trata 401
  tentando `POST /auth/refresh` uma vez antes de deslogar.
- `lib/api/auth.js`: `login(email, password, companyId?)`, `refresh()`, `logout()` — contrato
  exato confirmado em `src/features/auth/auth.service.js` da API: login retorna
  `{accessToken, refreshToken, sessionId, user:{id,name,email}, groupId, companyId, roles, permissions}`.
- Sessão real substitui `lib/mock/session.js` mantendo a mesma "forma" de dado usada pelas telas
  (id/name/email) pra não quebrar nenhum componente que já consome `getCurrentUser()`.
- Tokens em `localStorage` (não há suporte a cookie httpOnly no backend hoje — token em
  localStorage é a opção compatível sem mudar a API).
- `/entrar` passa a chamar login de verdade; erro de credencial mostra o mesmo estilo de alerta
  já usado no resto do sistema.
- Guarda de rota: páginas `/painel/**` exigem token válido, senão redireciona pra `/entrar`
  (mesma UX que já existe hoje, só troca a checagem mockada pela real).

## Fase 1 — Usuários & Empresas (primeiro módulo de dado real)
Só esse módulo tem dado de verdade no banco agora (seed criou 1 group/1 company/1 admin).
Troca `lib/mock/users.js` e `lib/mock/companies.js` por chamadas reais nas páginas
`/painel/usuarios` e `/painel/empresas`, mantendo o layout idêntico.

## Pré-requisito resolvido — permissões de Marco 4/5 no seed
O papel ADMIN do seed (`scripts/seed-dev.js` da API) só listava permissões dos Marcos 1 a 3, então
o usuário de teste tomava **403 em todas as rotas `/finance` e `/legal`**. O seed foi corrigido
(commit `fix(seed): concede permissoes de finance e legal ao papel ADMIN do seed`) e reexecutado
contra o banco de homologação — o admin agora tem 58 permissões.

## Fase 2 — Contatos (Pessoas) — CONCLUÍDA
Integradas `/painel/pessoas` (lista), `/painel/pessoas/novo` e `/painel/pessoas/[id]`, via
`lib/api/people.js` (+ `lib/api/properties.js` para o card "Imóveis vinculados").

Ações reais (não mais simuladas): criar contato (`POST /people`, com papéis/contatos/documentos/
endereço aninhados), excluir (`DELETE /people/:id`), **mesclar duplicatas** (`POST /people/:id/merge`
— antes era `setTimeout` client-side) e vincular imóveis ao criar (`POST /properties/:id/owners`).

Adicionado na API para servir o front:
- `listPersons`/`getPerson` passaram a incluir `roles` e `addresses` (a lista filtra por papel e a
  ficha mostra o endereço atual).
- `createPerson` aceita `roles` e `address`/`addresses` aninhados, na mesma transação.
- `GET /people/duplicates` — varredura de duplicatas reusando o critério de dedup já documentado
  (mesmo contato primário), substituindo o array estático `DUPLICATE_PAIRS` do mock.
- Correção: o controller mandava `type` e o service lia `personType`, então o filtro PF/PJ da
  listagem era silenciosamente ignorado.

Ficou de fora, com motivo:
- **Foto do contato** (`photoUrl` no formulário): `people.persons` não tem coluna de foto nem há
  módulo de arquivos/mídia de pessoa documentado na Maturação. O upload continua client-side e
  não é persistido. Depende de decisão de produto (onde armazenar arquivo).
- **Número do documento** (RG/CNH etc.): `person_documents` guarda `file_id` + metadados de
  verificação, não o número em coluna própria. A tela exibe o `file_id` como identificação.

## Fases seguintes (uma de cada vez)
3. Imóveis
4. CRM / Radar
5. Financeiro (Marco 4 completo)
6. Contratos / Locação / Jurídico (Marco 5 completo)

Cada fase: ler o `service.js`/`controller.js`/`routes.js` real do módulo na API antes de
integrar (mesma regra de ouro do backend — nunca supor nome de campo), trocar só a fonte de
dado da página (mock → fetch), testar contra a API de homologação, e só então seguir pra
próxima fase.
