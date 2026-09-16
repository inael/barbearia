import { revalidatePath } from "next/cache";
import { redirect } from "next/navigation";
import { auth } from "@/auth";
import { getDb } from "@/lib/db";
import { podeAcessar } from "@/lib/auth/rbac";
import { listarProfissionais } from "@/lib/profissionais";
import { listarServicos } from "@/lib/catalogo";
import { definirMeta, definirMetaQuantidade, relatorioProfissional, relatorioRecepcao, semanaAtual, type RelatorioProfissional, type RelatorioRecepcao, removerMeta, metasComProgresso } from "@/lib/metas";
import PageHeader from "@/components/PageHeader";
import Aviso from "@/components/Aviso";
import AlvoDaMeta from "@/components/AlvoDaMeta";
import { lerAlvo } from "@/lib/meta-alvo";

export const dynamic = "force-dynamic";
const ROTA = "/metas";
const brl = (c: number) => (c / 100).toLocaleString("pt-BR", { style: "currency", currency: "BRL" });

async function podeEditar() {
  const session = await auth();
  return Boolean(session?.user?.papel && podeAcessar(session.user.papel, "config"));
}

async function salvarMeta(formData: FormData) {
  "use server";
  if (!(await podeEditar())) return;
  const { inicio, fim } = semanaAtual(new Date());
  const pid = Number(formData.get("profissionalId"));
  const tipo = String(formData.get("tipoAlvo") || "valor");

  if (!Number.isInteger(pid) || pid <= 0) {
    redirect(`${ROTA}?erro=${encodeURIComponent("Escolha o profissional da meta.")}`);
  }

  const alvo = lerAlvo(String(formData.get("alvo") || ""), tipo);
  if (!alvo.ok) {
    redirect(`${ROTA}?erro=${encodeURIComponent(alvo.motivo)}`);
  }

  // "" = meta GERAL, que soma tudo. O Rodrigo quer as duas coisas convivendo:
  // varias metas de servico na semana e a geral junto.
  const bruto = String(formData.get("servicoId") || "");
  const servicoId = bruto ? Number(bruto) : null;
  if (servicoId !== null && !Number.isInteger(servicoId)) {
    redirect(`${ROTA}?erro=${encodeURIComponent("Escolha um serviço válido para a meta.")}`);
  }

  try {
    if (tipo === "quantidade") {
      await definirMetaQuantidade(getDb(), pid, inicio, fim, alvo.valor, servicoId);
    } else {
      await definirMeta(getDb(), pid, inicio, fim, alvo.valor, servicoId);
    }
  } catch (e) {
    // qualquer coisa que escape vira recado, nunca pagina de erro
    redirect(`${ROTA}?erro=${encodeURIComponent(e instanceof Error ? e.message : "não consegui salvar a meta")}`);
  }

  revalidatePath(ROTA);
  redirect(`${ROTA}?ok=${encodeURIComponent("Meta salva.")}`);
}

async function excluirMeta(formData: FormData) {
  "use server";
  if (!(await podeEditar())) return;
  const id = Number(formData.get("metaId"));
  if (!Number.isInteger(id)) return;
  await removerMeta(getDb(), id);
  revalidatePath(ROTA);
  redirect(`${ROTA}?ok=${encodeURIComponent("Meta removida.")}`);
}

const wrap = "min-h-screen bg-neutral-50 text-neutral-900 dark:bg-neutral-950 dark:text-neutral-100";
const input =
  "rounded-lg border border-neutral-300 bg-white px-2 py-1 text-neutral-900 outline-none focus:border-neutral-900 dark:border-neutral-700 dark:bg-neutral-900 dark:text-neutral-100";
const btn = "rounded-lg bg-emerald-700 px-3 py-1.5 text-sm font-semibold text-white hover:bg-emerald-800";

function LinhaRelatorio({ nome, rel }: { nome: string; rel: RelatorioProfissional }) {
  return (
    <div data-prof-meta={nome} className="flex flex-wrap items-center gap-3 rounded-lg border border-neutral-200 bg-white p-3 text-sm dark:border-neutral-800 dark:bg-neutral-900">
      <span className="w-24 font-medium">{nome}</span>
      <span className="text-neutral-600">Fat: <strong>{brl(rel.faturamentoCentavos)}</strong></span>
      <span className="text-neutral-600">Comissão: {rel.comissaoTotalReais.toLocaleString("pt-BR", { style: "currency", currency: "BRL" })}</span>
      <span className="text-neutral-600">Vales: {brl(rel.valesCentavos)}</span>
      <span className="text-neutral-600">Atendimentos: <strong>{rel.atendimentos}</strong></span>
      <span className="text-neutral-600">
        Meta:{" "}
        {rel.tipoAlvo === "quantidade"
          ? `${rel.alvoQuantidade} atendimentos`
          : rel.alvoCentavos != null
            ? brl(rel.alvoCentavos)
            : "—"}
      </span>
      {rel.batido == null ? null : rel.batido ? (
        <span className="rounded-full bg-emerald-100 px-2 py-0.5 text-xs font-semibold text-emerald-800 dark:bg-emerald-900/40 dark:text-emerald-300">meta batida</span>
      ) : (
        <span className="rounded-full bg-amber-100 px-2 py-0.5 text-xs font-semibold text-amber-800 dark:bg-amber-900/40 dark:text-amber-300">não batida</span>
      )}
    </div>
  );
}

function LinhaRecepcao({ nome, rec }: { nome: string; rec: RelatorioRecepcao }) {
  return (
    <div data-prof-meta={nome} className="flex flex-wrap items-center gap-3 rounded-lg border border-neutral-200 bg-white p-3 text-sm dark:border-neutral-800 dark:bg-neutral-900">
      <span className="w-24 font-medium">{nome}</span>
      <span className="rounded bg-neutral-100 px-1.5 py-0.5 text-xs dark:bg-neutral-800">recepção</span>
      <span className="text-neutral-600">Produtos: <strong>{brl(rec.produtosCentavos)}</strong></span>
      <span className="text-neutral-600">Hidratações: <strong>{rec.qtdHidratacoes}</strong></span>
      <span className="text-neutral-600">Divididos da casa: {brl(rec.divididosCasaCentavos)}</span>
      <span className="text-neutral-600">Comissão: {rec.comissaoTotalReais.toLocaleString("pt-BR", { style: "currency", currency: "BRL" })}</span>
      <span className="text-neutral-600">Vales: {brl(rec.valesCentavos)}</span>
      <span className="text-neutral-600">
        Meta:{" "}
        {rec.tipoAlvo === "quantidade"
          ? `${rec.alvoQuantidade} hidratações`
          : rec.alvoCentavos != null
            ? brl(rec.alvoCentavos)
            : "—"}
      </span>
      {rec.batido == null ? null : rec.batido ? (
        <span className="rounded-full bg-emerald-100 px-2 py-0.5 text-xs font-semibold text-emerald-800 dark:bg-emerald-900/40 dark:text-emerald-300">meta batida</span>
      ) : (
        <span className="rounded-full bg-amber-100 px-2 py-0.5 text-xs font-semibold text-amber-800 dark:bg-amber-900/40 dark:text-amber-300">não batida</span>
      )}
    </div>
  );
}

export default async function MetasPage({ searchParams }: { searchParams: Promise<{ ok?: string; erro?: string }> }) {
  const sp = await searchParams;
  const session = await auth();
  const papel = session?.user?.papel;
  const pid = session?.user?.profissionalId ?? null;

  if (!papel || !(podeAcessar(papel, "config") || podeAcessar(papel, "comissao"))) {
    return (
      <main className={wrap}>
        <div className="mx-auto max-w-2xl px-5 py-10">
          <p role="alert" className="text-sm text-neutral-700 dark:text-neutral-300">Sem acesso a esta página.</p>
        </div>
      </main>
    );
  }

  const db = getDb();
  const editar = podeAcessar(papel, "config");
  const { inicio, fim } = semanaAtual(new Date());
  const profissionais = await listarProfissionais(db);

  const alvos = editar
    ? profissionais
    : profissionais.filter((p) => p.id === pid);
  const servicos = await listarServicos(db);
  // metas da semana de cada um, ja com o realizado: e o que o dono confere
  const metasPorProf = await Promise.all(
    alvos.map(async (p) => ({ prof: p, metas: await metasComProgresso(db, p.id, inicio, inicio, fim) })),
  );
  const relatorios = await Promise.all(
    alvos.map(async (p) =>
      p.papel === "recepcionista"
        ? { nome: p.nome, rec: await relatorioRecepcao(db, p.id, inicio, fim), rel: null }
        : { nome: p.nome, rec: null, rel: await relatorioProfissional(db, p.id, inicio, fim) },
    ),
  );

  return (
    <main className={wrap}>
      <div className="mx-auto max-w-3xl px-5 py-10">
        <PageHeader
          titulo="Metas & relatórios"
          descricao={`A semana de cada profissional num lugar só: faturamento, comissão, vales e se a meta foi batida. Semana de ${inicio.toLocaleDateString("pt-BR")} a ${new Date(fim.getTime() - 1).toLocaleDateString("pt-BR")}.`}
          ajuda={
            <>
              <p><strong>Meta</strong> — o dono define um alvo semanal por profissional. O “realizado” vem sozinho das contas fechadas no caixa.</p>
              <p><strong>Comissão</strong> — calculada das vendas reais (avulso pela faixa, combo 40%, dividido 20%, produto pela faixa de produto), mais a comissão de cortesias.</p>
              <p><strong>Vales</strong> — o que descontar no acerto (produtos retirados e serviços que o barbeiro fez nele mesmo).</p>
            </>
          }
        />

        <Aviso ok={sp?.ok} erro={sp?.erro} />

        {editar ? (
          <section className="mt-6">
            <h2 className="mb-3 text-lg font-semibold">Definir meta da semana</h2>
            <form action={salvarMeta} className="flex flex-wrap items-end gap-3 rounded-xl border border-neutral-200 bg-white p-4 dark:border-neutral-800 dark:bg-neutral-900">
              <label className="flex flex-col gap-1 text-xs font-medium">Profissional
                <select name="profissionalId" aria-label="Profissional" data-testid="met-prof" className={input}>
                  {profissionais.map((p) => <option key={p.id} value={p.id}>{p.nome}</option>)}
                </select>
              </label>
              <label className="flex flex-col gap-1 text-xs font-medium">Serviço
                <select name="servicoId" aria-label="Serviço da meta" data-testid="met-servico" className={input}>
                  <option value="">Geral (todos os serviços)</option>
                  {servicos.map((sv) => <option key={sv.id} value={sv.id}>{sv.nome}</option>)}
                </select>
              </label>
              <AlvoDaMeta classeInput={input} classeSelect={input} />
              <button type="submit" className={btn}>Salvar meta</button>
            </form>
          </section>
        ) : null}

        <section className="mt-8">
          <h2 className="mb-3 text-lg font-semibold">Metas desta semana</h2>
          <div className="flex flex-col gap-3">
            {metasPorProf.every((x) => x.metas.length === 0) ? (
              <p className="text-sm text-neutral-600 dark:text-neutral-400" data-testid="met-sem-metas">
                Nenhuma meta definida para esta semana.
              </p>
            ) : (
              metasPorProf
                .filter((x) => x.metas.length > 0)
                .map((x) => (
                  <div key={x.prof.id} data-metas-de={x.prof.nome} className="rounded-xl border border-neutral-200 bg-white p-3 dark:border-neutral-800 dark:bg-neutral-900">
                    <div className="mb-2 text-sm font-semibold">{x.prof.nome}</div>
                    <ul className="flex flex-col gap-1">
                      {x.metas.map((m) => (
                        <li key={m.id} data-meta-servico={m.servicoNome} className="flex flex-wrap items-center gap-2 text-sm">
                          <span className="min-w-0 flex-1 truncate">{m.servicoNome}</span>
                          <span className="text-neutral-600 dark:text-neutral-400">
                            {m.tipoAlvo === "quantidade"
                              ? `${m.realizadoQuantidade} de ${m.alvoQuantidade} atendimento(s)`
                              : `${brl(m.realizadoCentavos)} de ${brl(m.alvoCentavos ?? 0)}`}
                          </span>
                          <span
                            data-meta-batida={m.batido ? "sim" : "nao"}
                            className={`rounded-full px-2 py-0.5 text-xs font-semibold ${
                              m.batido
                                ? "bg-emerald-100 text-emerald-800 dark:bg-emerald-900/40 dark:text-emerald-300"
                                : "bg-amber-100 text-amber-800 dark:bg-amber-900/40 dark:text-amber-300"
                            }`}
                          >
                            {m.batido ? "batida" : "não batida"}
                          </span>
                          {editar ? (
                            <form action={excluirMeta}>
                              <input type="hidden" name="metaId" value={m.id} />
                              <button type="submit" data-remover-meta={m.servicoNome} className="text-xs text-red-700 underline hover:text-red-900 dark:text-red-400">
                                remover
                              </button>
                            </form>
                          ) : null}
                        </li>
                      ))}
                    </ul>
                  </div>
                ))
            )}
          </div>
        </section>

        <section className="mt-8">
          <h2 className="mb-3 text-lg font-semibold">{editar ? "Equipe" : "Meu desempenho"} (semana)</h2>
          <div className="flex flex-col gap-2">
            {relatorios.length === 0 ? <p className="text-sm text-neutral-600">Sem dados.</p> : relatorios.map((r) =>
              r.rec ? <LinhaRecepcao key={r.nome} nome={r.nome} rec={r.rec} /> : <LinhaRelatorio key={r.nome} nome={r.nome} rel={r.rel!} />,
            )}
          </div>
        </section>
      </div>
    </main>
  );
}
