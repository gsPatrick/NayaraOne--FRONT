// Parâmetros de segurança das integrações (Marco 9, bloco B: M9-D248, M9-D244 e M9-D245). Padrão de Maturacao/demandas/parametros.csv; a API valida.
export const INTEGRACOES_SEGURANCA_GROUPS = [
  {
    title: "Dependências e SDKs de fornecedor",
    subtitle: "A auditoria diária das dependências abre um erro de integração e avisa quem gerencia integrações quando surge vulnerabilidade grave. SDK de fornecedor só entra com versão exata.",
    fields: [
      { key: "integration.sdk.pin_exact", label: "Exigir versão exata (sem ^, ~ ou latest) nos SDKs de fornecedor", type: "boolean", defaultValue: true },
      { key: "integration.sdk.denylist", label: "Pacotes tratados como SDK de fornecedor", type: "text", defaultValue: "twilio,@sendgrid/mail,aws-sdk,@aws-sdk/*,googleapis,stripe", helper: "Nomes de pacote separados por vírgula; use /* no fim para uma família inteira. Esses pacotes só podem ser usados dentro do adaptador do fornecedor." },
      { key: "integration.sdk.audit_exception_max_days", label: "Validade máxima de uma exceção da auditoria (dias)", type: "integer", defaultValue: 30, helper: "De 1 a 30. Passado o prazo, o aviso volta a bloquear a entrega." },
      { key: "integration.sdk.audit_hour", label: "Hora da auditoria diária das dependências (horário de São Paulo)", type: "integer", defaultValue: 3, helper: "De 0 a 23. A auditoria roda uma vez por dia, a partir dessa hora." },
    ],
  },
  {
    title: "Saída para fornecedores e retenção",
    subtitle: "Toda chamada a fornecedor usa conexão segura (HTTPS, TLS 1.2 ou mais) e só pode ir para os endereços que o fornecedor declara. O expurgo dos registros vencidos roda uma vez por dia e é feito por uma única função do banco.",
    fields: [
      {
        key: "integration.egress.mode",
        label: "Endereço fora da lista permitida",
        type: "enum",
        defaultValue: "enforce",
        options: [
          { value: "enforce", label: "Bloquear a chamada e registrar o erro (produção e homologação)" },
          { value: "log", label: "Só registrar no log e deixar a chamada seguir (sandbox e desenvolvimento)" },
        ],
        helper: "Sem escolha aqui, o sistema bloqueia em produção e homologação e só registra em sandbox. Os endereços permitidos são os que o adaptador do fornecedor declara e os informados na política da conexão.",
      },
      { key: "integration.egress.provider_hosts", label: "Endereços a mais por fornecedor para o endereço base da conexão", type: "text", defaultValue: "", helper: "Formato fornecedor:endereço1,endereço2;outro:endereço3. O endereço base de uma conexão (por exemplo, da assinatura digital) só vale se for do próprio fornecedor ou constar aqui; IP, rede interna, porta e caminho são recusados. Vazio mantém só os endereços que o adaptador do fornecedor declara." },
      { key: "integration.egress.private_hosts", label: "Servidores em rede própria liberados por fornecedor (exceção)", type: "text", defaultValue: "", helper: "Formato fornecedor:endereço1,endereço2;outro:endereço3. Serve para um armazenamento seu na rede interna (por exemplo, um MinIO em storage-s3:minio.suaempresa.lan,10.0.0.5). Só vale para o fornecedor nomeado e para o endereço exato; o endereço do armazenamento precisa usar o estilo por caminho (pathStyle). Curinga, porta, caminho, loopback e os metadados da nuvem são sempre recusados. Vazio mantém a recusa de qualquer rede interna." },
      { key: "integration.retention.job_hour", label: "Hora do expurgo diário dos registros vencidos (horário de São Paulo)", type: "integer", defaultValue: 2, helper: "De 0 a 23. Os prazos de cada tabela ficam nos grupos de erros, caixa de entrada, envios e saúde." },
    ],
  },
  {
    title: "Busca de arquivos por endereço de terceiros",
    subtitle: "Quando um fornecedor ou uma pessoa de fora manda um link (foto de portal, mídia de mensagem, documento assinado), o sistema só baixa de endereços liberados para aquele uso, nunca de rede interna, e coloca o arquivo em quarentena antes de usar.",
    fields: [
      { key: "integration.ssrf.allowed_schemes", label: "Esquemas de endereço aceitos", type: "text", defaultValue: "https", helper: "Só https é aceito. http, file, ftp e outros são sempre recusados." },
      { key: "integration.ssrf.max_redirects", label: "Redirecionamentos seguidos", type: "integer", defaultValue: 0, helper: "De 0 a 5. Zero recusa qualquer redirecionamento; cada salto permitido passa por todas as verificações de novo." },
      { key: "integration.ssrf.max_bytes", label: "Tamanho máximo do arquivo baixado (bytes)", type: "integer", defaultValue: 26214400, helper: "De 1024 a 104857600 (25 MiB é o padrão). A leitura é cortada ao passar disso." },
      { key: "integration.ssrf.timeout_ms", label: "Tempo máximo de uma busca (milissegundos)", type: "integer", defaultValue: 10000, helper: "De 1000 a 60000." },
      { key: "integration.ssrf.allowed_ports", label: "Portas aceitas", type: "text", defaultValue: "443", helper: "Números separados por vírgula." },
      { key: "integration.ssrf.content_types", label: "Tipos de arquivo aceitos", type: "text", defaultValue: "image/jpeg,image/png,image/webp,image/gif,application/pdf", helper: "Tipos separados por vírgula; HTML nunca é aceito. Cada uso ainda pode aceitar menos que esta lista." },
      { key: "integration.ssrf.fetch_allowlist", label: "Endereços liberados por uso", type: "text", defaultValue: "", helper: "Formato uso:endereço1,endereço2;outro_uso:endereço3 (aceita *.dominio.com). Usos: signature_download, portal_photo, message_media, nay_document, import_by_url. Vazio mantém só os endereços que o próprio uso já traz." },
    ],
  },
];
