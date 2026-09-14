import { revalidatePath } from "next/cache";
import { redirect } from "next/navigation";
import { auth } from "@/auth";
import { getDb } from "@/lib/db";
import { eq } from "drizzle-orm";
import * as schema from "@/lib/db/schema";
import { podeAcessar } from "@/lib/auth/rbac";
import { listarClientes } from "@/lib/clientes";
import { criarPlano, listarPlanos, criarAssinatura, definirStatusAssinatura, type TipoPlano , editarPlano, definirPlanoAtivo, removerPlano, trocarPlanoAssinatura } from "@/lib/assinaturas";
import { pedirAssinatura, listarFila, aprovarFila, rejeitarFila } from "@/lib/cobranca";
import PageHeader from "@/components/PageHeader";
import Aviso from "@/components/Aviso";
import { reaisParaCentavosPositivo, RECADO_VALOR_INVALIDO } from "@/lib/dinheiro";

export const dynamic = "force-dynamic";
const ROTA = "/assinaturas";
const brl = (c: number) => (c / 100).toLocaleString("pt-BR", { style: "currency", currency: "BRL" });

async function podeGerenciar() {
  const session = await auth();
  return Boolean(session?.user?.papel && podeAcessar(session.user.papel, "config"));
}

async function novoPlano(formData: FormData) {
  "use server";
  if (!(await podeGerenciar())) return;
  const preco = reaisParaCentavosPositivo(String(formData.get("preco") || ""));
  if (preco === null) redirect(`${ROTA}?erro=${encodeURIComponent(RECADO_VALOR_INVALIDO)}`);
  await criarPlano(getDb(), {
    nome: String(formData.get("nome") || ""),
    tipo: String(formData.get("tipo") || "flex") as TipoPlano,
    precoCentavos: preco,
    descontoServicoPct: Number(formData.get("descServico")) || 0,
    descontoProdutoPct: Number(formData.get("descProduto")) || 0,
    dias: String(formData.get("dias") || ""),
  });
  revalidatePath(ROTA);
  redirect(`${ROTA}?ok=${encodeURIComponent("Plano criado.")}`);
}

async function salvarPlano(formData: FormData) {
  "use server";
  if (!(await podeGerenciar())) return;
  const preco = reaisParaCentavosPositivo(String(formData.get("preco") || ""));
  if (preco === null) redirect(`${ROTA}?erro=${encodeURIComponent(RECADO_VALOR_INVALIDO)}`);
  try {
    await editarPlano(getDb(), Number(formData.get("id")), {
      nome: String(formData.get("nome") || ""),
      tipo: String(formData.get("tipo") || "flex") as TipoPlano,
      precoCentavos: preco,
      descontoServicoPct: Number(formData.get("descServico")) || 0,
      descontoProdutoPct: Number(formData.get("descProduto")) || 0,
      dias: String(formData.get("dias") || ""),
    });
  } catch (e) {
    redirect(`${ROTA}?erro=${encodeURIComponent(e instanceof Error ? e.message : "erro ao salvar")}`);
  }
  revalidatePath(ROTA);
  redirect(`${ROTA}?ok=${encodeURIComponent("Plano atualizado.")}`);
}

async function desativarPlano(formData: FormData) {
  "use server";
  if (!(await podeGerenciar())) return;
  await definirPlanoAtivo(getDb(), Number(formData.get("id")), false);
  revalidatePath(ROTA);
  redirect(`${ROTA}?ok=${encodeURIComponent("Plano desativado.")}`);
}

async function excluirPlano(formData: FormData) {
  "use server";
  if (!(await podeGerenciar())) return;
  try {
    await removerPlano(getDb(), Number(formData.get("id")));
  } catch (e) {
    redirect(`${ROTA}?erro=${encodeURIComponent(e instanceof Error ? e.message : "erro ao excluir")}`);
  }
  revalidatePath(ROTA);
}

async function trocarPlano(formData: FormData) {
  "use server";
  if (!(await podeGerenciar())) return;
  await trocarPlanoAssinatura(getDb(), Number(formData.get("id")), Number(formData.get("planoId")));
  revalidatePath(ROTA);
  redirect(`${ROTA}?ok=${encodeURIComponent("Plano da assinatura trocado.")}`);
}

async function novaAssinatura(formData: FormData) {
  "use server";
  if (!(await podeGerenciar())) return;
  await criarAssinatura(getDb(), Number(formData.get("clienteId")), Number(formData.get("planoId")));
  revalidatePath(ROTA);
  redirect(`${ROTA}?ok=${encodeURIComponent("Assinatura criada.")}`);
}

async function mudarStatus(formData: FormData) {
  "use server";
  if (!(await podeGerenciar())) return;
  await definirStatusAssinatura(getDb(), Number(formData.get("id")), String(formData.get("status")) as "ativa" | "atraso" | "cancelada");
  revalidatePath(ROTA);
  redirect(`${ROTA}?ok=${encodeURIComponent("Situação da assinatura alterada.")}`);
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
  redirect(`${ROTA}?ok=${encodeURIComponent("Pedido enviado para a fila de espera.")}`);
}
async function aprovar(formData: FormData) {
  "use server";
  if (!(await podeGerenciar())) return;
  await aprovarFila(getDb(), Number(formData.get("id")));
  revalidatePath(ROTA);
  redirect(`${ROTA}?ok=${encodeURIComponent("Assinatura aprovada.")}`);
}
async function rejeitar(formData: FormData) {
  "use server";
  if (!(await podeGerenciar())) return;
  await rejeitarFila(getDb(), Number(formData.get("id")));
  revalidatePath(ROTA);
  redirect(`${ROTA}?ok=${encodeURIComponent("Pedido rejeitado.")}`);
}

const wrap = "min-h-screen bg-neutral-50 text-neutral-900 dark:bg-neutral-950 dark:text-neutral-100";
const input = "rounded-lg border border-neutral-300 bg-white px-2 py-1 text-neutral-900 outline-none focus:border-neutral-900 dark:border-neutral-700 dark:bg-neutral-900 dark:text-neutral-100";
const btn = "rounded-lg bg-emerald-700 px-3 py-1.5 text-sm font-semibold text-white hover:bg-emerald-800";
const btnGhost = "rounded-lg border border-neutral-300 px-2 py-1 text-xs font-medium text-neutral-800 hover:bg-neutral-100 dark:border-neutral-700 dark:text-neutral-200 dark:hover:bg-neutral-900";

export default async function AssinaturasPage({ searchParams }: { searchParams: Promise<{ ok?: string; erro?: string }> }) {
  const sp = await searchParams;
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
    .select({ id: schema.assinaturas.id, status: schema.assinaturas.status, planoId: schema.assinaturas.planoId, clienteNome: schema.clientes.nome, planoNome: schema.planos.nome })
    .from(schema.assinaturas)
    .innerJoin(schema.clientes, eq(schema.clientes.id, schema.assinaturas.clienteId))
    .innerJoin(schema.planos, eq(schema.planos.id, schema.assinaturas.planoId));
  const fila = await listarFila(db);

  return (
    <main className={wrap}>
      <div className="mx-auto max-w-3xl px-5 py-10">
        <PageHeader
          titulo="Assinaturas"
          descricao="Clientes que pagam mensalidade pra cortar sempre: planos Flex (ter–qui) e Premium (todo dia), fila de espera e status de cada assinante."
          ajuda={
            <>
              <p><strong>Planos</strong> — Flex vale de terça a quinta e dá 10%/5% de desconto em serviços extras/produtos; Premium vale todo dia e dá 20%/10%.</p>
              <p><strong>Fila de espera</strong> — o cliente pede a assinatura (ou a recepção pede por ele) e o dono aprova aqui.</p>
              <p><strong>Atraso</strong> — assinante em atraso fica bloqueado de agendar até regularizar.</p>
              <p>O dinheiro das assinaturas não paga comissão direta: vira o <strong>Pote</strong> (menu Gestão → Pote).</p>
            </>
          }
        />

        <Aviso ok={sp?.ok} erro={sp?.erro} />

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
                {gerenciar ? (
                  <>
                    <form action={salvarPlano} className="ml-auto flex flex-wrap items-end gap-1">
                      <input type="hidden" name="id" value={p.id} />
                      <input name="nome" defaultValue={p.nome} aria-label={`Nome do plano ${p.nome}`} className={`${input} w-40`} />
                      <select name="tipo" defaultValue={p.tipo} aria-label={`Tipo do plano ${p.nome}`} className={input}>
                        <option value="flex">flex</option>
                        <option value="premium">premium</option>
                      </select>
                      <input name="preco" defaultValue={(p.precoCentavos / 100).toFixed(2)} inputMode="decimal" aria-label={`Preço do plano ${p.nome}`} className={`${input} w-20`} />
                      <input name="descServico" type="number" min={0} max={100} defaultValue={p.descontoServicoPct} aria-label={`Desconto de serviço do plano ${p.nome}`} className={`${input} w-14`} />
                      <input name="descProduto" type="number" min={0} max={100} defaultValue={p.descontoProdutoPct} aria-label={`Desconto de produto do plano ${p.nome}`} className={`${input} w-14`} />
                      <input name="dias" defaultValue={p.dias} aria-label={`Dias do plano ${p.nome}`} className={`${input} w-20`} />
                      <button type="submit" data-salvar-plano={p.nome} className={btnGhost}>Salvar</button>
                    </form>
                    <form action={desativarPlano}>
                      <input type="hidden" name="id" value={p.id} />
                      <button type="submit" data-desativar-plano={p.nome} className={btnGhost}>Desativar</button>
                    </form>
                    <form action={excluirPlano}>
                      <input type="hidden" name="id" value={p.id} />
                      <button type="submit" data-excluir-plano={p.nome} className="rounded-lg border border-red-300 px-2 py-1 text-xs font-medium text-red-700 hover:bg-red-50">Excluir</button>
                    </form>
                  </>
                ) : null}
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
                {gerenciar ? (
                  <form action={trocarPlano} className="flex items-center gap-1">
                    <input type="hidden" name="id" value={a.id} />
                    <select name="planoId" defaultValue={a.planoId} aria-label={`Trocar plano de ${a.clienteNome}`} className={input}>
                      {planos.map((pl) => <option key={pl.id} value={pl.id}>{pl.nome}</option>)}
                    </select>
                    <button type="submit" data-trocar-plano={a.clienteNome} className={btnGhost}>Trocar plano</button>
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
