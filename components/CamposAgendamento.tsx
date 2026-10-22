"use client";

// Cliente + serviço do formulário da agenda.
//
// P4 (Rodrigo, 22/10): escolhido um assinante, o select de serviço abre com os serviços
// do plano dele no topo ("pela assinatura"), para o atendente não precisar lembrar o
// que cada plano cobre. O valor enviado continua sendo o `servicoId` de sempre; o
// desconto do plano segue sendo aplicado no caixa, como antes.

import { useMemo, useState } from "react";
import BuscaCliente from "@/components/BuscaCliente";
import type { ClienteBuscavel } from "@/lib/busca-cliente";
import { servicosCobertos } from "@/lib/servicos-do-plano";

const input =
  "rounded-lg border border-neutral-300 bg-white px-2 py-1 text-neutral-900 outline-none focus:border-neutral-900 dark:border-neutral-700 dark:bg-neutral-900 dark:text-neutral-100";

export default function CamposAgendamento({
  clientes,
  servicos,
  clienteInicial = null,
  servicoInicial,
}: {
  clientes: ClienteBuscavel[];
  servicos: { id: number; nome: string }[];
  clienteInicial?: ClienteBuscavel | null;
  servicoInicial?: number;
}) {
  const [cliente, setCliente] = useState<ClienteBuscavel | null>(clienteInicial);
  const doPlano = useMemo(
    () => (cliente?.planoNome ? servicosCobertos(cliente.planoNome, servicos) : []),
    [cliente, servicos],
  );

  return (
    <>
      <BuscaCliente
        clientes={clientes}
        label="Cliente"
        testId="age-cliente"
        permitirBalcao={false}
        inicial={clienteInicial}
        onEscolher={setCliente}
      />
      <label className="flex flex-col gap-1 text-xs font-medium">Serviço
        {/* key: ao trocar de cliente o select volta para o 1º serviço do plano */}
        <select
          key={cliente?.id ?? "nenhum"}
          name="servicoId"
          required
          aria-label="Serviço"
          data-testid="age-servico"
          defaultValue={servicoInicial ?? doPlano[0]?.id ?? servicos[0]?.id}
          className={input}
        >
          {doPlano.length > 0 ? (
            <optgroup label={`Pela assinatura (${cliente?.planoNome})`} data-testid="age-servicos-plano">
              {doPlano.map((s) => (
                <option key={`p${s.id}`} value={s.id} data-assinatura="1">{`${s.nome} · assinatura`}</option>
              ))}
            </optgroup>
          ) : null}
          <optgroup label={doPlano.length > 0 ? "Outros serviços" : "Serviços"}>
            {servicos.map((s) => (
              <option key={s.id} value={s.id}>{s.nome}</option>
            ))}
          </optgroup>
        </select>
      </label>
      {doPlano.length > 0 ? (
        <p className="basis-full text-xs text-emerald-800" data-testid="age-aviso-assinante">
          Cliente assinante ({cliente?.planoNome}). O desconto do plano entra sozinho no caixa.
        </p>
      ) : null}
    </>
  );
}
