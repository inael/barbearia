import { revalidatePath } from "next/cache";
import { redirect } from "next/navigation";
import { auth } from "@/auth";
import { getDb } from "@/lib/db";
import { podeAcessar } from "@/lib/auth/rbac";
import { listarTelas, criarTela, editarTela, removerTela, adicionarItem, removerItem, listarItens, ajustarItem, segundosValidos, ROTACOES, SEGUNDOS_MAXIMO } from "@/lib/tv";
import { uploadMidia, getStorageClient, validarMidia, LIMITE_BYTES } from "@/lib/tv-upload";
import PageHeader from "@/components/PageHeader";
import { rotuloDaMidia } from "@/lib/midia";
import Aviso from "@/components/Aviso";

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
  redirect(`${ROTA}?ok=${encodeURIComponent("Tela criada.")}`);
}

async function salvarTela(formData: FormData) {
  "use server";
  if (!(await autorizado())) return;
  const id = Number(formData.get("id"));
  const nome = String(formData.get("nome") || "").trim();
  const vel = Number(formData.get("velocidade"));
  if (!Number.isInteger(id) || !nome || !Number.isInteger(vel) || vel <= 0) return;
  await editarTela(getDb(), id, nome, vel);
  revalidatePath(ROTA);
  redirect(`${ROTA}?ok=${encodeURIComponent("Tela atualizada.")}`);
}

async function excluirTela(formData: FormData) {
  "use server";
  if (!(await autorizado())) return;
  const id = Number(formData.get("id"));
  if (!Number.isInteger(id)) return;
  await removerTela(getDb(), id);
  revalidatePath(ROTA);
  redirect(`${ROTA}?ok=${encodeURIComponent("Tela excluída.")}`);
}

async function novoItem(formData: FormData) {
  "use server";
  if (!(await autorizado())) return;
  const telaId = Number(formData.get("telaId"));
  const url = String(formData.get("url") || "").trim();
  if (!Number.isInteger(telaId) || !url) return;
  await adicionarItem(getDb(), telaId, url);
  revalidatePath(ROTA);
  redirect(`${ROTA}?ok=${encodeURIComponent("Mídia adicionada à playlist.")}`);
}

async function excluirItem(formData: FormData) {
  "use server";
  if (!(await autorizado())) return;
  const itemId = Number(formData.get("itemId"));
  if (!Number.isInteger(itemId)) return;
  const r = await removerItem(getDb(), itemId);
  revalidatePath(ROTA);
  // Sai da playlist de qualquer jeito; se o arquivo ficou no disco, o dono precisa
  // saber, senao o espaco some sem explicacao.
  redirect(
    r.avisoArquivo
      ? `${ROTA}?erro=${encodeURIComponent(r.avisoArquivo)}`
      : `${ROTA}?ok=${encodeURIComponent("Mídia removida da playlist.")}`,
  );
}

async function ajustarMidia(formData: FormData) {
  "use server";
  if (!(await autorizado())) return;
  const itemId = Number(formData.get("itemId"));
  if (!Number.isInteger(itemId)) return;

  const bruto = String(formData.get("segundos") || "").trim();
  // campo vazio volta a valer o tempo da tela, de proposito. Numero invalido nao:
  // aceitar calado faria o item sumir do ritmo sem o dono entender por que.
  if (bruto && segundosValidos(bruto) === null) {
    redirect(
      `${ROTA}?erro=${encodeURIComponent(
        `Tempo inválido. Use um número inteiro de 1 a ${SEGUNDOS_MAXIMO} segundos, ou deixe vazio para usar o tempo da tela.`,
      )}`,
    );
  }

  await ajustarItem(getDb(), itemId, { segundos: bruto, rotacao: formData.get("rotacao") });
  revalidatePath(ROTA);
  redirect(`${ROTA}?ok=${encodeURIComponent("Tempo e giro da mídia salvos.")}`);
}

async function enviarMidia(formData: FormData) {
  "use server";
  if (!(await autorizado())) return;
  const telaId = Number(formData.get("telaId"));
  const arquivo = formData.get("arquivo");
  // Antes isto era um `return` mudo: sem arquivo escolhido, a tela recarregava igual
  // e parecia que o botao nao funcionava.
  if (!Number.isInteger(telaId) || !(arquivo instanceof File) || arquivo.size === 0) {
    redirect(`${ROTA}?erro=${encodeURIComponent("Escolha um arquivo de imagem ou vídeo antes de enviar.")}`);
  }
  try {
    // Validar ANTES de ler o arquivo na memoria: um video gigante seria carregado
    // inteiro so para ser recusado, e num servidor de 1 vCPU isso derruba a pagina.
    validarMidia(arquivo.type, arquivo.size);
    const bytes = new Uint8Array(await arquivo.arrayBuffer());
    await uploadMidia(getDb(), getStorageClient(), telaId, { nome: arquivo.name, tipo: arquivo.type, tamanho: arquivo.size, bytes });
  } catch (e) {
    // antes o erro era engolido e o usuário achava que o botão não funcionava
    const msg = e instanceof Error ? e.message : "não foi possível enviar a mídia";
    redirect(`${ROTA}?erro=${encodeURIComponent(msg)}`);
  }
  revalidatePath(ROTA);
  redirect(`${ROTA}?ok=${encodeURIComponent("Mídia enviada para a playlist.")}`);
}

export default async function AdminTvPage({ searchParams }: { searchParams: Promise<{ ok?: string; erro?: string }> }) {
  const sp = await searchParams;
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

        <Aviso ok={sp?.ok} erro={sp?.erro} />

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
                <div className="mt-2 flex flex-wrap items-end gap-2">
                  <form action={salvarTela} className="flex flex-wrap items-end gap-1">
                    <input type="hidden" name="id" value={t.id} />
                    <input name="nome" defaultValue={t.nome} aria-label={`Nome da tela ${t.nome}`} className={`${inputCls} w-40`} />
                    <input name="velocidade" type="number" min={1} defaultValue={t.velocidadeSegundos} aria-label={`Velocidade da tela ${t.nome}`} className={`${inputCls} w-20`} />
                    <button type="submit" data-salvar-tela={t.nome} className="rounded-lg border border-neutral-300 px-3 py-1.5 text-xs font-medium text-neutral-800 hover:bg-neutral-100">Salvar</button>
                  </form>
                  <form action={excluirTela}>
                    <input type="hidden" name="id" value={t.id} />
                    <button type="submit" data-excluir-tela={t.nome} className="rounded-lg border border-red-300 px-3 py-1.5 text-xs font-medium text-red-700 hover:bg-red-50">Excluir tela</button>
                  </form>
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
                      <li key={it.id} data-url={it.url} className="flex flex-wrap items-center gap-2 text-sm">
                        <span className="min-w-0 flex-1 truncate">
                          {it.ordem}. {rotuloDaMidia(it.url)}
                        </span>
                        <a
                          href={it.url}
                          target="_blank"
                          rel="noopener noreferrer"
                          data-abrir-midia={it.id}
                          className="rounded border border-neutral-300 px-2 py-0.5 text-xs font-medium text-neutral-700 hover:bg-neutral-100"
                        >
                          Abrir mídia
                        </a>
                        {/* pedido do Rodrigo (audio 14/09): tempo por item, e giro
                            porque a TV dele esta montada de lado como painel */}
                        <form action={ajustarMidia} className="flex flex-wrap items-center gap-1">
                          <input type="hidden" name="itemId" value={it.id} />
                          <input
                            name="segundos"
                            inputMode="numeric"
                            defaultValue={it.segundos ?? ""}
                            placeholder={String(t.velocidadeSegundos)}
                            aria-label={`Segundos do item ${it.ordem}`}
                            data-testid={`item-segundos-${it.id}`}
                            className="w-14 rounded border border-neutral-300 px-1 py-0.5 text-xs dark:border-neutral-700 dark:bg-neutral-900"
                          />
                          <span className="text-xs text-neutral-500">s</span>
                          <select
                            name="rotacao"
                            defaultValue={String(it.rotacao)}
                            aria-label={`Giro do item ${it.ordem}`}
                            data-testid={`item-rotacao-${it.id}`}
                            className="rounded border border-neutral-300 px-1 py-0.5 text-xs dark:border-neutral-700 dark:bg-neutral-900"
                          >
                            {ROTACOES.map((g) => (
                              <option key={g} value={g}>{g === 0 ? "sem giro" : `${g}°`}</option>
                            ))}
                          </select>
                          <button type="submit" className="rounded border border-neutral-300 px-2 py-0.5 text-xs font-medium hover:bg-neutral-100 dark:border-neutral-700 dark:hover:bg-neutral-800">
                            salvar
                          </button>
                        </form>
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
                    <span className="text-xs text-neutral-500" data-testid="tv-limite">imagem ou vídeo, até {LIMITE_BYTES / 1024 / 1024} MB</span>
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
