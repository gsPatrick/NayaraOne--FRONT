// Armazenamento de objetos e identidade (Marco 9, M9-D242). Padrão = Maturacao/demandas/parametros.csv; a API valida a faixa. Aba "Registro de integrações".
const DRIVERS = [
  { value: "storage-local-disk", label: "Disco do servidor (padrão)" },
  { value: "storage-sandbox", label: "Laboratório (sandbox, só para testes)" },
];

export const ARMAZENAMENTO_GROUP = {
  title: "Armazenamento de arquivos",
  subtitle:
    "Os arquivos do sistema ficam num armazenamento escolhido em Integrações (disco do servidor ou um serviço compatível com S3). Se a empresa não tiver um armazenamento ativo, vale o padrão abaixo. Cada empresa só enxerga os próprios arquivos, e o conteúdo é conferido pelo hash no envio e na leitura.",
  fields: [
    { key: "integration.storage.default_provider", label: "Armazenamento usado quando não há integração ativa", type: "enum", defaultValue: "storage-local-disk", options: DRIVERS, helper: "Uma integração de armazenamento ativa em Integrações sempre vale mais que este padrão." },
    { key: "integration.storage.signed_url_max_ttl_s", label: "Validade máxima do link temporário de um arquivo (segundos)", type: "integer", defaultValue: 900, helper: "De 30 a 86400. Pedido de validade maior é reduzido a este valor. O padrão é 15 minutos (900)." },
    { key: "integration.storage.max_object_bytes", label: "Tamanho máximo de um arquivo no armazenamento (bytes)", type: "integer", defaultValue: 26214400, helper: "De 1024 a 1073741824. O padrão é 25 MiB (26214400)." },
  ],
};

export const IDENTIDADE_GROUP = {
  title: "Identidade e login: acesso local na contingência",
  subtitle:
    "Se a empresa usa um provedor externo de login e ele cai (ou a integração é pausada), o sistema ativa a contingência. Nesse caso o login pelo e-mail e senha do próprio sistema segue só para os administradores, conforme a política abaixo. Sem provedor externo, o login do sistema não muda.",
  fields: [
    { key: "integration.identity.local_fallback_enabled", label: "Permitir o login local quando o provedor externo está fora", type: "boolean", defaultValue: true, helper: "Desligado, ninguém entra pelo login local enquanto o provedor externo estiver fora." },
    { key: "integration.identity.local_fallback_admin_enabled", label: "Manter o login local dos administradores na contingência", type: "boolean", defaultValue: true, helper: "Ligado, os papéis da lista abaixo continuam entrando pelo login local." },
    { key: "integration.identity.local_fallback_admin_roles", label: "Papéis tratados como administrador nesta regra (separados por vírgula)", type: "text", defaultValue: "ADMIN", helper: "De 1 a 10 nomes de papel, exatamente como aparecem no cadastro de papéis." },
    { key: "integration.identity.clock_tolerance_s", label: "Tolerância de relógio na validade da credencial (segundos)", type: "integer", defaultValue: 60, helper: "De 0 a 300. Diferença aceita entre o relógio do provedor e o do sistema ao conferir a validade." },
    { key: "integration.identity.jwks_cache_ttl_s", label: "Tempo de guarda das chaves públicas do provedor (segundos)", type: "integer", defaultValue: 300, helper: "De 10 a 86400. As chaves são relidas ao vencer ou quando aparece uma chave nova." },
    { key: "integration.identity.allowed_algorithms", label: "Algoritmos de assinatura aceitos (separados por vírgula)", type: "text", defaultValue: "RS256", helper: "Até 6, entre HS256, HS384, HS512, RS256, RS384, RS512, PS256, PS384, PS512, ES256, ES384 e ES512. A assinatura \"none\" nunca é aceita." },
  ],
};

export const QUARENTENA_GROUP = {
  title: "Arquivos recebidos de fora: quarentena",
  subtitle:
    "Todo arquivo que chega de fora (mídia de mensagem, anexo de e-mail, foto baixada de um endereço, documento de portal) fica em quarentena, sem link e sem tela, até passar pelo antivírus e pelas verificações de tipo real, tamanho, arquivo compactado, conteúdo ativo e metadados. Só então entra nos arquivos da empresa, como confidencial.",
  fields: [
    { key: "integration.upload.max_bytes", label: "Tamanho máximo de um arquivo recebido de fora (bytes)", type: "integer", defaultValue: 26214400, helper: "De 1024 a 1073741824. O padrão é 25 MiB (26214400). Acima disso o arquivo é recusado sem ser guardado." },
    { key: "integration.upload.quarantine_ttl_hours", label: "Horas até descartar o arquivo que ficou sem resultado", type: "integer", defaultValue: 72, helper: "De 1 a 720. Passado o prazo sem a verificação terminar, o arquivo é descartado." },
    { key: "integration.upload.zip_max_depth", label: "Níveis de arquivo compactado dentro de outro (limite)", type: "integer", defaultValue: 3, helper: "De 1 a 10. Mais níveis que isso são recusados como bomba de descompressão." },
    { key: "integration.upload.zip_max_ratio", label: "Razão máxima de descompressão (vezes)", type: "integer", defaultValue: 100, helper: "De 2 a 1000. Um arquivo que cresce mais que isso ao descompactar é recusado." },
    { key: "integration.upload.allowed_types", label: "Tipos de arquivo aceitos (tipos de mídia separados por vírgula)", type: "text", defaultValue: "image/jpeg,image/png,image/gif,image/webp,application/pdf,application/vnd.openxmlformats-officedocument.wordprocessingml.document,application/vnd.openxmlformats-officedocument.spreadsheetml.sheet,audio/ogg,audio/mpeg,audio/mp4,audio/amr,audio/wav,video/mp4,video/webm,video/quicktime", helper: "De 1 a 40 tipos. O tipo declarado e o tipo real do conteúdo precisam estar na lista." },
  ],
};

export const INFRA_GROUPS = [ARMAZENAMENTO_GROUP, IDENTIDADE_GROUP, QUARENTENA_GROUP];
