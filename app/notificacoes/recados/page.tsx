import { revalidatePath } from "next/cache";
import { redirect } from "next/navigation";
import { auth } from "@/auth";
import { getDb } from "@/lib/db";
import { podeAcessar } from "@/lib/auth/rbac";
import {
  criarRecado,
  editarRecado,
  definirRecadoAtivo,
  removerRecado,
  listarRecados,
  TIPOS_RECADO,
  type TipoRecado,
} from "@/lib/recados";
import PageHeader from "@/components/PageHeader";
import Aviso from "@/components/Aviso";

export const dynamic = "force-dynamic";
const ROTA = "/notificacoes/recados";

const rotuloTipo: Record<string, string> = {
  info: "Informação",
  alerta: "Atenção",
  comemoracao: "Comemoração",
};

async function autorizado() {
  const session = await auth();
  return Boolean(session?.user?.papel && podeAcessar(session.user.papel, "config"));
}

function dadosDoForm(formData: FormData) {
  return {
    mensagem: String(formData.get("mensagem") || ""),
    tipo: String(formData.get("tipo") || "info") as TipoRecado,
    expiraEm: String(formData.get("expiraEm") || "") || null,
  };
}

async function publicar(formData: FormData) {
  "use server";
  if (!(await autorizado())) return;
  try {
    await criarRecado(getDb(), dadosDoForm(formData));
  } catch (e) {
    redirect(`${ROTA}?erro=${encodeURIComponent(e instanceof Error ? e.message : "erro ao publicar")}`);
  }
  revalidatePath(ROTA);
  redirect(`${ROTA}?ok=${encodeURIComponent("Recado publicado para a equipe.")}`);
}

async function salvar(formData: FormData) {
  "use server";
  if (!(await autorizado())) return;
  try {
    await editarRecado(getDb(), Number(formData.get("id")), dadosDoForm(formData));
  } catch (e) {
    redirect(`${ROTA}?erro=${encodeURIComponent(e instanceof Error ? e.message : "erro ao salvar")}`);
  }
  revalidatePath(ROTA);
  redirect(`${ROTA}?ok=${encodeURIComponent("Recado atualizado.")}`);
}

async function alternarAtivo(formData: FormData) {
  "use server";
  if (!(await autorizado())) return;
  const ativo = formData.get("ativo") === "1";
  await definirRecadoAtivo(getDb(), Number(formData.get("id")), ativo);
  revalidatePath(ROTA);
  redirect(`${ROTA}?ok=${encodeURIComponent(ativo ? "Recado publicado de novo." : "Recado tirado do ar.")}`);
}

async function excluir(formData: FormData) {
  "use server";
  if (!(await autorizado())) return;
  await removerRecado(getDb(), Number(formData.get("id")));
  revalidatePath(ROTA);
  redirect(`${ROTA}?ok=${encodeURIComponent("Recado excluído.")}`);
}

const wrap = "min-h-screen bg-neutral-50 text-neutral-900";
const input = "rounded-lg border border-neutral-300 bg-white px-2 py-1 text-neutral-900 outline-none focus:border-neutral-900";
const btn = "rounded-lg bg-emerald-700 px-3 py-1.5 text-sm font-semibold text-white hover:bg-emerald-800";
const btnGhost = "rounded-lg border border-neutral-300 px-2 py-1 text-xs font-medium text-neutral-800 hover:bg-neutral-100";

export default async function RecadosPage({ searchParams }: { searchParams: Promise<{ ok?: string; erro?: string }> }) {
  const sp = await searchParams;
  const session = await auth();
  const papel = session?.user?.papel;

  if (!papel || !podeAcessar(papel, "config")) {
    return (
      <main className={wrap}>
        <div className="mx-auto max-w-2xl px-5 py-10">
          <p role="alert" className="text-sm text-neutral-700">Sem acesso a esta página.</p>
        </div>
      </main>
    );
  }

  const recados = await listarRecados(getDb());
  const hoje = new Date();

  return (
    <main className={wrap}>
      <div className="mx-auto max-w-3xl px-5 py-10">
        <PageHeader
          titulo="Recados da equipe"
          descricao="O mural da barbearia: o que você escrever aqui aparece no topo do sistema para todo mundo que entrar — barbeiros e recepção."
          ajuda={
            <>
              <p>Use para recados que todos precisam ver: <em>“salário sai dia 5”</em>, <em>“festa na sexta”</em>, <em>“meta nova do mês”</em>.</p>
              <p><strong>Tipo</strong> muda só a cor: Informação (azul), Atenção (amarelo) e Comemoração (verde).</p>
              <p><strong>Validade</strong> é opcional. Com data, o recado some sozinho no dia seguinte — bom para avisos de evento.</p>
              <p>Cada pessoa pode fechar o recado no aparelho dela; um recado novo aparece para todos de novo.</p>
            </>
          }
        />

        <Aviso ok={sp?.ok} erro={sp?.erro} />

        <section className="mt-6">
          <h2 className="mb-3 text-lg font-semibold">Novo recado</h2>
          <form action={publicar} className="flex flex-wrap items-end gap-3 rounded-xl border border-neutral-200 bg-white p-4">
            <label className="flex min-w-64 flex-1 flex-col gap-1 text-xs font-medium">
              Recado
              <input name="mensagem" required maxLength={280} placeholder="Ex.: O salário sai dia 5." aria-label="Mensagem do recado" data-testid="rec-mensagem" className={input} />
            </label>
            <label className="flex flex-col gap-1 text-xs font-medium">
              Tipo
              <select name="tipo" aria-label="Tipo do recado" data-testid="rec-tipo" className={input}>
                {TIPOS_RECADO.map((t) => (
                  <option key={t} value={t}>{rotuloTipo[t]}</option>
                ))}
              </select>
            </label>
            <label className="flex flex-col gap-1 text-xs font-medium">
              Vale até (opcional)
              <input name="expiraEm" type="date" aria-label="Validade do recado" data-testid="rec-validade" className={input} />
            </label>
            <button type="submit" className={btn}>Publicar</button>
          </form>
        </section>

        <section className="mt-8">
          <h2 className="mb-3 text-lg font-semibold">Recados ({recados.length})</h2>
          <div className="flex flex-col gap-2">
            {recados.length === 0 ? (
              <p className="rounded-xl border border-dashed border-neutral-300 bg-white p-4 text-sm text-neutral-600">
                Nenhum recado ainda. O primeiro que você publicar aparece no topo da tela de todo mundo.
              </p>
            ) : (
              recados.map((r) => {
                const vencido = r.expiraEm != null && r.expiraEm <= hoje;
                const noAr = r.ativo && !vencido;
                return (
                  <div key={r.id} data-recado-linha={r.id} className="flex flex-wrap items-end gap-2 rounded-lg border border-neutral-200 bg-white p-3 text-sm">
                    <span className={`rounded-full px-2 py-0.5 text-xs font-semibold ${noAr ? "bg-emerald-100 text-emerald-800" : "bg-neutral-200 text-neutral-600"}`}>
                      {noAr ? "no ar" : vencido ? "vencido" : "fora do ar"}
                    </span>
                    <form action={salvar} className="flex flex-1 flex-wrap items-end gap-1">
                      <input type="hidden" name="id" value={r.id} />
                      <input name="mensagem" defaultValue={r.mensagem} maxLength={280} aria-label={`Mensagem do recado ${r.id}`} className={`${input} min-w-56 flex-1`} />
                      <select name="tipo" defaultValue={r.tipo} aria-label={`Tipo do recado ${r.id}`} className={input}>
                        {TIPOS_RECADO.map((t) => (
                          <option key={t} value={t}>{rotuloTipo[t]}</option>
                        ))}
                      </select>
                      <input
                        name="expiraEm"
                        type="date"
                        defaultValue={r.expiraEm ? r.expiraEm.toISOString().slice(0, 10) : ""}
                        aria-label={`Validade do recado ${r.id}`}
                        className={input}
                      />
                      <button type="submit" data-salvar-recado={r.id} className={btnGhost}>Salvar</button>
                    </form>
                    <form action={alternarAtivo}>
                      <input type="hidden" name="id" value={r.id} />
                      <input type="hidden" name="ativo" value={r.ativo ? "0" : "1"} />
                      <button type="submit" data-alternar-recado={r.id} className={btnGhost}>
                        {r.ativo ? "Tirar do ar" : "Publicar de novo"}
                      </button>
                    </form>
                    <form action={excluir}>
                      <input type="hidden" name="id" value={r.id} />
                      <button type="submit" data-excluir-recado={r.id} className="rounded-lg border border-red-300 px-2 py-1 text-xs font-medium text-red-700 hover:bg-red-50">
                        Excluir
                      </button>
                    </form>
                  </div>
                );
              })
            )}
          </div>
        </section>
      </div>
    </main>
  );
}
