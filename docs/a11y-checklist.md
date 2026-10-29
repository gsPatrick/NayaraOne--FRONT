# Checklist de acessibilidade (M9-D851)

Revisão manual das telas-chave (`e2e/a11y-pages.json`): `/entrar`, `/painel`, `/painel/pessoas`, `/painel/pessoas/novo`. O axe e os testes de teclado, foco, rótulos, contraste e mensagens rodam no CI (`npm run test:unit`, `npm run test:a11y`); esta lista cobre o que só uma pessoa confere (teclado de verdade e leitor de tela).

Padrão de referência: WCAG 2.1 AA. Foco: contorno de 2 px (token `--focus-ring`) com contraste mínimo 3:1. Texto normal: 4,5:1; texto grande e componentes: 3:1.

## Como executar (Claude Browser, usuário de teste "QA-M9"; parar se pedir MFA)
1. Abrir a tela só com o teclado (não usar o mouse). Percorrer com Tab e Shift+Tab até o fim da página.
2. Ligar o leitor de tela (VoiceOver no macOS) e repetir o percurso, ouvindo o nome de cada controle.

## Teclado
- [ ] Todo controle é alcançável com Tab, na ordem em que aparece na tela.
- [ ] Enter e Espaço ativam botões e linhas clicáveis; Esc fecha modal e menu.
- [ ] Nenhuma armadilha de foco: dá para sair de qualquer região só com o teclado.
- [ ] Modal aberto: o foco fica dentro dele, Esc fecha e o foco volta ao botão que abriu.
- [ ] O foco visível (contorno de 2 px) aparece em todo elemento, inclusive sobre a barra lateral escura do tema Onyx.
- [ ] Os atalhos (Ctrl/Cmd+K) não atrapalham o leitor de tela.

## Rótulos e leitor de tela
- [ ] Todo campo é lido com o seu rótulo; botão só com ícone é lido com o nome da ação.
- [ ] Erro de campo é lido junto do campo (aria-describedby) e o resumo no topo recebe o foco.
- [ ] A página tem região principal (`main`) e navegação (`nav`); a tabela lê o cabeçalho de cada coluna.
- [ ] Estado de carregamento ("Carregando...") e de sucesso são anunciados sem tirar o foco.
- [ ] Imagem informativa tem texto alternativo; decorativa é ignorada.

## Cor e mensagens
- [ ] Nenhum estado depende só da cor (o status tem texto ou ícone com texto).
- [ ] Mensagens de erro dizem o que houve e o que fazer, em português simples, sem código solto.

## Registro da revisão
| Data | Responsável | Telas | Resultado |
|---|---|---|---|
| (a preencher na execução) | (nome) | (telas) | (achados) |

Situação no Marco 9: a lista existe; a execução manual (teclado e leitor de tela) está pendente do roteiro acima e não foi registrada nesta rodada.
