import { revalidatePath } from "next/cache";
import { redirect } from "next/navigation";
import { auth } from "@/auth";
import { getDb } from "@/lib/db";
import { podeAcessar, PAPEIS, type Papel } from "@/lib/auth/rbac";
import { criarUsuario, listarUsuarios, definirAtivo, alterarPapel, resetarSenha , editarUsuario, removerUsuario } from "@/lib/auth/usuarios";
import { listarProfissionais } from "@/lib/profissionais";
import Aviso from "@/components/Aviso";

export const dynamic = "force-dynamic";
const ROTA = "/cadastros/usuarios";

const papelLabel: Record<Papel, string> = { dono: "Dono", recepcionista: "Recepção", barbeiro: "Barbeiro" };

async function autorizado() {
  const session = await auth();
  const papel = session?.user?.papel;
  return Boolean(papel && podeAcessar(papel, "config"));
}

async function novo(formData: FormData) {
  "use server";
  if (!(await autorizado())) return;
  const profissionalId = Number(formData.get("profissionalId"));
  await criarUsuario(getDb(), {
    email: String(formData.get("email") || ""),
    senha: String(formData.get("senha") || ""),
    nome: String(formData.get("nome") || ""),
    papel: String(formData.get("papel") || "barbeiro") as Papel,
    profissionalId: Number.isInteger(profissionalId) && profissionalId > 0 ? profissionalId : null,
  });
  revalidatePath(ROTA);
  redirect(`${ROTA}?ok=${encodeURIComponent("Login criado.")}`);
}

async function salvarDados(formData: FormData) {
  "use server";
  if (!(await autorizado())) return;
  try {
    await editarUsuario(getDb(), Number(formData.get("id")), String(formData.get("nome") || ""), String(formData.get("email") || ""));
  } catch (e) {
    redirect(`${ROTA}?erro=${encodeURIComponent(e instanceof Error ? e.message : "erro ao salvar")}`);
  }
  revalidatePath(ROTA);
  redirect(`${ROTA}?ok=${encodeURIComponent("Usuário atualizado.")}`);
}

async function excluirUsuario(formData: FormData) {
  "use server";
  if (!(await autorizado())) return;
  try {
    await removerUsuario(getDb(), Number(formData.get("id")));
  } catch (e) {
    redirect(`${ROTA}?erro=${encodeURIComponent(e instanceof Error ? e.message : "erro ao excluir")}`);
  }
  revalidatePath(ROTA);
  redirect(`${ROTA}?ok=${encodeURIComponent("Usuário excluído.")}`);
}

async function toggleAtivo(formData: FormData) {
  "use server";
  if (!(await autorizado())) return;
  await definirAtivo(getDb(), Number(formData.get("id")), formData.get("ativo") === "1");
  revalidatePath(ROTA);
  redirect(`${ROTA}?ok=${encodeURIComponent("Situação do usuário alterada.")}`);
}

async function mudarPapel(formData: FormData) {
  "use server";
  if (!(await autorizado())) return;
  await alterarPapel(getDb(), Number(formData.get("id")), String(formData.get("papel") || "barbeiro") as Papel);
  revalidatePath(ROTA);
  redirect(`${ROTA}?ok=${encodeURIComponent("Papel alterado.")}`);
}

async function trocarSenha(formData: FormData) {
  "use server";
  if (!(await autorizado())) return;
  await resetarSenha(getDb(), Number(formData.get("id")), String(formData.get("senha") || ""));
  revalidatePath(ROTA);
  redirect(`${ROTA}?ok=${encodeURIComponent("Senha redefinida.")}`);
}

const wrap = "min-h-screen bg-neutral-50 text-neutral-900 dark:bg-neutral-950 dark:text-neutral-100";
const input =
  "rounded-lg border border-neutral-300 bg-white px-2 py-1 text-neutral-900 outline-none focus:border-neutral-900 dark:border-neutral-700 dark:bg-neutral-900 dark:text-neutral-100";
const btn = "rounded-lg bg-emerald-700 px-3 py-1.5 text-sm font-semibold text-white hover:bg-emerald-800";
const btnGhost =
  "rounded-lg border border-neutral-300 px-3 py-1.5 text-xs font-medium text-neutral-800 hover:bg-neutral-100 dark:border-neutral-700 dark:text-neutral-200 dark:hover:bg-neutral-900";

export default async function CadastroUsuariosPage({ searchParams }: { searchParams: Promise<{ ok?: string; erro?: string }> }) {
  const sp = await searchParams;
  const session = await auth();
  const papel = session?.user?.papel;

  if (!papel || !podeAcessar(papel, "config")) {
    return (
      <main className={wrap}>
        <div className="mx-auto max-w-2xl px-5 py-10">
          <p role="alert" className="text-sm text-neutral-700 dark:text-neutral-300">Sem acesso a esta página.</p>
        </div>
      </main>
    );
  }

  const db = getDb();
  const [usuarios, profissionais] = await Promise.all([listarUsuarios(db), listarProfissionais(db)]);

  return (
    <main className={wrap}>
      <div className="mx-auto max-w-3xl px-5 py-10">
        <h1 className="text-2xl font-bold tracking-tight">Usuários / logins</h1>
        <p className="mt-1 text-sm text-neutral-600">Só o dono cria e gerencia os acessos ao sistema.</p>

        <Aviso ok={sp?.ok} erro={sp?.erro} />


        <section className="mt-8">
          <h2 className="mb-3 text-lg font-semibold">Novo usuário</h2>
          <form action={novo} className="flex flex-wrap items-end gap-3 rounded-xl border border-neutral-200 bg-white p-4 dark:border-neutral-800 dark:bg-neutral-900">
            <label className="flex flex-col gap-1 text-xs font-medium">Nome
              <input name="nome" required aria-label="Nome do usuário" data-testid="usr-nome" className={input} />
            </label>
            <label className="flex flex-col gap-1 text-xs font-medium">E-mail
              <input name="email" type="email" required aria-label="E-mail do usuário" data-testid="usr-email" className={input} />
            </label>
            <label className="flex flex-col gap-1 text-xs font-medium">Senha
              <input name="senha" type="text" required aria-label="Senha do usuário" data-testid="usr-senha" className={input} />
            </label>
            <label className="flex flex-col gap-1 text-xs font-medium">Papel
              <select name="papel" aria-label="Papel do usuário" data-testid="usr-papel" defaultValue="barbeiro" className={input}>
                {PAPEIS.map((p) => (
                  <option key={p} value={p}>{papelLabel[p]}</option>
                ))}
              </select>
            </label>
            <label className="flex flex-col gap-1 text-xs font-medium">Profissional
              <select name="profissionalId" aria-label="Profissional vinculado" data-testid="usr-profissional" className={input} defaultValue="">
                <option value="">— nenhum —</option>
                {profissionais.map((p) => (
                  <option key={p.id} value={p.id}>{p.nome}</option>
                ))}
              </select>
            </label>
            <button type="submit" className={btn}>Criar login</button>
          </form>
        </section>

        <section className="mt-8">
          <h2 className="mb-3 text-lg font-semibold">Usuários ({usuarios.length})</h2>
          <div className="flex flex-col gap-2">
            {usuarios.map((u) => (
              <div key={u.id} data-usuario={u.email} className="flex flex-wrap items-center gap-3 rounded-lg border border-neutral-200 bg-white p-3 text-sm dark:border-neutral-800 dark:bg-neutral-900">
                <span className="font-medium">{u.nome}</span>
                <span className="text-xs text-neutral-500">{u.email}</span>
                <span className={`rounded-full px-2 py-0.5 text-xs font-semibold ${u.ativo ? "bg-emerald-100 text-emerald-800 dark:bg-emerald-900/40 dark:text-emerald-300" : "bg-neutral-200 text-neutral-600 dark:bg-neutral-800"}`}>
                  {u.ativo ? "ativo" : "inativo"}
                </span>
                <form action={salvarDados} className="flex items-end gap-1">
                  <input type="hidden" name="id" value={u.id} />
                  <input name="nome" defaultValue={u.nome} aria-label={`Nome de ${u.email}`} className={`${input} w-32`} />
                  <input name="email" type="email" defaultValue={u.email} aria-label={`E-mail de ${u.email}`} className={`${input} w-44`} />
                  <button type="submit" data-salvar-usuario={u.email} className={btnGhost}>Salvar</button>
                </form>
                <form action={excluirUsuario} className="flex items-end">
                  <input type="hidden" name="id" value={u.id} />
                  <button type="submit" data-excluir-usuario={u.email} className="rounded-lg border border-red-300 px-2 py-1 text-xs font-medium text-red-700 hover:bg-red-50">
                    Excluir
                  </button>
                </form>
                <form action={mudarPapel} className="flex items-center gap-1">
                  <input type="hidden" name="id" value={u.id} />
                  <select name="papel" defaultValue={u.papel} aria-label={`Papel de ${u.email}`} className={input}>
                    {PAPEIS.map((p) => (
                      <option key={p} value={p}>{papelLabel[p]}</option>
                    ))}
                  </select>
                  <button type="submit" className={btnGhost}>Papel</button>
                </form>
                <form action={trocarSenha} className="flex items-center gap-1">
                  <input type="hidden" name="id" value={u.id} />
                  <input name="senha" type="text" placeholder="nova senha" aria-label={`Nova senha de ${u.email}`} className={`${input} w-28`} />
                  <button type="submit" className={btnGhost}>Reset</button>
                </form>
                <form action={toggleAtivo}>
                  <input type="hidden" name="id" value={u.id} />
                  <input type="hidden" name="ativo" value={u.ativo ? "0" : "1"} />
                  <button type="submit" className={btnGhost}>{u.ativo ? "Desativar" : "Ativar"}</button>
                </form>
              </div>
            ))}
          </div>
        </section>
      </div>
    </main>
  );
}
