"use client";

import { useEffect, useRef, useState } from "react";
import { useRouter } from "next/navigation";
import AppShell from "@/components/organisms/AppShell/AppShell";
import Card from "@/components/molecules/Card/Card";
import Button from "@/components/atoms/Button/Button";
import Input from "@/components/atoms/Input/Input";
import Select from "@/components/atoms/Select/Select";
import Spinner from "@/components/atoms/Spinner/Spinner";
import FormField from "@/components/molecules/FormField/FormField";
import { fetchCompanyByCnpj } from "@/lib/cnpj";
import styles from "./page.module.css";

function formatCnpj(value) {
  const digits = value.replace(/\D/g, "").slice(0, 14);
  return digits
    .replace(/^(\d{2})(\d)/, "$1.$2")
    .replace(/^(\d{2})\.(\d{3})(\d)/, "$1.$2.$3")
    .replace(/\.(\d{3})(\d)/, ".$1/$2")
    .replace(/(\d{4})(\d)/, "$1-$2");
}

export default function NovaEmpresaPage() {
  const router = useRouter();
  const [submitting, setSubmitting] = useState(false);
  const [form, setForm] = useState({ name: "", legalName: "", taxId: "", status: "ACTIVE" });
  const [errors, setErrors] = useState({});

  const [cnpjLoading, setCnpjLoading] = useState(false);
  const [cnpjMessage, setCnpjMessage] = useState("");
  const cnpjRequestIdRef = useRef(0);
  const cnpjDebounceRef = useRef(null);
  const mountedRef = useRef(true);

  useEffect(() => {
    mountedRef.current = true;
    return () => {
      mountedRef.current = false;
      if (cnpjDebounceRef.current) window.clearTimeout(cnpjDebounceRef.current);
    };
  }, []);

  function runCnpjLookup(rawCnpj) {
    const digits = String(rawCnpj || "").replace(/\D/g, "");
    if (digits.length !== 14) return;
    const requestId = ++cnpjRequestIdRef.current;
    setCnpjLoading(true);
    setCnpjMessage("");
    fetchCompanyByCnpj(digits).then((result) => {
      if (!mountedRef.current || requestId !== cnpjRequestIdRef.current) return;
      setCnpjLoading(false);
      if (result) {
        setForm((prev) => ({
          ...prev,
          legalName: result.legalName || prev.legalName,
          name: result.name || prev.name,
          status: result.active ? "ACTIVE" : "INACTIVE",
        }));
        setCnpjMessage("");
      } else {
        setCnpjMessage("CNPJ não encontrado, preencha manualmente.");
      }
    });
  }

  function handleCnpjChange(value) {
    const formatted = formatCnpj(value);
    setForm((prev) => ({ ...prev, taxId: formatted }));
    setCnpjMessage("");
    if (cnpjDebounceRef.current) window.clearTimeout(cnpjDebounceRef.current);
    const digits = formatted.replace(/\D/g, "");
    if (digits.length === 14) {
      cnpjDebounceRef.current = window.setTimeout(() => runCnpjLookup(formatted), 400);
    }
  }

  function handleCnpjBlur(value) {
    if (cnpjDebounceRef.current) window.clearTimeout(cnpjDebounceRef.current);
    runCnpjLookup(value);
  }

  function handleSubmit(event) {
    event.preventDefault();
    const nextErrors = {};
    if (!form.taxId.trim()) nextErrors.taxId = "Informe o CNPJ.";
    if (!form.legalName.trim()) nextErrors.legalName = "Informe a razão social.";
    setErrors(nextErrors);
    if (Object.keys(nextErrors).length > 0) return;

    setSubmitting(true);
    // Shape mockado do payload — nomenclatura alinhada a core.companies.
    const payload = {
      name: form.name.trim() || form.legalName.trim(),
      legalName: form.legalName.trim(),
      taxId: form.taxId.trim(),
      status: form.status,
      groupId: "group-nayara",
    };
    // eslint-disable-next-line no-console
    console.log("[mock] nova empresa", payload);
    window.setTimeout(() => router.push("/painel/empresas"), 500);
  }

  return (
    <AppShell title="Nova empresa" backHref="/painel/empresas">
      <div className={styles.wrap}>
        <form onSubmit={handleSubmit}>
          <Card title="Dados da empresa" className={styles.section}>
            <div className={styles.formGrid}>
              <div className={styles.span2}>
                <FormField
                  label="CNPJ"
                  htmlFor="c-tax-id"
                  required
                  error={errors.taxId}
                  helper={cnpjMessage || "Digite o CNPJ para preencher os dados automaticamente."}
                >
                  <div className={styles.cnpjField}>
                    <Input
                      id="c-tax-id"
                      placeholder="00.000.000/0001-00"
                      value={form.taxId}
                      onChange={(e) => handleCnpjChange(e.target.value)}
                      onBlur={(e) => handleCnpjBlur(e.target.value)}
                    />
                    {cnpjLoading ? <Spinner size="sm" className={styles.cnpjSpinner} /> : null}
                  </div>
                </FormField>
              </div>
              <div className={styles.span2}>
                <FormField label="Razão social" htmlFor="c-legal-name" required error={errors.legalName}>
                  <Input
                    id="c-legal-name"
                    placeholder="Preenchida pelo CNPJ"
                    value={form.legalName}
                    onChange={(e) => setForm({ ...form, legalName: e.target.value })}
                  />
                </FormField>
              </div>
              <FormField label="Nome fantasia" htmlFor="c-name" helper="Opcional — usa a razão social se deixar em branco.">
                <Input id="c-name" placeholder="Preenchido pelo CNPJ" value={form.name} onChange={(e) => setForm({ ...form, name: e.target.value })} />
              </FormField>
              <FormField label="Grupo" htmlFor="c-group">
                <Input id="c-group" defaultValue="Grupo Nayara" disabled />
              </FormField>
              <div className={styles.span2}>
                <FormField label="Status" htmlFor="c-status">
                  <Select id="c-status" value={form.status} onChange={(e) => setForm({ ...form, status: e.target.value })}>
                    <option value="ACTIVE">Ativa</option>
                    <option value="INACTIVE">Inativa</option>
                  </Select>
                </FormField>
              </div>
            </div>
          </Card>

          <div className={styles.formActions}>
            <Button type="button" variant="secondary" href="/painel/empresas">Cancelar</Button>
            <Button type="submit" loading={submitting}>Salvar empresa</Button>
          </div>
        </form>
      </div>
    </AppShell>
  );
}
