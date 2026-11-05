# Resultado do fluxo do Marco 8 na tela

Segunda passagem, 22/10/2026, em `http://localhost:3000`, depois das correções. Caso `14f7319b-06af-47b3-b1b4-baf50706c29a`.

## O que fechou

- Login e menu Correspondente → Financiamentos.
- Criar o caso abre a ficha direto.
- A lista mostra 25 casos e o botão "Mostrar mais".
- Incluir RG/CPF muda o status para Aguardando documentos.
- O valor `150000,50` permanece no campo. A simulação gravou R$ 150.000,50 e parcela R$ 1.824,91.
- Valor negativo é recusado e o campo esvazia.
- Upload de `rg-qa.pdf`, aviso de arquivo pequeno, botão Validar documento. Depois da validação o status ficou Pronto para enviar.
- O envio exige a autorização do cliente. Com ela marcada, o provider sandbox devolveu Enviado e o caso ficou Enviado ao provider. Enviar de novo não criou uma segunda linha.
- Avaliação solicitada e concluída, sem alterar o preço do imóvel.
- Comissão de R$ 2.250,01: Prevista → A receber → Recebida.
- NFS-e de R$ 2.250,01 apareceu em Fiscal como Enviada ao emissor.
- Batch DIMOB de 2026 foi gerado pela tela.
- No celular, Mais abre os módulos, inclusive Correspondente · Financiamentos.

## Ciclo seguinte, mesma tarde

O caso `14f7319b-06af-47b3-b1b4-baf50706c29a` foi reaberto depois das correções abaixo. A segunda leitura, com a página recarregada, manteve: status Enviado ao provider, um único envio sandbox, checklist validado, simulação de 120 meses, avaliação R$ 145.500,48, comissão recebida e a comissão de R$ 15,00 estornada.

Também conferi de novo, sem achar outro defeito: a data da NFS-e (22/10/2026 às 13:46), o DIMOB 2026 versão 1 com data de geração, a consulta de status da nota (passou a Autorizada), a lista com "Mostrar mais (390 restantes)" e o menu Mais.

Os prints estão em `public/marco8-prints/` e embutidos em `public/marco8.html`, seção 9, figuras F01 a F10, no mesmo formato do Marco 7.

## Ciclo do caso com imóvel e co-proponente

Caso `1bcaabe1-dfd4-47ed-afc5-6bd8f86bf5e2`, criado com imóvel, proponente principal e co-proponente. A lista mostrou os três. O valor acima do teto foi recusado e as simulações anteriores ficaram. Duas simulações do mesmo valor, 120 e 360 meses, marcaram Menor parcela na de parcela menor. O envio passou a Enviado ao provider em cerca de 7 segundos, sem recarregar a página. A configuração de integrações mostra o modo Sandbox e o segredo do webhook sem expor o valor. A aba de reconciliações não tem divergência aberta.

## Correções desta rodada

- Campos de valor da ficha guardavam o evento inteiro e mostravam `[object Object]`.
- Não havia validação humana, consentimento nem botão Receber.
- Confirmar e estornar pediam `window.prompt`. Agora são formulários na tela.
- A mensagem de checklist mostrava o código `RG_CPF`.
- O status não saía de Rascunho ao abrir o checklist, e a lista só traduzia Rascunho.
- A lista despejava centenas de linhas.
- No celular, Mais ia para a página de marcos e o Correspondente sumia.
- O cartão do Marco 8 na página de marcos dizia Planejado. Passou a Em homologação.
- A NFS-e e o DIMOB mostravam "Data não informada" porque a tela lia só `createdAt` e a API manda `created_at`.
- A avaliação concluía sem valor quando a tela não mandava o valor da última simulação.
- O aviso de casos parados repetia a mesma frase três vezes. Agora junta os motivos diferentes.
- O teto da simulação aparecia como `R$ 999999999.99` e `R$ 2000000.00`. Agora sai `R$ 999.999.999,99` e `R$ 2.000.000,00`, com o provider escrito Sandbox.

## Ciclo das regras que ainda não tinham sido clicadas

No caso `1bcaabe1-dfd4-47ed-afc5-6bd8f86bf5e2`, enviar de novo deixou um único identificador sandbox. A avaliação concluiu em R$ 178.200,00 e o imóvel `HTTPQA-PAG-179251880475284158` continuou sem oferta.

O caso manual `6abf4bdf-e74b-409c-8356-10cb0b836a7c` recusou a simulação e a avaliação com texto de negócio: a proposta e a avaliação precisam ser levantadas com o banco. Nenhuma linha foi gravada.

O batch DIMOB 2026 versão 1 foi fechado. Gerar de novo o mesmo ano criou a versão 2 em rascunho e manteve a versão 1 fechada, com o mesmo hash, porque o conjunto de dados não mudou.

O prompt para continuar sem parar está em `e2e/achados/PROMPT_AGENTE_FLUXO8.md`.

## Duplicata no mesmo dia

Caso `13cf631c-1535-49d8-a54b-a48dcf1ae8e9`, mesmo proponente e mesmo imóvel do caso `1bcaabe1-dfd4-47ed-afc5-6bd8f86bf5e2`, criado hoje. A criação não foi bloqueada. A lista e a ficha mostram Possível duplicata. Incluir RG/CPF mudou o status para Aguardando documentos, e o envio sem validar respondeu: falta a validação humana de 1 documento obrigatório (RG/CPF).

A coluna de status da lista cortava o aviso em "Possi...". A coluna passou a ter largura suficiente e o texto inteiro aparece. A ficha não mostrava o aviso; agora mostra ao lado do status.

## Ciclo 1 de 22/10, tarde

A lista em tela estreita cortava nome, imóvel, provider e a data, e o botão Ver ficava fora da área visível. As colunas passaram a ter largura fixa com rolagem, e Ver fica preso na borda. A data `22/10/2026 às 14:53` e o código do imóvel aparecem inteiros.

O mesmo contato como principal e co-proponente foi recusado com "O mesmo contato não pode ser proponente duas vezes no mesmo caso." Nenhum caso novo foi criado. A busca sem seleção dizia que o nome seria salvo como texto. Agora pede para selecionar um contato cadastrado.

O caso manual `6abf4bdf-e74b-409c-8356-10cb0b836a7c` não conseguia ser registrado sem simulação, e o rótulo de envio dizia que tinha ido ao provider. Com o checklist RG/CPF validado e o consentimento marcado, o registro passou a "Aguardando ação manual no banco", com um único identificador `manual-financing:…:v0`. Registrar de novo não criou outra linha. Nenhuma simulação foi gravada. Comissão com valor-base 0 foi recusada com "Informe um valor-base maior que zero." e nenhuma linha foi criada.

## Ciclo 2

A tela de criação não perguntava a finalidade, então todo caso nascia residencial mesmo quando a regra de elegibilidade distingue Residencial e Comercial. O formulário agora tem a finalidade, com Residencial como padrão. O caso `cb3b2419-1494-4bee-9109-9c8f83ea9efc` foi criado como Comercial e a ficha mostra Comercial. O caso manual antigo continua Residencial.

## Ciclos 3, 4 e 5

Fiscal: a NFS-e de R$ 2.250,01 segue Autorizada, com data 22/10/2026 às 13:46. O DIMOB 2026 versão 2 está em rascunho e a versão 1 fechada, com o mesmo hash. A aba de reconciliações não tem linha e o texto diz que não há divergência registrada.

A simulação comercial de R$ 100.000,50 em 360 meses gravou taxa 1,2% e parcela R$ 1.216,61. A lista mostra o caso novo em Rascunho, a data inteira, o aviso de duplicata e o status "Aguardando ação manual no banco" no caso manual. O caso sandbox `1bcaabe1-dfd4-47ed-afc5-6bd8f86bf5e2` continua Enviado ao provider, com um único identificador e a finalidade Residencial. Esses três ciclos não acharam defeito novo.
