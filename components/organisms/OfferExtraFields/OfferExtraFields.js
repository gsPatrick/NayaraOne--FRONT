"use client";

import Icon from "@/components/atoms/Icon/Icon";
import DecimalInput from "@/components/atoms/DecimalInput/DecimalInput";
import FormField from "@/components/molecules/FormField/FormField";
import styles from "./OfferExtraFields.module.css";

export const CONDITIONS_MAX = 4000;

// Campos da oferta além de tipo e preço (Marco 3 §6 e M3-07): "condições" da oferta e o preço mínimo confidencial, que só
// aparece para quem tem a permissão properties:internal (a API nem devolve o valor para os demais).
export default function OfferExtraFields({ idPrefix, offer, onChange, canSeeConfidential }) {
  return (
    <>
      {canSeeConfidential ? (
        <FormField label="Preço mínimo confidencial" htmlFor={`${idPrefix}-offer-min-price`} helper="Uso interno, nunca público. Só quem tem a permissão de ocorrências internas vê.">
          <div className={styles.confidentialField}>
            <Icon name="shield" size={14} className={styles.confidentialIcon} />
            <DecimalInput
              id={`${idPrefix}-offer-min-price`}
              placeholder="0,00"
              value={offer.confidentialMinPrice ?? ""}
              onChange={(e) => onChange({ ...offer, confidentialMinPrice: e.target.value })}
            />
          </div>
        </FormField>
      ) : null}
      <div className={styles.span2}>
        <FormField label="Condições da oferta" htmlFor={`${idPrefix}-offer-conditions`} helper={`Entrada, prazo, reajuste, o que está incluso etc. Até ${CONDITIONS_MAX} caracteres.`}>
          <textarea
            id={`${idPrefix}-offer-conditions`}
            className={styles.textarea}
            rows={3}
            maxLength={CONDITIONS_MAX}
            value={offer.conditions || ""}
            onChange={(e) => onChange({ ...offer, conditions: e.target.value })}
          />
        </FormField>
      </div>
    </>
  );
}
