"use client";

// Campo de cliente com busca por digitação (BCL).
//
// Substitui o <select> com todos os clientes, que o Rodrigo reclamou em dois áudios.
// Mantém um <input type="hidden"> com o id, para o server action continuar recebendo
// `clienteId` exatamente como antes: a troca é só de interface, não de contrato.

import { useId, useMemo, useRef, useState } from "react";
import { buscarClientes, rotuloCliente, type ClienteBuscavel } from "@/lib/busca-cliente";

export default function BuscaCliente({
  clientes,
  name = "clienteId",
  permitirBalcao = true,
  label = "Cliente",
  testId = "busca-cliente",
}: {
  clientes: ClienteBuscavel[];
  name?: string;
  permitirBalcao?: boolean;
  label?: string;
  testId?: string;
}) {
  const [termo, setTermo] = useState("");
  const [escolhido, setEscolhido] = useState<ClienteBuscavel | null>(null);
  const [aberto, setAberto] = useState(false);
  const [destaque, setDestaque] = useState(0);
  const listaId = useId();
  const caixa = useRef<HTMLDivElement>(null);

  const sugestoes = useMemo(() => buscarClientes(clientes, termo), [clientes, termo]);

  function escolher(c: ClienteBuscavel) {
    setEscolhido(c);
    setTermo(rotuloCliente(c));
    setAberto(false);
  }

  function limpar() {
    setEscolhido(null);
    setTermo("");
    setAberto(false);
  }

  // Teclado: seta para andar, Enter para escolher, Esc para fechar. Sem isso o
  // atendente tira a mão do teclado no meio do atendimento.
  function aoTeclar(e: React.KeyboardEvent<HTMLInputElement>) {
    if (!aberto && (e.key === "ArrowDown" || e.key === "ArrowUp")) {
      setAberto(true);
      return;
    }
    if (e.key === "ArrowDown") {
      e.preventDefault();
      setDestaque((d) => Math.min(d + 1, sugestoes.length - 1));
    } else if (e.key === "ArrowUp") {
      e.preventDefault();
      setDestaque((d) => Math.max(d - 1, 0));
    } else if (e.key === "Enter" && aberto && sugestoes[destaque]) {
      e.preventDefault(); // não submete o formulário ao escolher
      escolher(sugestoes[destaque]);
    } else if (e.key === "Escape") {
      setAberto(false);
    }
  }

  return (
    <div ref={caixa} className="relative flex flex-col gap-1 text-xs font-medium">
      <label htmlFor={`${listaId}-campo`}>{label}</label>
      <input type="hidden" name={name} value={escolhido ? String(escolhido.id) : ""} />
      <input
        id={`${listaId}-campo`}
        type="text"
        role="combobox"
        aria-expanded={aberto}
        aria-controls={listaId}
        aria-autocomplete="list"
        autoComplete="off"
        data-testid={testId}
        placeholder={permitirBalcao ? "Digite o nome ou telefone (vazio = balcão)" : "Digite o nome ou telefone"}
        value={termo}
        onChange={(e) => {
          setTermo(e.target.value);
          setEscolhido(null);
          setDestaque(0);
          setAberto(true);
        }}
        onFocus={() => setAberto(true)}
        onBlur={() => window.setTimeout(() => setAberto(false), 150)}
        onKeyDown={aoTeclar}
        className="w-64 rounded-lg border border-neutral-300 bg-white px-2 py-1.5 text-neutral-900 outline-none focus:border-neutral-900"
      />

      {escolhido ? (
        <button
          type="button"
          onClick={limpar}
          data-testid={`${testId}-limpar`}
          className="self-start text-xs font-normal text-neutral-600 underline hover:text-neutral-900"
        >
          trocar cliente
        </button>
      ) : null}

      {aberto && termo.trim() !== "" ? (
        <ul
          id={listaId}
          role="listbox"
          data-testid={`${testId}-sugestoes`}
          className="absolute top-full z-20 mt-1 max-h-64 w-72 overflow-auto rounded-lg border border-neutral-300 bg-white py-1 shadow-lg"
        >
          {sugestoes.length === 0 ? (
            <li className="px-3 py-2 text-xs font-normal text-neutral-600" data-testid={`${testId}-vazio`}>
              Nenhum cliente com “{termo}”. Cadastre em Cadastros → Clientes, ou deixe vazio para balcão.
            </li>
          ) : (
            sugestoes.map((c, i) => (
              <li key={c.id}>
                <button
                  type="button"
                  role="option"
                  aria-selected={i === destaque}
                  data-cliente-sugerido={c.nome}
                  onMouseDown={(e) => e.preventDefault()}
                  onClick={() => escolher(c)}
                  className={`block w-full px-3 py-2 text-left text-sm font-normal ${
                    i === destaque ? "bg-neutral-100" : "hover:bg-neutral-50"
                  }`}
                >
                  {rotuloCliente(c)}
                </button>
              </li>
            ))
          )}
        </ul>
      ) : null}
    </div>
  );
}
