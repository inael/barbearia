"use client";

import { useMemo, useState } from "react";
import {
  faixaComissaoServico,
  faixaComissaoProduto,
  comissaoServico,
  comissaoProduto,
  comissaoDividida,
  comissaoHidratacaoRecepcionista,
} from "@/lib/comissao";
import { calcularPote, dividirPote } from "@/lib/pote";

const brl = (v: number) =>
  v.toLocaleString("pt-BR", { style: "currency", currency: "BRL" });
const pct = (v: number) => `${Math.round(v * 100)}%`;

function num(v: string): number {
  const n = Number(v.replace(/\./g, "").replace(",", "."));
  return Number.isFinite(n) ? n : 0;
}

function Campo({
  label,
  value,
  onChange,
  suffix,
}: {
  label: string;
  value: string;
  onChange: (v: string) => void;
  suffix?: string;
}) {
  return (
    <label className="block">
      <span className="text-xs font-medium text-neutral-600">{label}</span>
      <div className="mt-1 flex items-center rounded-lg border border-neutral-300 bg-white focus-within:border-neutral-900 dark:border-neutral-700 dark:bg-neutral-900 dark:focus-within:border-neutral-100">
        <input
          inputMode="decimal"
          value={value}
          onChange={(e) => onChange(e.target.value)}
          className="w-full rounded-lg bg-transparent px-3 py-2 text-sm outline-none"
        />
        {suffix ? (
          <span className="px-3 text-xs text-neutral-600">{suffix}</span>
        ) : null}
      </div>
    </label>
  );
}

function Card({
  titulo,
  children,
}: {
  titulo: string;
  children: React.ReactNode;
}) {
  return (
    <section className="rounded-xl border border-neutral-200 bg-white p-5 dark:border-neutral-800 dark:bg-neutral-900">
      <h2 className="mb-4 text-sm font-semibold uppercase tracking-wide text-neutral-600">
        {titulo}
      </h2>
      {children}
    </section>
  );
}

function Linha({ label, valor, forte }: { label: string; valor: string; forte?: boolean }) {
  return (
    <div className="flex items-baseline justify-between border-t border-neutral-100 py-2 first:border-t-0 dark:border-neutral-800">
      <span className="text-sm text-neutral-600 dark:text-neutral-400">{label}</span>
      <span className={forte ? "text-base font-bold" : "text-sm font-medium"}>{valor}</span>
    </div>
  );
}

export default function ComissaoPage() {
  // Faixa do mês (definida pelo mês anterior).
  const [fatMesAnterior, setFatMesAnterior] = useState("13000");
  const [produtosMesAnterior, setProdutosMesAnterior] = useState("1800");

  // Serviços do período.
  const [avulsos, setAvulsos] = useState("4000");
  const [combos, setCombos] = useState("1500");
  const [divididos, setDivididos] = useState("500"); // Limpeza Detox / Acidificação
  const [produtosVendidos, setProdutosVendidos] = useState("900");
  const [hidratacoes, setHidratacoes] = useState("8");

  // Pote de assinaturas.
  const [receitaAssin, setReceitaAssin] = useState("3000");
  const [pontosRodrigo, setPontosRodrigo] = useState("300");
  const [pontosPedro, setPontosPedro] = useState("180");
  const [pontosJoao, setPontosJoao] = useState("120");

  const r = useMemo(() => {
    const faixaServ = faixaComissaoServico(num(fatMesAnterior));
    const faixaProd = faixaComissaoProduto(num(produtosMesAnterior));

    const comAvulsos = comissaoServico(num(avulsos), faixaServ, false);
    const comCombos = comissaoServico(num(combos), faixaServ, true);
    const divisao = comissaoDividida(num(divididos));
    const comProduto = comissaoProduto(num(produtosVendidos), faixaProd);
    const comHidrat = comissaoHidratacaoRecepcionista(Math.trunc(num(hidratacoes)));

    const totalBarbeiro = comAvulsos + comCombos + divisao.barbeiro + comProduto;

    const pote = calcularPote(num(receitaAssin));
    const partes = dividirPote(pote, {
      Rodrigo: num(pontosRodrigo),
      Pedro: num(pontosPedro),
      Joao: num(pontosJoao),
    });

    return {
      faixaServ,
      faixaProd,
      comAvulsos,
      comCombos,
      divisao,
      comProduto,
      comHidrat,
      totalBarbeiro,
      pote,
      partes,
    };
  }, [
    fatMesAnterior,
    produtosMesAnterior,
    avulsos,
    combos,
    divididos,
    produtosVendidos,
    hidratacoes,
    receitaAssin,
    pontosRodrigo,
    pontosPedro,
    pontosJoao,
  ]);

  return (
    <main className="min-h-screen bg-neutral-50 text-neutral-900 dark:bg-neutral-950 dark:text-neutral-100">
      <div className="mx-auto max-w-5xl px-5 py-10">
        <header className="mb-8 border-b border-neutral-200 pb-6 dark:border-neutral-800">
          <h1 className="text-3xl font-bold tracking-tight">Comissao & Pote</h1>
          <p className="mt-1 text-sm text-neutral-600">
            Simulador do fechamento, usando as regras oficiais da Faith Barbearia.
          </p>
        </header>

        <div className="grid gap-6 lg:grid-cols-2">
          <Card titulo="Faixa do mes (pelo mes anterior)">
            <div className="grid gap-3">
              <Campo label="Faturamento do barbeiro no mes anterior" value={fatMesAnterior} onChange={setFatMesAnterior} suffix="R$" />
              <Campo label="Produtos vendidos no mes anterior" value={produtosMesAnterior} onChange={setProdutosMesAnterior} suffix="R$" />
            </div>
            <div className="mt-4">
              <Linha label="Faixa de servico" valor={pct(r.faixaServ)} forte />
              <Linha label="Faixa de produto" valor={pct(r.faixaProd)} />
              <p className="mt-2 text-xs text-neutral-600">
                Servico: 40% base, 45% a partir de R$ 12.000, 50% a partir de R$ 15.000. Produto: 5%, ou 10% a partir de R$ 2.500.
              </p>
            </div>
          </Card>

          <Card titulo="Servicos do periodo">
            <div className="grid gap-3">
              <Campo label="Servicos avulsos (faturamento)" value={avulsos} onChange={setAvulsos} suffix="R$" />
              <Campo label="Combos (comissao fixa 40%)" value={combos} onChange={setCombos} suffix="R$" />
              <Campo label="Servicos divididos (Limpeza Detox / Acidificacao)" value={divididos} onChange={setDivididos} suffix="R$" />
              <Campo label="Produtos vendidos pelo barbeiro" value={produtosVendidos} onChange={setProdutosVendidos} suffix="R$" />
            </div>
          </Card>

          <Card titulo="Comissao do barbeiro">
            <Linha label={`Avulsos (${pct(r.faixaServ)})`} valor={brl(r.comAvulsos)} />
            <Linha label="Combos (40%)" valor={brl(r.comCombos)} />
            <Linha label="Divididos (20% do barbeiro)" valor={brl(r.divisao.barbeiro)} />
            <Linha label={`Produtos (${pct(r.faixaProd)})`} valor={brl(r.comProduto)} />
            <div className="mt-2 rounded-lg bg-emerald-50 px-3 py-2 dark:bg-emerald-900/30">
              <Linha label="Total do barbeiro" valor={brl(r.totalBarbeiro)} forte />
            </div>
          </Card>

          <Card titulo="Recepcionista">
            <div className="mb-3">
              <Campo label="Hidratacoes de cabelo no mes (qtd)" value={hidratacoes} onChange={setHidratacoes} suffix="un" />
            </div>
            <Linha label="Divididos (20% da recepcao)" valor={brl(r.divisao.recepcionista)} />
            <Linha
              label={`Hidratacoes (${Math.trunc(num(hidratacoes)) > 10 ? "R$10" : "R$5"}/un)`}
              valor={brl(r.comHidrat)}
            />
            <div className="mt-2 rounded-lg bg-sky-50 px-3 py-2 dark:bg-sky-900/30">
              <Linha label="Total da recepcao" valor={brl(r.divisao.recepcionista + r.comHidrat)} forte />
            </div>
          </Card>

          <Card titulo="Pote das assinaturas">
            <div className="grid gap-3 sm:grid-cols-2">
              <Campo label="Receita de assinaturas" value={receitaAssin} onChange={setReceitaAssin} suffix="R$" />
              <Campo label="Pontos Rodrigo" value={pontosRodrigo} onChange={setPontosRodrigo} suffix="pts" />
              <Campo label="Pontos Pedro" value={pontosPedro} onChange={setPontosPedro} suffix="pts" />
              <Campo label="Pontos Joao" value={pontosJoao} onChange={setPontosJoao} suffix="pts" />
            </div>
            <p className="mt-3 text-xs text-neutral-600">
              A barbearia retem 60%; 40% viram o pote, dividido proporcional aos pontos.
            </p>
          </Card>

          <Card titulo="Divisao do pote">
            <div className="mb-2 rounded-lg bg-amber-50 px-3 py-2 dark:bg-amber-900/30">
              <Linha label="Pote total (40%)" valor={brl(r.pote)} forte />
            </div>
            {Object.entries(r.partes).map(([nome, valor]) => (
              <Linha key={nome} label={nome} valor={brl(valor)} />
            ))}
          </Card>
        </div>

        <footer className="mt-8 border-t border-neutral-200 pt-6 text-xs text-neutral-600 dark:border-neutral-800">
          Calculo 100% no navegador, com o mesmo motor coberto por testes (lib/comissao, lib/pote). IT Booster.
        </footer>
      </div>
    </main>
  );
}
