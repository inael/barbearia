import { revalidatePath } from "next/cache";
import { auth } from "@/auth";
import { getDb } from "@/lib/db";
import { podeAcessar } from "@/lib/auth/rbac";
import { listarProfissionais } from "@/lib/profissionais";
import { registrarVale, listarVales, TIPOS_VALE, type TipoVale } from "@/lib/vales";
import PageHeader from "@/components/PageHeader";

export const dynamic = "force-dynamic";
const ROTA = "/vales";
const brl = (c: number) => (c / 100).toLocaleString("pt-BR", { style: "currency", currency: "BRL" });
const reaisParaCentavos = (v: string) => Math.round(parseFloat(String(v).replace(",", ".")) * 100);
const tipoLabel: Record<string, string> = {
  produto_cliente: "Produto p/ cliente",
  retirado_barbeiro: "Retirado pelo barbeiro",
  servico_barbeiro: "Serviço do barbeiro (caixa)",
};

async function podeLancarVale() {
  const session = await auth();
  const papel = session?.user?.papel;
  return Boolean(papel && podeAcessar(papel, "caixa"));
}

async function novo(formData: FormData) {
  "use server";
  if (!(await podeLancarVale())) return;
  await registrarVale(getDb(), {
    profissionalId: Number(formData.get("profissionalId")),
    tipo: String(formData.get("tipo") || "retirado_barbeiro") as TipoVale,
    descricao: String(formData.get("descricao") || ""),
    precoCentavos: reaisParaCentavos(String(formData.get("preco") || "0")),
  });
  revalidatePath(ROTA);
}

const wrap = "min-h-screen bg-neutral-50 text-neutral-900 dark:bg-neutral-950 dark:text-neutral-100";
const input =
  "rounded-lg border border-neutral-300 bg-white px-2 py-1 text-neutral-900 outline-none focus:border-neutral-900 dark:border-neutral-700 dark:bg-neutral-900 dark:text-neutral-100";
const btn = "rounded-lg bg-emerald-700 px-3 py-1.5 text-sm font-semibold text-white hover:bg-emerald-800";

export default async function ValesPage() {
  const session = await auth();
  const papel = session?.user?.papel;
  const pid = session?.user?.profissionalId ?? null;

  if (!papel || !(podeAcessar(papel, "caixa") || podeAcessar(papel, "comissao"))) {
    return (
      <main className={wrap}>
        <div className="mx-auto max-w-2xl px-5 py-10">
          <p role="alert" className="text-sm text-neutral-700 dark:text-neutral-300">Sem acesso a esta página.</p>
        </div>
      </main>
    );
  }

  const db = getDb();
  const podeLancar = podeAcessar(papel, "caixa");
  const [profissionais, vales] = await Promise.all([
    listarProfissionais(db),
    podeLancar ? listarVales(db) : listarVales(db, pid ?? -1),
  ]);

  return (
    <main className={wrap}>
      <div className="mx-auto max-w-3xl px-5 py-10">
        <PageHeader
          titulo="Vales"
          descricao={`O que cada barbeiro deve pra barbearia, pra descontar no acerto da comissão. ${podeLancar ? "" : "Você vê os seus vales."}`}
          ajuda={
            <>
              <p><strong>Produto p/ cliente</strong> e <strong>Retirado pelo barbeiro</strong> — produto que o barbeiro levou, com 30% de desconto sobre o preço (lançados aqui).</p>
              <p><strong>Serviço do barbeiro (caixa)</strong> — quando ele faz um serviço nele mesmo, o caixa lança automaticamente um vale com a parte da barbearia. Não precisa lançar aqui.</p>
              <p>No fim do período, os vales entram no relatório de Metas junto com a comissão.</p>
            </>
          }
        />

        {podeLancar ? (
          <section className="mt-6">
            <h2 className="mb-3 text-lg font-semibold">Lançar vale</h2>
            <form action={novo} className="flex flex-wrap items-end gap-3 rounded-xl border border-neutral-200 bg-white p-4 dark:border-neutral-800 dark:bg-neutral-900">
              <label className="flex flex-col gap-1 text-xs font-medium">Barbeiro
                <select name="profissionalId" aria-label="Barbeiro" data-testid="val-prof" className={input}>
                  {profissionais.map((p) => <option key={p.id} value={p.id}>{p.nome}</option>)}
                </select>
              </label>
              <label className="flex flex-col gap-1 text-xs font-medium">Tipo
                <select name="tipo" aria-label="Tipo do vale" data-testid="val-tipo" className={input}>
                  {TIPOS_VALE.map((t) => <option key={t} value={t}>{tipoLabel[t]}</option>)}
                </select>
              </label>
              <label className="flex flex-col gap-1 text-xs font-medium">Produto
                <input name="descricao" required aria-label="Produto" data-testid="val-descricao" className={input} />
              </label>
              <label className="flex flex-col gap-1 text-xs font-medium">Preço (R$)
                <input name="preco" required inputMode="decimal" aria-label="Preço" data-testid="val-preco" className={`${input} w-24`} />
              </label>
              <button type="submit" className={btn}>Lançar</button>
            </form>
          </section>
        ) : null}

        <section className="mt-8">
          <h2 className="mb-3 text-lg font-semibold">Vales ({vales.length})</h2>
          <div className="flex flex-col gap-2">
            {vales.length === 0 ? <p className="text-sm text-neutral-600">Nenhum vale.</p> : vales.map((v) => (
              <div key={v.id} data-vale={v.descricao} className="flex flex-wrap items-center gap-3 rounded-lg border border-neutral-200 bg-white p-3 text-sm dark:border-neutral-800 dark:bg-neutral-900">
                <span className="font-medium">{v.descricao}</span>
                <span className="rounded bg-neutral-100 px-1.5 py-0.5 text-xs dark:bg-neutral-800">{tipoLabel[v.tipo] ?? v.tipo}</span>
                <span className="text-neutral-500">{v.profissionalNome}</span>
                <span className="ml-auto"><s className="text-neutral-400">{brl(v.precoCentavos)}</s> <strong>{brl(v.valorCentavos)}</strong></span>
              </div>
            ))}
          </div>
        </section>
      </div>
    </main>
  );
}
