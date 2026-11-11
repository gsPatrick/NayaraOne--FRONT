// Deduplicação ANTES de criar (livro §4 e CRMX-010 "Deduplicação antes de criar: pessoa semelhante exige revisão"; DI-M3PE-3 e DI-M3PE-4).
// Antes do POST /people a tela consulta POST /people/duplicates/check e:
//   - forte nesta empresa (mesmo CPF/CNPJ): bloqueia e leva ao cadastro existente;
//   - forte no grupo: oferece o vínculo (quem tem people:link) ou explica quem pode fazer;
//   - médio (mesmo telefone/e-mail): mostra os cadastros; criar mesmo assim só com a permissão de exceção e com o motivo, que vai à auditoria;
//   - médio no grupo: mesma exceção, com a sugestão de vincular pelo CPF/CNPJ se for a mesma pessoa;
//   - fraco (nome parecido + nascimento/endereço): pede a confirmação "revisei: é outra pessoa" (vai à auditoria e à fila de revisão).
// Devolve { payload } (pronto para criar), { vincular: true }, { bloqueio: { titulo, mensagem, link } } ou { cancelado: true }.

const nomes = (lista) => lista.map((c) => c.legalName).filter(Boolean).join(", ");

export function rascunhoDe(payload) {
  const { personType, legalName, taxIdNormalized, birthOrFoundationDate, contacts, address } = payload;
  return { personType, legalName, taxIdNormalized, birthOrFoundationDate, contacts, address };
}

export async function revisarAntesDeCriar(payload, { verificar, confirm, pedirMotivo }) {
  const r = await verificar(rascunhoDe(payload));
  if (r?.forte?.nestaEmpresa) {
    const p = r.forte.nestaEmpresa;
    return { bloqueio: { titulo: "Este CPF/CNPJ já está cadastrado", mensagem: `${p.legalName} já tem cadastro com este CPF/CNPJ nesta empresa. Abra o cadastro existente em vez de criar outro.`, link: `/painel/pessoas/${p.id}` } };
  }
  if (r?.forte?.noGrupo) {
    if (r.forte.podeVincular) return { vincular: true };
    return { bloqueio: { titulo: "Este CPF/CNPJ já tem cadastro no grupo", mensagem: "Outra empresa do grupo já cadastrou este CPF/CNPJ. Peça a quem tem a permissão de vincular pessoas para trazer o cadastro para esta empresa." } };
  }
  let next = { ...payload };
  const medios = r?.medio?.candidatos || [];
  if (medios.length || r?.medio?.noGrupo) {
    const onde = medios.length ? `de ${nomes(medios)}` : "de uma pessoa de outra empresa do grupo";
    if (!r.medio.podeForcar) {
      return { bloqueio: { titulo: "Já existe pessoa com este telefone ou e-mail", mensagem: `O telefone ou e-mail informado já está no cadastro ${onde}. Revise o cadastro existente. Para criar mesmo assim é preciso a permissão de exceção de duplicidade.`, link: medios[0] ? `/painel/pessoas/${medios[0].personId}` : null } };
    }
    const motivo = await pedirMotivo({
      titulo: "Telefone ou e-mail já cadastrado",
      mensagem: `O telefone ou e-mail informado já está no cadastro ${onde}.${medios.length ? "" : " Se for a mesma pessoa, use o vínculo pelo CPF/CNPJ e o nome."} Se for outra pessoa, explique o motivo: a exceção fica registrada na auditoria e o par vai para a fila de revisão.`,
      minimo: r.medio.motivoMinimo || 10,
    });
    if (!motivo) return { cancelado: true };
    next = { ...next, allowDuplicate: true, duplicateReason: motivo };
  }
  const fracos = r?.fraco?.candidatos || [];
  if (fracos.length) {
    const ok = await confirm({
      title: "Encontramos cadastro parecido",
      message: `Já existe ${nomes(fracos)} com nome parecido e a mesma data de nascimento ou o mesmo endereço. Confira se não é a mesma pessoa antes de criar. Se for outra pessoa, confirme: a revisão fica registrada.`,
      confirmLabel: "Revisei: é outra pessoa",
      tone: "primary",
    });
    if (!ok) return { cancelado: true };
    next = { ...next, similarReviewed: true };
  }
  return { payload: next };
}
