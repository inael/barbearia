"use client";

import { useState } from "react";

/**
 * Tipo da meta + alvo, com a UNIDADE visível ao lado do campo.
 *
 * Pedido do Rodrigo (áudio 14/09): *"tá dando a opção só de faturamento ou quantidade
 * e digitar o valor. Tenta colocar uma abinha de unidade, porque quando eu botar a
 * quantidade eu vou ter que ter uma unidade informando o que é, e de faturamento a
 * mesma coisa"*.
 *
 * Sem isso, o mesmo campo vazio significava reais numa hora e atendimentos na outra, e
 * só o rótulo do select acima dizia qual. Agora a unidade muda junto com o tipo e fica
 * colada no campo, que é onde o olho está na hora de digitar.
 *
 * É o único pedaço de cliente desta tela: trocar um texto ao mudar o select não vale
 * uma ida ao servidor.
 */
export default function AlvoDaMeta({
  classeInput,
  classeSelect,
}: {
  classeInput: string;
  classeSelect: string;
}) {
  const [tipo, setTipo] = useState<"valor" | "quantidade">("valor");
  const emReais = tipo === "valor";

  return (
    <>
      <label className="flex flex-col gap-1 text-xs font-medium">
        Meta em
        <select
          name="tipoAlvo"
          aria-label="Tipo de meta"
          data-testid="met-tipo"
          className={classeSelect}
          value={tipo}
          onChange={(e) => setTipo(e.target.value === "quantidade" ? "quantidade" : "valor")}
        >
          <option value="valor">R$ (faturamento)</option>
          <option value="quantidade">Atendimentos (qtd)</option>
        </select>
      </label>

      <label className="flex flex-col gap-1 text-xs font-medium">
        Alvo da semana
        <span className="flex items-center gap-1">
          {emReais ? (
            <span aria-hidden className="text-sm text-neutral-600 dark:text-neutral-400">
              R$
            </span>
          ) : null}
          <input
            name="alvo"
            required
            inputMode={emReais ? "decimal" : "numeric"}
            // o exemplo muda junto: numa meta de atendimentos, "3.000,00" confunde
            placeholder={emReais ? "3.000,00" : "40"}
            aria-label={emReais ? "Alvo da meta em reais" : "Alvo da meta em atendimentos"}
            data-testid="met-alvo"
            className={`${classeInput} w-28`}
          />
          <span className="text-sm text-neutral-600 dark:text-neutral-400" data-testid="met-unidade">
            {emReais ? "por semana" : "atendimentos"}
          </span>
        </span>
      </label>
    </>
  );
}
