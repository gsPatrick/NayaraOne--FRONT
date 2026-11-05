# Roteiro curto de VoiceOver (macOS) para o Patrick: cerca de 15 minutos

Este é o ÚNICO trecho da acessibilidade que fica fora do que foi medido por máquina (a11y-2026-11-05.md). Tudo o que dava para medir pela árvore de acessibilidade (nome de cada controle, regiões, cabeçalhos de tabela, `aria-live`, título e foco ao navegar) já foi medido com Playwright e passou. O que sobra é ouvir: só um leitor de tela de verdade confirma a fala, a ordem e o ritmo. Este arquivo NÃO preenche nem assina o "Registro da revisão" de `docs/a11y-checklist.md` e NÃO marca itens dele: quem executa e registra é o Patrick.

## Preparo (2 min)

1. Pilha local no ar (Front :3000, API :4001). Entrar com `admin@nayaraone.dev` (senha: `node Maturacao/marco9-pagina/captura/mostrar-credencial.js admin`; não copiar para arquivo nem mensagem). Usar o Safari (é o par natural do VoiceOver).
2. Ligar o VoiceOver: `Cmd+F5`. Tecla do VoiceOver (VO) = `Ctrl+Option`. Para desligar: `Cmd+F5` de novo.
3. Teclas úteis: `VO+seta direita/esquerda` (próximo/anterior), `Tab` (próximo controle), `VO+Espaço` (ativar), `VO+U` (rotor: cabeçalhos, links, campos, regiões), `Esc` (fecha diálogo).
4. Para o Safari andar com Tab por todos os controles: Safari > Ajustes > Avançado > "Pressionar Tab para destacar cada item" ligado (ou `Option+Tab`).
5. Anote o que ouvir de diferente do "Esperado". O texto esperado vem das árvores medidas (docs/evidencias/a11y-arvore-chromium-2026-11-05.json).

## Passos (cada um 1 a 2 min)

| # | Onde e o que fazer | O que deve ser dito (esperado) | Se diferente, anote |
|---|---|---|---|
| 1 | `/entrar`, logo ao abrir. `VO+U`, escolher "Regiões". | Há a região "principal" (main). Título da página lido: "Entrar, Nayara One". Cabeçalho nível 1: "Bem-vindo". | |
| 2 | Ainda em `/entrar`: `Tab` até "Sou da equipe" e `VO+Espaço`. | O foco passa ao primeiro campo do formulário e é lido com o rótulo ("E-mail" ou equivalente, campo de texto). Não deve ficar "nada focado". | |
| 3 | Entrar no sistema. Em `/painel`, `VO+U`, "Regiões". | Regiões: "Menu lateral" (navegação), "Navegação principal" só no celular, cabeçalho (banner) e "principal" (main). | |
| 4 | Ir a Contatos pelo menu lateral (`Tab` até o item e `VO+Espaço`). | Ao chegar, o VoiceOver anuncia "Contatos" (o foco vai ao título da tela, cabeçalho nível 1) e o título da aba é "Contatos, Nayara One". O item "Contatos" do menu é lido como "página atual". | |
| 5 | Em Contatos, durante o carregamento (recarregue com `Cmd+R`). | Ouve-se "Carregando contatos..." sem o foco sair de onde estava. | |
| 6 | Na tabela de contatos: `VO+seta` até uma linha. | Cada célula é lida com o cabeçalho da coluna (por exemplo "Nome", "Tipo"). Os botões de ícone são lidos: "Ver detalhes, botão" e "Editar, botão". | |
| 7 | `Novo contato` (botão no topo). Ao chegar em `/painel/pessoas/novo`. | Anuncia "Novo contato" (título). Título da aba: "Novo contato, Nayara One". | |
| 8 | No Novo contato, sem digitar nada: ir ao botão "Continuar" e `VO+Espaço`. | Anuncia o resumo: "Há 2 campos para corrigir. Nome ou razão social: Informe o nome completo da pessoa. CPF ou CNPJ: Informe o CPF, só com números." O foco fica no resumo. | |
| 9 | Do resumo, `Tab` até o campo "Nome / Razão social". | Lê o rótulo, "obrigatório", "inválido" e a mensagem "Informe o nome completo da pessoa.". Não deve aparecer "groupId", "companyId" nem "legalName" em momento algum. | |
| 10 | Preencher nome e CPF `123.456.789-09`, `Continuar` até o endereço; no endereço deixar vazio e `Continuar`. | Resumo com 5 itens (CEP, Logradouro, Bairro, Cidade, UF), cada campo lido como inválido com a sua mensagem. | |
| 11 | `/painel/papeis` (menu). Em um papel que não seja de sistema, `Excluir` (botão de ícone). | "Excluir, botão". Ao ativar: diálogo "Excluir papel" anunciado; `Tab` não sai dele; `Esc` fecha e o foco volta ao botão "Excluir" da linha. | |
| 12 | No mesmo diálogo, "Excluir papel". Como o admin de teste tem MFA (pilha local), abre "Verificação em duas etapas". | Diálogo anunciado; campo lido como "Código do aplicativo autenticador, campo de texto". Digitar `000000` e Enter: lê "Não foi possível verificar. Código MFA inválido." e o foco volta ao campo (campo inválido). `Esc` fecha só o diálogo de MFA. | |
| 13 | Ctrl+K (ou Cmd+K) em qualquer tela. | A paleta abre como diálogo, foco no campo "Busca"; `Esc` fecha e o foco volta onde estava. | |
| 14 | Desligar o VoiceOver (`Cmd+F5`). | Fim. | |

Preparo do passo 12 (o admin de teste vem sem MFA; a pilha local é descartável): `E2E_EMAIL=admin@nayaraone.dev E2E_PASSWORD=<senha> node scripts/a11yMfaLocal.js ligar` cadastra o MFA e guarda o segredo em `~/.nayara-a11y-totp`; a cada vez que o diálogo pedir o código, `node scripts/a11yMfaLocal.js codigo` imprime o de agora (vale 30 s). Para criar o papel de teste use `/painel/papeis/novo` com o nome "QA-M9 Papel Teste" (pede o código). Ao terminar: `E2E_EMAIL=... E2E_PASSWORD=... node scripts/a11yMfaLocal.js desligar` deixa a pilha como era. O script recusa qualquer API que não seja localhost.

## O que continua só do Patrick

- Ouvir a fala (itens 1 a 14 acima): a árvore de acessibilidade já está correta, o que não dá para medir por máquina é a voz, a ordem de leitura e o ritmo.
- Preencher e assinar o "Registro da revisão" do checklist e marcar os itens: não foi tocado.
- Conferir em Safari do macOS de verdade (o WebKit do Playwright é o motor, não o Safari com as suas configurações de teclado).
