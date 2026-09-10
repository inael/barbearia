import { revalidatePath } from "next/cache";
import { redirect } from "next/navigation";
import { auth } from "@/auth";
import { getDb } from "@/lib/db";
import { podeAcessar } from "@/lib/auth/rbac";
import { criarCliente, editarCliente, completarCadastro, listarClientes, removerCliente } from "@/lib/clientes";
import Aviso from "@/components/Aviso";

export const dynamic = "force-dynamic";
const ROTA = "/cadastros/clientes";

async function autorizado() {
  const session = await auth();
  const papel = session?.user?.papel;
  return Boolean(papel && podeAcessar(papel, "cadastro"));
}

async function novo(formData: FormData) {
  "use server";
  if (!(await autorizado())) return;
  await criarCliente(getDb(), {
    nome: String(formData.get("nome") || ""),
    telefone: String(formData.get("telefone") || ""),
    cpf: String(formData.get("cpf") || ""),
  });
  revalidatePath(ROTA);
  redirect(`${ROTA}?ok=${encodeURIComponent("Cliente cadastrado.")}`);
}

async function excluir(formData: FormData) {
  "use server";
  if (!(await autorizado())) return;
  try {
    await removerCliente(getDb(), Number(formData.get("id")));
  } catch (e) {
    redirect(`${ROTA}?erro=${encodeURIComponent(e instanceof Error ? e.message : "erro ao excluir")}`);
  }
  revalidatePath(ROTA);
  redirect(`${ROTA}?ok=${encodeURIComponent("Excluído.")}`);
}

async function salvar(formData: FormData) {
  "use server";
  if (!(await autorizado())) return;
  await editarCliente(getDb(), Number(formData.get("id")), {
    nome: String(formData.get("nome") || ""),
    telefone: String(formData.get("telefone") || ""),
  });
  revalidatePath(ROTA);
  redirect(`${ROTA}?ok=${encodeURIComponent("Cliente atualizado.")}`);
}

async function definirCpf(formData: FormData) {
  "use server";
  if (!(await autorizado())) return;
  await completarCadastro(getDb(), Number(formData.get("id")), String(formData.get("cpf") || ""));
  revalidatePath(ROTA);
  redirect(`${ROTA}?ok=${encodeURIComponent("CPF salvo.")}`);
}

const wrap = "min-h-screen bg-neutral-50 text-neutral-900 dark:bg-neutral-950 dark:text-neutral-100";
const input =
  "rounded-lg border border-neutral-300 bg-white px-2 py-1 text-neutral-900 outline-none focus:border-neutral-900 dark:border-neutral-700 dark:bg-neutral-900 dark:text-neutral-100";
const btn = "rounded-lg bg-emerald-700 px-3 py-1.5 text-sm font-semibold text-white hover:bg-emerald-800";
const btnGhost =
  "rounded-lg border border-neutral-300 px-3 py-1.5 text-xs font-medium text-neutral-800 hover:bg-neutral-100 dark:border-neutral-700 dark:text-neutral-200 dark:hover:bg-neutral-900";

export default async function CadastroClientesPage({ searchParams }: { searchParams: Promise<{ ok?: string; erro?: string }> }) {
  const sp = await searchParams;
  const session = await auth();
  const papel = session?.user?.papel;

  if (!papel || !podeAcessar(papel, "cadastro")) {
    return (
      <main className={wrap}>
        <div className="mx-auto max-w-2xl px-5 py-10">
          <p role="alert" className="text-sm text-neutral-700 dark:text-neutral-300">Sem acesso a esta página.</p>
        </div>
      </main>
    );
  }

  const clientes = await listarClientes(getDb());

  return (
    <main className={wrap}>
      <div className="mx-auto max-w-3xl px-5 py-10">
        <h1 className="text-2xl font-bold tracking-tight">Clientes</h1>
        <p className="mt-1 text-sm text-neutral-600">Pré-cadastro é nome + telefone. CPF só quando o cliente pedir nota fiscal.</p>

        <Aviso ok={sp?.ok} erro={sp?.erro} />


        <section className="mt-8">
          <h2 className="mb-3 text-lg font-semibold">Novo cliente</h2>
          <form action={novo} className="flex flex-wrap items-end gap-3 rounded-xl border border-neutral-200 bg-white p-4 dark:border-neutral-800 dark:bg-neutral-900">
            <label className="flex flex-col gap-1 text-xs font-medium">Nome
              <input name="nome" required aria-label="Nome do cliente" data-testid="cli-nome" className={input} />
            </label>
            <label className="flex flex-col gap-1 text-xs font-medium">Telefone
              <input name="telefone" required aria-label="Telefone do cliente" data-testid="cli-telefone" className={input} />
            </label>
            <label className="flex flex-col gap-1 text-xs font-medium">CPF (opcional)
              <input name="cpf" aria-label="CPF do cliente" className={input} />
            </label>
            <button type="submit" className={btn}>Cadastrar</button>
          </form>
        </section>

        <section className="mt-8">
          <h2 className="mb-3 text-lg font-semibold">Clientes ({clientes.length})</h2>
          <div className="flex flex-col gap-2">
            {clientes.map((c) => (
              <div key={c.id} data-cliente={c.nome} className="flex flex-wrap items-end gap-2 rounded-lg border border-neutral-200 bg-white p-3 text-sm dark:border-neutral-800 dark:bg-neutral-900">
                <form action={salvar} className="flex flex-wrap items-end gap-2">
                  <input type="hidden" name="id" value={c.id} />
                  <label className="flex flex-col gap-1 text-xs">Nome
                    <input name="nome" defaultValue={c.nome} aria-label={`Nome de ${c.nome}`} className={input} />
                  </label>
                  <label className="flex flex-col gap-1 text-xs">Telefone
                    <input name="telefone" defaultValue={c.telefone} aria-label={`Telefone de ${c.nome}`} className={input} />
                  </label>
                  <button type="submit" data-salvar-cliente={c.nome} className={btnGhost}>Salvar</button>
                </form>
                <form action={excluir} className="flex items-end">
                  <input type="hidden" name="id" value={c.id} />
                  <button
                    type="submit"
                    data-excluir-cliente={c.nome}
                    className="rounded-lg border border-red-300 px-2 py-1 text-xs font-medium text-red-700 hover:bg-red-50"
                  >
                    Excluir
                  </button>
                </form>
                <form action={definirCpf} className="flex items-end gap-2">
                  <input type="hidden" name="id" value={c.id} />
                  <label className="flex flex-col gap-1 text-xs">CPF
                    <input name="cpf" defaultValue={c.cpf ?? ""} aria-label={`CPF de ${c.nome}`} className={input} />
                  </label>
                  <button type="submit" className={btnGhost}>Salvar CPF</button>
                </form>
              </div>
            ))}
            {clientes.length === 0 ? <p className="text-sm text-neutral-600">Nenhum cliente ainda.</p> : null}
          </div>
        </section>
      </div>
    </main>
  );
}
