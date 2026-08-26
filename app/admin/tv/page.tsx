import { revalidatePath } from "next/cache";
import { auth } from "@/auth";
import { getDb } from "@/lib/db";
import { podeAcessar } from "@/lib/auth/rbac";
import { listarTelas, criarTela, adicionarItem, removerItem, listarItens } from "@/lib/tv";
import { uploadMidia, getStorageClient } from "@/lib/tv-upload";
import PageHeader from "@/components/PageHeader";

export const dynamic = "force-dynamic";
const ROTA = "/admin/tv";

async function autorizado() {
  const session = await auth();
  const papel = session?.user?.papel;
  return Boolean(papel && podeAcessar(papel, "tv"));
}

async function novaTela(formData: FormData) {
  "use server";
  if (!(await autorizado())) return;
  const nome = String(formData.get("nome") || "").trim();
  const vel = Number(formData.get("velocidade"));
  if (!nome || !Number.isInteger(vel) || vel <= 0) return;
  await criarTela(getDb(), nome, vel);
  revalidatePath(ROTA);
}

async function novoItem(formData: FormData) {
  "use server";
  if (!(await autorizado())) return;
  const telaId = Number(formData.get("telaId"));
  const url = String(formData.get("url") || "").trim();
  if (!Number.isInteger(telaId) || !url) return;
  await adicionarItem(getDb(), telaId, url);
  revalidatePath(ROTA);
}

async function excluirItem(formData: FormData) {
  "use server";
  if (!(await autorizado())) return;
  const itemId = Number(formData.get("itemId"));
  if (!Number.isInteger(itemId)) return;
  await removerItem(getDb(), itemId);
  revalidatePath(ROTA);
}

async function enviarMidia(formData: FormData) {
  "use server";
  if (!(await autorizado())) return;
  const telaId = Number(formData.get("telaId"));
  const arquivo = formData.get("arquivo");
  if (!Number.isInteger(telaId) || !(arquivo instanceof File) || arquivo.size === 0) return;
  const bytes = new Uint8Array(await arquivo.arrayBuffer());
  try {
    await uploadMidia(getDb(), getStorageClient(), telaId, { nome: arquivo.name, tipo: arquivo.type, tamanho: arquivo.size, bytes });
  } catch {
    /* mídia inválida: ignora */
  }
  revalidatePath(ROTA);
}

export default async function AdminTvPage() {
  const session = await auth();
  const papel = session?.user?.papel;
  const wrap = "min-h-screen bg-neutral-50 text-neutral-900 dark:bg-neutral-950 dark:text-neutral-100";
  const inputCls =
    "rounded-lg border border-neutral-300 bg-white px-2 py-1 text-neutral-900 outline-none focus:border-neutral-900 dark:border-neutral-700 dark:bg-neutral-900 dark:text-neutral-100";
  const btn = "rounded-lg bg-emerald-700 px-3 py-1.5 text-sm font-semibold text-white hover:bg-emerald-800";

  if (!papel || !podeAcessar(papel, "tv")) {
    return (
      <main className={wrap}>
        <div className="mx-auto max-w-2xl px-5 py-10">
          <p role="alert" className="text-sm text-neutral-700 dark:text-neutral-300">Sem acesso a esta página.</p>
        </div>
      </main>
    );
  }

  const db = getDb();
  const telas = await listarTelas(db);
  const itensPorTela = await Promise.all(telas.map((t) => listarItens(db, t.id)));

  return (
    <main className={wrap}>
      <div className="mx-auto max-w-3xl px-5 py-10">
        <PageHeader
          titulo="TVs / mídia indoor"
          descricao="As propagandas que passam nas TVs da barbearia. Cada tela tem a própria playlist e velocidade (elas não espelham uma na outra)."
          ajuda={
            <>
              <p>1. <strong>Crie uma tela</strong> pra cada TV física (ex.: “TV da recepção”).</p>
              <p>2. <strong>Coloque as mídias na playlist</strong> de dois jeitos: enviando uma foto/vídeo do computador (botão “Enviar mídia”) ou colando um link da internet — vale link de imagem, de vídeo ou do YouTube.</p>
              <p>3. <strong>Abra o link da tela na TV</strong>: cada tela tem o botão “Abrir player”. No navegador da Smart TV, acesse esse endereço e deixe aberto — a playlist roda em loop, em tela cheia, e atualiza sozinha quando você mudar algo aqui.</p>
            </>
          }
        />

        <form action={novaTela} className="mt-2 flex flex-wrap items-end gap-3">
          <label className="flex flex-col gap-1 text-xs font-medium text-neutral-700 dark:text-neutral-300">
            Nome da tela
            <input name="nome" type="text" required aria-label="Nome da tela" data-testid="tv-nome" className={inputCls} />
          </label>
          <label className="flex flex-col gap-1 text-xs font-medium text-neutral-700 dark:text-neutral-300">
            Velocidade (s/item)
            <input name="velocidade" type="number" min={1} defaultValue={10} aria-label="Velocidade em segundos" data-testid="tv-velocidade" className={`${inputCls} w-24`} />
          </label>
          <button type="submit" className={btn}>Criar tela</button>
        </form>

        <div className="mt-8 flex flex-col gap-6">
          {telas.length === 0 ? (
            <p className="text-sm text-neutral-600">Nenhuma tela ainda.</p>
          ) : (
            telas.map((t, i) => (
              <section key={t.id} data-tela={t.nome} className="rounded-xl border border-neutral-200 bg-white p-4 dark:border-neutral-800 dark:bg-neutral-900">
                <div className="flex flex-wrap items-center justify-between gap-2">
                  <h2 className="font-semibold">
                    {t.nome} <span className="text-xs font-normal text-neutral-600">({t.velocidadeSegundos}s por item)</span>
                  </h2>
                  <a
                    href={`/tv/${t.id}`}
                    target="_blank"
                    rel="noopener noreferrer"
                    className="rounded-lg bg-emerald-700 px-3 py-1.5 text-xs font-semibold text-white hover:bg-emerald-800"
                  >
                    Abrir player desta tela
                  </a>
                </div>
                <p className="mt-1 text-xs text-neutral-600">
                  Na Smart TV, abra o navegador e acesse <code className="rounded bg-neutral-100 px-1 dark:bg-neutral-800">{`/tv/${t.id}`}</code> no
                  endereço do sistema — a playlist roda em loop e atualiza sozinha.
                </p>
                <ul className="mt-3 flex flex-col gap-1">
                  {itensPorTela[i].length === 0 ? (
                    <li className="text-sm text-neutral-600">Playlist vazia.</li>
                  ) : (
                    itensPorTela[i].map((it) => (
                      <li key={it.id} data-url={it.url} className="flex items-center justify-between text-sm">
                        <span>{it.ordem}. {it.url}</span>
                        <form action={excluirItem}>
                          <input type="hidden" name="itemId" value={it.id} />
                          <button type="submit" className="text-xs text-red-700 underline hover:text-red-900 dark:text-red-400">remover</button>
                        </form>
                      </li>
                    ))
                  )}
                </ul>
                <div className="mt-4 grid gap-3 sm:grid-cols-2">
                  <form action={enviarMidia} className="flex flex-col gap-2 rounded-lg border border-neutral-200 p-3 dark:border-neutral-800">
                    <span className="text-xs font-semibold">Enviar foto ou vídeo do computador</span>
                    <input type="hidden" name="telaId" value={t.id} />
                    <input name="arquivo" type="file" accept="image/*,video/*" aria-label={`Upload para ${t.nome}`} data-testid={`tv-upload-${t.id}`} className="text-xs" />
                    <button type="submit" className="self-start rounded-lg bg-emerald-700 px-3 py-1.5 text-xs font-semibold text-white hover:bg-emerald-800">
                      Enviar mídia
                    </button>
                  </form>
                  <form action={novoItem} className="flex flex-col gap-2 rounded-lg border border-neutral-200 p-3 dark:border-neutral-800">
                    <span className="text-xs font-semibold">Ou colar um link da internet</span>
                    <input type="hidden" name="telaId" value={t.id} />
                    <input
                      name="url"
                      type="text"
                      required
                      placeholder="Link de imagem, vídeo ou YouTube"
                      aria-label={`URL para ${t.nome}`}
                      data-testid={`tv-url-${t.id}`}
                      className={inputCls}
                    />
                    <button type="submit" className="self-start rounded-lg border border-neutral-300 px-3 py-1.5 text-xs font-medium text-neutral-800 hover:bg-neutral-100 dark:border-neutral-700 dark:text-neutral-200 dark:hover:bg-neutral-900">
                      Adicionar à playlist
                    </button>
                  </form>
                </div>
              </section>
            ))
          )}
        </div>
      </div>
    </main>
  );
}
