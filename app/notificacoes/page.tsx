import { revalidatePath } from "next/cache";
import { redirect } from "next/navigation";
import { auth } from "@/auth";
import { getDb } from "@/lib/db";
import { podeAcessar } from "@/lib/auth/rbac";
import { listarNotificacoes, marcarLida, definirConfig, eventoAtivo } from "@/lib/notificacoes";
import PageHeader from "@/components/PageHeader";
import Aviso from "@/components/Aviso";

export const dynamic = "force-dynamic";
const ROTA = "/notificacoes";
const EVENTOS = [
  { key: "pedido_compra", label: "Pedido de compra" },
  { key: "anomalia_consumo", label: "Consumo fora do padrão" },
];

async function autorizado() {
  const session = await auth();
  return Boolean(session?.user?.papel && podeAcessar(session.user.papel, "config"));
}

async function marcar(formData: FormData) {
  "use server";
  if (!(await autorizado())) return;
  await marcarLida(getDb(), Number(formData.get("id")));
  revalidatePath(ROTA);
  redirect(`${ROTA}?ok=${encodeURIComponent("Aviso marcado como lido.")}`);
}

async function toggle(formData: FormData) {
  "use server";
  if (!(await autorizado())) return;
  await definirConfig(getDb(), String(formData.get("evento")), formData.get("ativo") === "1");
  revalidatePath(ROTA);
  redirect(`${ROTA}?ok=${encodeURIComponent("Preferência de aviso alterada.")}`);
}

const wrap = "min-h-screen bg-neutral-50 text-neutral-900 dark:bg-neutral-950 dark:text-neutral-100";
const btnGhost = "rounded-lg border border-neutral-300 px-3 py-1.5 text-xs font-medium text-neutral-800 hover:bg-neutral-100 dark:border-neutral-700 dark:text-neutral-200 dark:hover:bg-neutral-900";

export default async function NotificacoesPage({ searchParams }: { searchParams: Promise<{ ok?: string; erro?: string }> }) {
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
  const notifs = await listarNotificacoes(db);
  const ativos = await Promise.all(EVENTOS.map(async (e) => ({ ...e, ativo: await eventoAtivo(db, e.key) })));

  return (
    <main className={wrap}>
      <div className="mx-auto max-w-3xl px-5 py-10">
        <PageHeader
          titulo="Notificações do dono"
          descricao="O canal do chefe: avisos que o sistema gera sozinho (pedido de compra, consumo fora do padrão) pra você agir sem precisar caçar tela por tela."
          ajuda={
            <>
              <p>Ligue/desligue cada tipo de aviso na lista “O que me notifica”.</p>
              <p>Com o WhatsApp conectado, esses avisos também chegam no seu número.</p>
            </>
          }
        />

        <Aviso ok={sp?.ok} erro={sp?.erro} />

        <section className="mt-6">
          <h2 className="mb-3 text-lg font-semibold">O que me notifica</h2>
          <div className="flex flex-wrap gap-2">
            {ativos.map((e) => (
              <form key={e.key} action={toggle}>
                <input type="hidden" name="evento" value={e.key} />
                <input type="hidden" name="ativo" value={e.ativo ? "0" : "1"} />
                <button type="submit" className={`${btnGhost} ${e.ativo ? "border-emerald-600 text-emerald-700 dark:text-emerald-400" : ""}`}>
                  {e.label}: {e.ativo ? "ligado" : "desligado"}
                </button>
              </form>
            ))}
          </div>
        </section>

        <section className="mt-8">
          <h2 className="mb-3 text-lg font-semibold">Notificações ({notifs.length})</h2>
          <div className="flex flex-col gap-2">
            {notifs.length === 0 ? <p className="text-sm text-neutral-600">Nenhuma notificação.</p> : notifs.map((n) => (
              <div key={n.id} data-notif={n.evento} className={`flex flex-wrap items-center gap-3 rounded-lg border p-3 text-sm ${n.lida ? "border-neutral-200 bg-white dark:border-neutral-800 dark:bg-neutral-900" : "border-emerald-300 bg-emerald-50 dark:border-emerald-800 dark:bg-emerald-950/40"}`}>
                <span className="rounded bg-neutral-100 px-1.5 py-0.5 text-xs dark:bg-neutral-800">{n.evento}</span>
                <span>{n.mensagem}</span>
                {n.lida ? <span className="ml-auto text-xs text-neutral-500">lida</span> : (
                  <form action={marcar} className="ml-auto">
                    <input type="hidden" name="id" value={n.id} />
                    <button type="submit" className={btnGhost}>Marcar lida</button>
                  </form>
                )}
              </div>
            ))}
          </div>
        </section>
      </div>
    </main>
  );
}
