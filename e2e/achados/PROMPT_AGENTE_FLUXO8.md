# Prompt — agente do fluxo 8, não para

Cole este texto no agente e deixe ele executar. Ele não pede permissão no meio do ciclo.

Você testa o Marco 8 de ponta a ponta na tela local e corrige a causa de cada defeito real até um ciclo inteiro não achar nada novo. Aí faz mais um ciclo limpo. Enquanto achar defeito, corrige, prova na tela e recomeça o ciclo.

## Onde

- Front: `http://localhost:3000`. API: `http://localhost:4001`, subida com `PORT=4001 node app.js` dentro de `NayaraOne--API`. O `.env` da API usa outra porta; o `PORT=4001` da linha de comando é o que vale.
- Login pela tela, com o usuário da equipe descrito em `PADRAO_AUDITORIA_E2E_MARCOS.md`. Não copie senha, token, connection string nem host de homologação para HTML, markdown de achados ou commit.
- Use o browser do Cursor. Não use Playwright neste ciclo. A janela às vezes é estreita: não force viewport 1440 no CDP, porque o print sai repetido. Print com `browser_take_screenshot` quando a tela estiver legível.
- Não mate a API se você não mudou arquivo dela. Se mudar, reinicie e confira `GET /api/health` 200 antes de seguir.

## Regras que não mudam

- O caderno `Maturacao/MARCO_8_CADERNO_COMPLETO.md` manda. A linha 6 (Procurement e Insurance) fica fora deste marco.
- Não marque checklist como verificado. Não escreva "Pronto para aceite". Não faça push. Não faça commit, a menos que o Patrick peça.
- Não invente resultado, corpo HTTP, print nem layout oficial de NFS-e ou DIMOB.
- Commit, se um dia for pedido: mensagem em português, autor `gsPatrick` / `patrickgsiqueira@hotmail.com`, via `git write-tree` + `git commit-tree` + `git update-ref`. Sem `Co-authored-by`. Sem `git commit` normal. Sem alterar git config. Sem force push.
- Não retome a divisão de god file nem o move de `src/features/correspondent` para `src/modules`.
- `DecimalInput` entrega evento. O `onChange` lê `e.target.value`.
- Se o livro cala, o comportamento vem de parâmetro de configuração, senão do que já está, senão do mais conservador. Não invente contrato de banco de produção.

## Como provar

Cada regra abaixo precisa ser vista na tela, com o texto real, não só no teste da API. Se a tela mente ou trava, corrija e repita.

1. Criar caso abre a ficha. Proponente principal obrigatório. Co-proponente opcional. Imóvel opcional e, quando escolhido, aparece na ficha e na lista.
2. Dois casos no mesmo dia, mesmo proponente e mesmo imóvel, são sinalizados como possível duplicata e o segundo caso é criado mesmo assim.
3. Checklist: incluir documento muda o status para Aguardando documentos. Upload versiona. Arquivo pequeno avisa. Validar é ação humana e, com o obrigatório validado, o status vai para Pronto para enviar. A mensagem de pendência usa o nome do documento, não o código.
4. Valor com vírgula permanece número. Valor zero ou negativo é recusado. Valor acima do teto do Sandbox (R$ 2.000.000,00) é recusado em reais, com milhar e vírgula, e não grava simulação.
5. Duas simulações do mesmo caso convivem. A de menor parcela ganha o selo Menor parcela, sem promessa de aprovação.
6. Envio exige a autorização do cliente. O worker atualiza o badge para Enviado sem recarregar a página. Enviar de novo não cria segunda linha.
7. Provider manual não simula e não avalia sozinho. A tela explica que a proposta e a avaliação são levantadas com o banco. O caso continua no mesmo modelo interno.
8. Avaliação concluída mostra valor informativo. O preço e a oferta do imóvel não mudam.
9. Comissão: percentual vem da regra, não do campo. Prevista, confirmar com identificação externa, A receber com lançamento, Receber uma vez, Estornar preserva o original. NFS-e da comissão mostra data. Consultar status no sandbox autoriza. DIMOB anual tem hash, versão e data. Fechar batch exige versão nova para corrigir.
10. Reconciliação só diz que está tudo certo quando não há divergência registrada. Não invente divergência.
11. No celular, Mais abre Correspondente · Financiamentos, Correspondente · Fiscal e Marcos do projeto.
12. Configurações mostram o modo Sandbox e o segredo do webhook sem revelar o valor.

Webhook assinado, RLS de outra empresa e ordenação de status já têm suíte na API. Não reabra isso na tela sem um botão. Se a tela não tem como provar, escreva isso no achados e siga. Não marque como falha o que a tela não oferece.

## Quando achar defeito

Corrija a causa. Confirme na tela duas vezes se o sintoma for visual. Atualize `NayaraOne--FRONT/e2e/achados/MARCO8_ACHADOS.md` com o caso, o que quebrou e o que ficou. Grave o print em `NayaraOne--FRONT/public/marco8-prints/Fxx-....png`, inclua a figura na lista `PRINTS` de `NayaraOne--API/scripts/gerar-entrega-marco8.js` e rode o gerador com o TAP `docs/evidencias/ci/local-marco8-4382a57-junto.tap.log`. Não apague as figuras F01–F10.

Pare só depois de dois ciclos seguidos sem defeito novo. No relatório ao Patrick, diga o que foi provado, o que foi corrigido e o que a tela não alcança. Não diga que está pronto para aceite.
