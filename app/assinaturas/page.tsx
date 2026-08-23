import { revalidatePath } from "next/cache";
import { auth } from "@/auth";
import { getDb } from "@/lib/db";
import { eq } from "drizzle-orm";
import * as schema from "@/lib/db/schema";
import { podeAcessar } from "@/lib/auth/rbac";
import { listarClientes } from "@/lib/clientes";
import { criarPlano, listarPlanos, criarAssinatura, definirStatusAssinatura, type TipoPlano } from "@/lib/assinaturas";
import { pedirAssinatura, listarFila, aprovarFila, rejeitarFila } from "@/lib/cobranca";

export const dynamic = "force-dynamic";
const ROTA = "/assinaturas";
const brl = (c: number) => (c / 100).toLocaleString("pt-BR", { style: "currency", currency: "BRL" });
const reaisParaCentavos = (v: string) => Math.round(parseFloat(String(v).replace(",", ".")) * 100);

async function podeGerenciar() {
  const session = await auth();
  return Boolean(session?.user?.papel && podeAcessar(session.user.papel, "config"));
}

async function novoPlano(formData: FormData) {
  "use server";
  if (!(await podeGerenciar())) return;
  await criarPlano(getDb(), {
    nome: String(formData.get("nome") || ""),
    tipo: String(formData.get("tipo") || "flex") as TipoPlano,
    precoCentavos: reaisParaCentavos(String(formData.get("preco") || "0")),
    descontoServicoPct: Number(formData.get("descServico")) || 0,
    descontoProdutoPct: Number(formData.get("descProduto")) || 0,
    dias: String(formData.get("dias") || ""),
  });
  revalidatePath(ROTA);
}

async function novaAssinatura(formData: FormData) {
  "use server";
  if (!(await podeGerenciar())) return;
  await criarAssinatura(getDb(), Number(formData.get("clienteId")), Number(formData.get("planoId")));
  revalidatePath(ROTA);
}

async function mudarStatus(formData: FormData) {
  "use server";
  if (!(await podeGerenciar())) return;
  await definirStatusAssinatura(getDb(), Number(formData.get("id")), String(formData.get("status")) as "ativa" | "atraso" | "cancelada");
  revalidatePath(ROTA);
}

async function podeOperar() {
  const session = await auth();
  const p = session?.user?.papel;
  return Boolean(p && (podeAcessar(p, "config") || podeAcessar(p, "caixa")));
}
async function pedir(formData: FormData) {
  "use server";
  if (!(await podeOperar())) return;
  await pedirAssinatura(getDb(), Number(formData.get("clienteId")), Number(formData.get("planoId")));
  revalidatePath(ROTA);
}
async function aprovar(formData: FormData) {
  "use server";
  if (!(await podeGerenciar())) return;
  await aprovarFila(getDb(), Number(formData.get("id")));
  revalidatePath(ROTA);
}
async function rejeitar(formData: FormData) {
  "use server";
  if (!(await podeGerenciar())) return;
  await rejeitarFila(getDb(), Number(formData.get("id")));
  revalidatePath(ROTA);
}

const wrap = "min-h-screen bg-neutral-50 text-neutral-900 dark:bg-neutral-950 dark:text-neutral-100";
const input = "rounded-lg border border-neutral-300 bg-white px-2 py-1 text-neutral-900 outline-none focus:border-neutral-900 dark:border-neutral-700 dark:bg-neutral-900 dark:text-neutral-100";
const btn = "rounded-lg bg-emerald-700 px-3 py-1.5 text-sm font-semibold text-white hover:bg-emerald-800";
const btnGhost = "rounded-lg border border-neutral-300 px-2 py-1 text-xs font-medium text-neutral-800 hover:bg-neutral-100 dark:border-neutral-700 dark:text-neutral-200 dark:hover:bg-neutral-900";

export default async function AssinaturasPage() {
  const session = await auth();
  const papel = session?.user?.papel;

  if (!papel || !(podeAcessar(papel, "config") || podeAcessar(papel, "caixa"))) {
    return (
      <main className={wrap}>
        <div className="mx-auto max-w-2xl px-5 py-10">
          <p role="alert" className="text-sm text-neutral-700 dark:text-neutral-300">Sem acesso a esta página.</p>
        </div>
      </main>
    );
  }

  const db = getDb();
  const gerenciar = podeAcessar(papel, "config");
  const [planos, clientes] = await Promise.all([listarPlanos(db), listarClientes(db)]);
  const assinaturas = await db
    .select({ id: schema.assinaturas.id, status: schema.assinaturas.status, clienteNome: schema.clientes.nome, planoNome: schema.planos.nome })
    .from(schema.assinaturas)
    .innerJoin(schema.clientes, eq(schema.clientes.id, schema.assinaturas.clienteId))
    .innerJoin(schema.planos, eq(schema.planos.id, schema.assinaturas.planoId));
  const fila = await listarFila(db);

  return (
    <main className={wrap}>
      <div className="mx-auto max-w-3xl px-5 py-10">
        <h1 className="text-2xl font-bold tracking-tight">Assinaturas</h1>
        <p className="mt-1 text-sm text-neutral-600">Planos Flex/Premium e status dos assinantes.</p>

        {gerenciar ? (
          <section className="mt-6">
            <h2 className="mb-3 text-lg font-semibold">Novo plano</h2>
            <form action={novoPlano} className="flex flex-wrap items-end gap-2 rounded-xl border border-neutral-200 bg-white p-4 dark:border-neutral-800 dark:bg-neutral-900">
              <label className="flex flex-col gap-1 text-xs font-medium">Nome<input name="nome" required aria-label="Nome do plano" data-testid="ass-nome" className={input} /></label>
              <label className="flex flex-col gap-1 text-xs font-medium">Tipo<select name="tipo" aria-label="Tipo" data-testid="ass-tipo" className={input}><option value="flex">Flex</option><option value="premium">Premium</option></select></label>
              <label className="flex flex-col gap-1 text-xs font-medium">Preço<input name="preco" required inputMode="decimal" aria-label="Preço" className={`${input} w-20`} /></label>
              <label className="flex flex-col gap-1 text-xs font-medium">Desc. serv %<input name="descServico" type="number" min={0} defaultValue={0} aria-label="Desconto serviço" className={`${input} w-16`} /></label>
              <label className="flex flex-col gap-1 text-xs font-medium">Desc. prod %<input name="descProduto" type="number" min={0} defaultValue={0} aria-label="Desconto produto" className={`${input} w-16`} /></label>
              <label className="flex flex-col gap-1 text-xs font-medium">Dias (Flex)<input name="dias" placeholder="2,3,4" aria-label="Dias" className={`${input} w-20`} /></label>
              <button type="submit" className={btn}>Criar plano</button>
            </form>
          </section>
        ) : null}

        <section className="mt-8">
          <h2 className="mb-3 text-lg font-semibold">Planos ({planos.length})</h2>
          <div className="flex flex-col gap-2">
            {planos.map((p) => (
              <div key={p.id} data-plano={p.nome} className="flex flex-wrap items-center gap-3 rounded-lg border border-neutral-200 bg-white p-3 text-sm dark:border-neutral-800 dark:bg-neutral-900">
                <span className="font-medium">{p.nome}</span>
                <span className="rounded bg-neutral-100 px-1.5 py-0.5 text-xs dark:bg-neutral-800">{p.tipo}</span>
                <span className="text-neutral-500">{brl(p.precoCentavos)}/mês</span>
                <span className="text-neutral-500">serv -{p.descontoServicoPct}% · prod -{p.descontoProdutoPct}%</span>
              </div>
            ))}
            {planos.length === 0 ? <p className="text-sm text-neutral-600">Nenhum plano.</p> : null}
          </div>
        </section>

        <section className="mt-8">
          <h2 className="mb-3 text-lg font-semibold">Assinantes ({assinaturas.length})</h2>
          {gerenciar && clientes.length > 0 && planos.length > 0 ? (
            <form action={novaAssinatura} className="mb-3 flex flex-wrap items-end gap-2">
              <select name="clienteId" aria-label="Cliente" className={input}>{clientes.map((c) => <option key={c.id} value={c.id}>{c.nome}</option>)}</select>
              <select name="planoId" aria-label="Plano" className={input}>{planos.map((p) => <option key={p.id} value={p.id}>{p.nome}</option>)}</select>
              <button type="submit" className={btnGhost}>Assinar</button>
            </form>
          ) : null}
          <div className="flex flex-col gap-2">
            {assinaturas.map((a) => (
              <div key={a.id} className="flex flex-wrap items-center gap-3 rounded-lg border border-neutral-200 bg-white p-3 text-sm dark:border-neutral-800 dark:bg-neutral-900">
                <span className="font-medium">{a.clienteNome}</span>
                <span className="text-neutral-500">{a.planoNome}</span>
                <span className={`rounded-full px-2 py-0.5 text-xs font-semibold ${a.status === "ativa" ? "bg-emerald-100 text-emerald-800 dark:bg-emerald-900/40 dark:text-emerald-300" : a.status === "atraso" ? "bg-amber-100 text-amber-800 dark:bg-amber-900/40 dark:text-amber-300" : "bg-neutral-200 text-neutral-600 dark:bg-neutral-800"}`}>{a.status}</span>
                {gerenciar ? (
                  <form action={mudarStatus} className="ml-auto flex items-center gap-1">
                    <input type="hidden" name="id" value={a.id} />
                    <select name="status" defaultValue={a.status} aria-label={`Status de ${a.clienteNome}`} className={input}><option value="ativa">ativa</option><option value="atraso">atraso</option><option value="cancelada">cancelada</option></select>
                    <button type="submit" className={btnGhost}>Salvar</button>
                  </form>
                ) : null}
              </div>
            ))}
            {assinaturas.length === 0 ? <p className="text-sm text-neutral-600">Nenhum assinante.</p> : null}
          </div>
        </section>

        <section className="mt-8">
          <h2 className="mb-3 text-lg font-semibold">Fila de espera</h2>
          {clientes.length > 0 && planos.length > 0 ? (
            <form action={pedir} className="mb-3 flex flex-wrap items-end gap-2">
              <select name="clienteId" aria-label="Cliente da fila" data-testid="fila-cliente" className={input}>{clientes.map((c) => <option key={c.id} value={c.id}>{c.nome}</option>)}</select>
              <select name="planoId" aria-label="Plano da fila" data-testid="fila-plano" className={input}>{planos.map((p) => <option key={p.id} value={p.id}>{p.nome}</option>)}</select>
              <button type="submit" className={btnGhost}>Pedir assinatura</button>
            </form>
          ) : null}
          <div className="flex flex-col gap-2">
            {fila.filter((f) => f.status === "aguardando").map((f) => (
              <div key={f.id} data-fila={f.clienteNome} className="flex flex-wrap items-center gap-3 rounded-lg border border-neutral-200 bg-white p-3 text-sm dark:border-neutral-800 dark:bg-neutral-900">
                <span className="font-medium">{f.clienteNome}</span>
                <span className="text-neutral-500">{f.planoNome}</span>
                <span className="rounded-full bg-amber-100 px-2 py-0.5 text-xs font-semibold text-amber-800 dark:bg-amber-900/40 dark:text-amber-300">aguardando</span>
                {gerenciar ? (
                  <span className="ml-auto flex gap-1">
                    <form action={aprovar}><input type="hidden" name="id" value={f.id} /><button type="submit" className={btn}>Aprovar</button></form>
                    <form action={rejeitar}><input type="hidden" name="id" value={f.id} /><button type="submit" className={btnGhost}>Rejeitar</button></form>
                  </span>
                ) : null}
              </div>
            ))}
            {fila.filter((f) => f.status === "aguardando").length === 0 ? <p className="text-sm text-neutral-600">Fila vazia.</p> : null}
          </div>
        </section>
      </div>
    </main>
  );
}
