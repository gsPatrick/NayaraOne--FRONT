# Estratégia de branches — Nayara One Frontend

## main
Branch de desenvolvimento contínuo. É onde o frontend mockado segue evoluindo,
módulo por módulo (Imóveis, Contatos, CRM, Radar, Empresas, Usuários,
Financeiro, Contratos/Locação/Jurídico, e os próximos marcos).

## deploy-mockado
Branch de entrega para o cliente enquanto o frontend ainda não está integrado
com a API real. Sobe no servidor a versão 100% mockada (dados fake em
`lib/mock/*`), útil para validação de tela/fluxo módulo por módulo antes da
integração. Deve ser atualizada (merge ou rebase a partir da `main`) a cada
entrega de módulo aprovada, para controlar exatamente o que o cliente está
vendo em produção nesse momento.

## integracao-api
Branch preparada para o trabalho de integração real com a API
(`NayaraOne--API`) — troca dos mocks por chamadas HTTP de verdade,
autenticação real, tratamento de erro de rede, etc. Fica parada até que a
decisão de iniciar a integração seja tomada; a partir daí vira a branch de
trabalho ativo para esse esforço, e eventualmente substitui o conteúdo de
`deploy-mockado` em produção quando a integração estiver pronta.

## Fluxo resumido
1. Todo desenvolvimento novo (mockado) entra em `main`.
2. Quando um módulo está pronto para o cliente ver: `deploy-mockado` recebe
   esse trecho de `main` e é o que sobe no servidor.
3. Quando a integração com a API começar: trabalho acontece em
   `integracao-api`, partindo do estado mais atual de `main`.
