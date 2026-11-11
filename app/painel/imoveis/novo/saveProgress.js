// Progresso do salvamento do wizard "Novo imóvel" (M9-D850), sem React: testável isoladamente.
// Cada etapa (imóvel, documentação, oferta e cada proprietário por personId+papel) guarda a ASSINATURA do que foi gravado.
// - "Tentar novamente" (mesma Idempotency-Key, nada editado): assinaturas iguais -> só as etapas que falharam rodam.
// - Novo envio depois de editar: etapa já gravada com assinatura diferente é ATUALIZADA (PATCH), nunca ignorada nem recriada;
//   etapa que falhou antes de gravar e mudou usa Idempotency-Key nova (a API recusaria o mesmo payload alterado sob a mesma chave).
// - Proprietário gravado e removido do formulário é removido do imóvel.

/** JSON estável (chaves ordenadas): mesma informação -> mesma assinatura. */
export function signatureOf(value) {
  const walk = (v) => {
    if (Array.isArray(v)) return v.map(walk);
    if (v && typeof v === "object") return Object.keys(v).sort().reduce((acc, k) => { acc[k] = walk(v[k]); return acc; }, {});
    return v === undefined ? null : v;
  };
  return JSON.stringify(walk(value));
}

const emptyStep = () => ({ id: null, sig: null, attemptSig: null, n: 0 });

export function createSaveProgress() {
  return { key: null, property: emptyStep(), created: null, docs: { sig: null }, offer: emptyStep(), owners: {}, media: {} };
}

/** Chave da etapa: a base da ação; sobe um sufixo quando o payload mudou depois de uma tentativa que não gravou. */
function stepKey(base, name, rec, sig) {
  if (rec.attemptSig !== null && rec.attemptSig !== sig) rec.n += 1;
  rec.attemptSig = sig;
  return `${base}:${name}${rec.n ? `-${rec.n}` : ""}`;
}

/** Chave estável do proprietário no progresso: personId+papel (repetido no mesmo formulário ganha #n). */
export function ownerKeysOf(owners) {
  const seen = {};
  return owners.map((o) => {
    const base = `${o.personId}|${o.roleCode || ""}`;
    seen[base] = (seen[base] || 0) + 1;
    return seen[base] > 1 ? `${base}#${seen[base]}` : base;
  });
}

/**
 * plan = { property, docs, offer|null, owners: [{ personId, roleCode, ownershipPercent }] }; api injeta as chamadas.
 * `holder.state` guarda o progresso entre tentativas; vale por Idempotency-Key (chave nova = tentativa do zero).
 */
export async function runSave(holder, idempotencyKey, plan, api) {
  if (!holder.state || holder.state.key !== idempotencyKey) holder.state = { ...createSaveProgress(), key: idempotencyKey };
  const progress = holder.state;

  const propertySig = signatureOf(plan.property);
  const p = progress.property;
  if (!p.id) {
    const created = await api.createProperty(plan.property, { idempotencyKey: stepKey(idempotencyKey, "imovel", p, propertySig) });
    p.id = created.id;
    p.sig = propertySig;
    progress.created = created;
  } else if (p.sig !== propertySig) {
    await api.updateProperty(p.id, plan.property);
    p.sig = propertySig;
  }
  const propertyId = p.id;

  // Documentação com o arquivo de cada documento (Marco 3 §6): o arquivo escolhido entra na assinatura pelo nome, tamanho e data.
  const docFiles = plan.docFiles || {};
  const docsSig = signatureOf({ docs: plan.docs, files: fileIdentities(docFiles) });
  if (progress.docs.sig !== docsSig) {
    await api.saveDocumentation(propertyId, plan.docs, docFiles);
    progress.docs.sig = docsSig;
  }

  if (plan.offer) {
    const offerSig = signatureOf(plan.offer);
    const o = progress.offer;
    if (!o.id) {
      const offer = await api.createOffer(propertyId, plan.offer, { idempotencyKey: stepKey(idempotencyKey, "oferta", o, offerSig) });
      o.id = (offer && offer.id) || true;
      o.sig = offerSig;
    } else if (o.sig !== offerSig) {
      if (o.id !== true) await api.updateOffer(propertyId, o.id, plan.offer);
      o.sig = offerSig;
    }
  }

  const keys = ownerKeysOf(plan.owners);
  for (const [index, owner] of plan.owners.entries()) {
    const key = keys[index];
    const sig = signatureOf(owner);
    const rec = progress.owners[key] || (progress.owners[key] = emptyStep());
    if (!rec.id) {
      const saved = await api.addOwner(propertyId, owner, { idempotencyKey: stepKey(idempotencyKey, `proprietario-${key.replace(/[^A-Za-z0-9-]/g, "_")}`, rec, sig) });
      rec.id = (saved && saved.id) || true;
      rec.sig = sig;
    } else if (rec.sig !== sig) {
      if (rec.id !== true) await api.updateOwner(propertyId, rec.id, { roleCode: owner.roleCode, ownershipPercent: owner.ownershipPercent });
      rec.sig = sig;
    }
  }
  // Dono já gravado e retirado do formulário: sai do imóvel (a ordem da lista não importa, só personId+papel).
  for (const key of Object.keys(progress.owners)) {
    if (keys.includes(key)) continue;
    const rec = progress.owners[key];
    if (rec.id && rec.id !== true) await api.removeOwner(propertyId, rec.id);
    delete progress.owners[key];
  }

  // Mídia escolhida no wizard (Marco 3 §6): cada arquivo sobe uma vez só (POST /files + POST /properties/:id/media); no
  // "Tentar novamente" a mídia já enviada é pulada. Só roda quando a tela manda mídia e a função de envio.
  if (api.uploadMedia) {
    for (const [index, item] of (plan.media || []).entries()) {
      if (!item.file || progress.media[item.id]) continue;
      const saved = await api.uploadMedia(propertyId, item.file, { position: index });
      progress.media[item.id] = (saved && saved.id) || true;
    }
  }

  return progress.created;
}

/** Identidade do arquivo escolhido (sem ler o conteúdo): nome, tamanho e data de modificação. */
export function fileIdentities(files) {
  return Object.keys(files || {}).sort().reduce((acc, k) => {
    const f = files[k];
    acc[k] = f ? `${f.name}|${f.size}|${f.lastModified || 0}` : null;
    return acc;
  }, {});
}
