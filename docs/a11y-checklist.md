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
| 09/11/2026 | Patrick, com o VoiceOver | `/entrar`, `/painel`, `/painel/pessoas`, `/painel/pessoas/novo`, `/painel/papeis` e a paleta Ctrl/Cmd+K, no Front `0e75774` | Roteiro de 12 passos do leitor de tela: o Patrick informou que todos os 12 passos ficaram conforme o esperado. Nenhum achado informado. |

Situação no Marco 9: o roteiro de 12 passos do leitor de tela (VoiceOver) foi executado em 09/11/2026 no Front `0e75774`. A tabela passo a passo (ação, o que se espera ouvir e o resultado) está em `Maturacao/marco9-pagina/voiceover-roteiro-executado.md`. O resultado de cada passo é o que o Patrick informou para o conjunto ("todos os 12 passos conforme o esperado"): a resposta literal de cada passo não foi gravada. O passo do código MFA ficou de fora porque exige o código do Patrick.

Do `0e75774` ao `3c0e6a8` (Front entregue, branch `entrega/marco9`) nenhum arquivo dessas telas mudou: os 7 commits do intervalo alteram só `app/painel/configuracoes/biTecnologiaKpiGroups.js` (Configurações do BI), `public/marco9.html`, testes e este checklist. O `3c0e6a8` difere do `26bba9e` só neste arquivo (o registro acima, do commit `04d5195`). A execução vale, portanto, para o `3c0e6a8`.

Os itens da lista acima que os 12 passos não percorrem (contorno do foco sobre a barra lateral Onyx, texto alternativo de imagem, estado que depende só da cor e o texto das mensagens de erro fora do cadastro de contato) não entram neste registro. Eles seguem cobertos só pelas verificações automáticas (`npm run test:unit` e `npm run test:a11y`, com o axe).
