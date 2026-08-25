"use client";

import { useEffect, useState } from "react";
import { useRouter } from "next/navigation";
import AppShell from "@/components/organisms/AppShell/AppShell";
import Card from "@/components/molecules/Card/Card";
import Button from "@/components/atoms/Button/Button";
import Input from "@/components/atoms/Input/Input";
import Select from "@/components/atoms/Select/Select";
import Radio from "@/components/atoms/Radio/Radio";
import Icon from "@/components/atoms/Icon/Icon";
import Spinner from "@/components/atoms/Spinner/Spinner";
import FormField from "@/components/molecules/FormField/FormField";
import Alert from "@/components/molecules/Alert/Alert";
import { apiFetch } from "@/lib/api/client";
import { listRoles } from "@/lib/api/roles";
import { generateStrongPassword } from "@/lib/passwordGenerator";
import styles from "./page.module.css";

export default function NovoUsuarioPage() {
  const router = useRouter();

  const [companies, setCompanies] = useState([]);
  const [units, setUnits] = useState([]);
  const [roles, setRoles] = useState([]);
  const [loading, setLoading] = useState(true);
  const [loadError, setLoadError] = useState("");

  const [name, setName] = useState("");
  const [email, setEmail] = useState("");
  const [companyId, setCompanyId] = useState("");
  const [unitId, setUnitId] = useState("");
  const [roleId, setRoleId] = useState("");

  const [passwordMode, setPasswordMode] = useState("generate"); // generate | manual
  const [generatedPassword, setGeneratedPassword] = useState("");
  const [manualPassword, setManualPassword] = useState("");
  const [showPassword, setShowPassword] = useState(false);

  const [deliveryMode, setDeliveryMode] = useState("manual"); // manual | email

  const [errors, setErrors] = useState({});
  const [submitting, setSubmitting] = useState(false);
  const [submitError, setSubmitError] = useState("");
  const [created, setCreated] = useState(null); // { name, email, password } | null
  const [copied, setCopied] = useState(false);

  useEffect(() => {
    setGeneratedPassword(generateStrongPassword());
  }, []);

  useEffect(() => {
    let cancelled = false;
    Promise.all([apiFetch("/companies"), apiFetch("/units"), listRoles()])
      .then(([apiCompanies, apiUnits, apiRoles]) => {
        if (cancelled) return;
        setCompanies(apiCompanies || []);
        setUnits(apiUnits || []);
        setRoles(apiRoles || []);
        setCompanyId(apiCompanies?.[0]?.id || "");
        setRoleId(apiRoles?.[0]?.id || "");
      })
      .catch((err) => {
        if (!cancelled) setLoadError(err?.message || "Não foi possível carregar empresas e papéis.");
      })
      .finally(() => {
        if (!cancelled) setLoading(false);
      });
    return () => {
      cancelled = true;
    };
  }, []);

  const unitsOfCompany = units.filter((u) => u.companyId === companyId);
  const activePassword = passwordMode === "generate" ? generatedPassword : manualPassword;

  function handleRegenerate() {
    setGeneratedPassword(generateStrongPassword());
  }

  async function handleSubmit(event) {
    event.preventDefault();
    const nextErrors = {};
    if (!name.trim()) nextErrors.name = "Informe o nome completo.";
    if (!email.trim()) nextErrors.email = "Informe o e-mail corporativo.";
    if (!companyId) nextErrors.company = "Selecione uma empresa.";
    if (!roleId) nextErrors.role = "Selecione um papel.";
    if (passwordMode === "manual" && manualPassword.length < 8) {
      nextErrors.password = "A senha precisa ter pelo menos 8 caracteres.";
    }
    setErrors(nextErrors);
    if (Object.keys(nextErrors).length > 0) return;

    setSubmitting(true);
    setSubmitError("");
    try {
      const user = await apiFetch("/users", {
        method: "POST",
        body: { name: name.trim(), email: email.trim(), password: activePassword, status: "ACTIVE" },
      });
      await apiFetch("/memberships", {
        method: "POST",
        body: {
          userId: user.id,
          companyId,
          ...(unitId ? { unitId } : {}),
          roleId,
        },
      });
      setCreated({ name: user.name, email: user.email, password: activePassword });
    } catch (err) {
      setSubmitError(err?.message || "Não foi possível criar o usuário.");
    } finally {
      setSubmitting(false);
    }
  }

  function handleCopy() {
    navigator.clipboard?.writeText(created?.password || "").then(() => {
      setCopied(true);
      window.setTimeout(() => setCopied(false), 2000);
    });
  }

  if (created) {
    return (
      <AppShell title="Usuário criado" backHref="/painel/usuarios">
        <div className={styles.wrap}>
          <Card>
            <div className={styles.successBox}>
              <span className={styles.successIcon}>
                <Icon name="check" size={28} />
              </span>
              <div>
                <p style={{ fontWeight: 700, fontSize: "var(--text-h5)" }}>{created.name} foi criado(a) com sucesso</p>
                <p style={{ color: "var(--color-ink-muted)", marginTop: 4 }}>{created.email}</p>
              </div>

              {deliveryMode === "manual" ? (
                <div className={styles.credentialBox}>
                  <Alert tone="warning" title="Anote ou copie agora">
                    Por segurança, essa senha só aparece essa vez. Repasse com segurança para {created.name.split(" ")[0]}.
                  </Alert>
                  <div className={styles.credentialRow}>
                    <div>
                      <p className={styles.credentialLabel}>Senha de acesso</p>
                      <p className={styles.credentialValue}>{created.password}</p>
                    </div>
                    <button type="button" className={styles.copyBtn} onClick={handleCopy}>
                      {copied ? "Copiado!" : "Copiar senha"}
                    </button>
                  </div>
                </div>
              ) : (
                <Alert tone="info" title="Envio por e-mail ainda não disponível">
                  A API ainda não tem envio de e-mail configurado — anote a senha abaixo e repasse manualmente por
                  enquanto.
                  <div className={styles.credentialBox} style={{ marginTop: "var(--space-3)" }}>
                    <div className={styles.credentialRow}>
                      <p className={styles.credentialValue}>{created.password}</p>
                      <button type="button" className={styles.copyBtn} onClick={handleCopy}>
                        {copied ? "Copiado!" : "Copiar senha"}
                      </button>
                    </div>
                  </div>
                </Alert>
              )}

              <Button href="/painel/usuarios">Voltar para Usuários & Acessos</Button>
            </div>
          </Card>
        </div>
      </AppShell>
    );
  }

  return (
    <AppShell title="Convidar usuário" backHref="/painel/usuarios">
      <div className={styles.wrap}>
        {loadError ? <Alert tone="danger" title="Não foi possível carregar dados de apoio">{loadError}</Alert> : null}
        {submitError ? <Alert tone="danger" title="Não foi possível criar o usuário">{submitError}</Alert> : null}

        {loading ? (
          <Spinner size="lg" />
        ) : (
          <form onSubmit={handleSubmit}>
            <Card title="Dados do usuário" className={styles.card}>
              <Alert tone="info" title="Acesso provisionado pelo administrador">
                Não existe autocadastro no Nayara One — quem cria o acesso define a senha inicial.
              </Alert>
              <div className={styles.formGrid}>
                <FormField label="Nome completo" htmlFor="u-name" required error={errors.name}>
                  <Input id="u-name" value={name} onChange={(e) => setName(e.target.value)} placeholder="Nome do colaborador" />
                </FormField>
                <FormField label="E-mail corporativo" htmlFor="u-email" required error={errors.email}>
                  <Input
                    id="u-email"
                    type="email"
                    value={email}
                    onChange={(e) => setEmail(e.target.value)}
                    placeholder="nome@nayaraimoveis.com.br"
                  />
                </FormField>
                <FormField label="Empresa" htmlFor="u-company" required error={errors.company}>
                  <Select id="u-company" value={companyId} onChange={(e) => { setCompanyId(e.target.value); setUnitId(""); }}>
                    {companies.map((c) => (
                      <option key={c.id} value={c.id}>{c.name}</option>
                    ))}
                  </Select>
                </FormField>
                <FormField label="Unidade" htmlFor="u-unit" helper="Opcional — deixe em branco para acesso a toda a empresa.">
                  <Select id="u-unit" value={unitId} onChange={(e) => setUnitId(e.target.value)}>
                    <option value="">Sem unidade específica</option>
                    {unitsOfCompany.map((u) => (
                      <option key={u.id} value={u.id}>{u.name}</option>
                    ))}
                  </Select>
                </FormField>
                <div className={styles.span2}>
                  <FormField label="Papel" htmlFor="u-role" required error={errors.role}>
                    {roles.length > 0 ? (
                      <Select id="u-role" value={roleId} onChange={(e) => setRoleId(e.target.value)}>
                        {roles.map((role) => (
                          <option key={role.id} value={role.id}>{role.name}</option>
                        ))}
                      </Select>
                    ) : (
                      <p style={{ fontSize: "var(--text-body-sm)", color: "var(--color-ink-muted)" }}>
                        Nenhum papel cadastrado ainda — crie um em Papéis &amp; Permissões antes de convidar alguém.
                      </p>
                    )}
                  </FormField>
                </div>
              </div>
            </Card>

            <Card title="Senha de acesso" className={styles.card}>
              <div className={styles.modeRow}>
                <Radio
                  label="Gerar senha forte automaticamente"
                  name="password-mode"
                  checked={passwordMode === "generate"}
                  onChange={() => setPasswordMode("generate")}
                />
                <Radio
                  label="Eu vou digitar a senha"
                  name="password-mode"
                  checked={passwordMode === "manual"}
                  onChange={() => setPasswordMode("manual")}
                />
              </div>

              {passwordMode === "generate" ? (
                <FormField label="Senha gerada" htmlFor="u-generated-password">
                  <div className={styles.passwordField}>
                    <Input id="u-generated-password" value={generatedPassword} readOnly type={showPassword ? "text" : "password"} />
                    <button type="button" className={styles.toggleVisibility} onClick={() => setShowPassword((v) => !v)} aria-label="Mostrar/ocultar senha">
                      <Icon name="eye" size={16} />
                    </button>
                  </div>
                  <button type="button" className={styles.regenerateBtn} onClick={handleRegenerate}>
                    Gerar outra senha
                  </button>
                </FormField>
              ) : (
                <FormField label="Senha" htmlFor="u-manual-password" required error={errors.password} helper="Mínimo de 8 caracteres.">
                  <div className={styles.passwordField}>
                    <Input
                      id="u-manual-password"
                      type={showPassword ? "text" : "password"}
                      value={manualPassword}
                      onChange={(e) => setManualPassword(e.target.value)}
                      placeholder="Defina a senha inicial"
                    />
                    <button type="button" className={styles.toggleVisibility} onClick={() => setShowPassword((v) => !v)} aria-label="Mostrar/ocultar senha">
                      <Icon name="eye" size={16} />
                    </button>
                  </div>
                </FormField>
              )}
            </Card>

            <Card title="Como entregar a senha" className={styles.card}>
              <div className={styles.modeRow}>
                <Radio
                  label="Vou passar manualmente (copiar e enviar por fora)"
                  name="delivery-mode"
                  checked={deliveryMode === "manual"}
                  onChange={() => setDeliveryMode("manual")}
                />
                <Radio
                  label="Enviar por e-mail (em breve)"
                  name="delivery-mode"
                  checked={deliveryMode === "email"}
                  onChange={() => setDeliveryMode("email")}
                />
              </div>
              {deliveryMode === "email" ? (
                <Alert tone="warning">
                  Ainda não configuramos envio de e-mail nesta API — ao criar, a senha vai aparecer na tela pra você
                  copiar e repassar manualmente mesmo.
                </Alert>
              ) : null}
            </Card>

            <div className={styles.formActions}>
              <Button type="button" variant="secondary" onClick={() => router.push("/painel/usuarios")}>Cancelar</Button>
              <Button type="submit" loading={submitting}>Criar usuário</Button>
            </div>
          </form>
        )}
      </div>
    </AppShell>
  );
}
