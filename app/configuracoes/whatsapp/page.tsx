import { revalidatePath } from "next/cache";
import { redirect } from "next/navigation";
import { auth } from "@/auth";
import { getDb } from "@/lib/db";
import { podeAcessar } from "@/lib/auth/rbac";
import {
  lerIntegracao,
  salvarIntegracao,
  listarInstancias,
  verificarInstancia,
  tokenMascarado,
  BASE_URL_PADRAO,
} from "@/lib/integracao-whatsapp";
import { senderDoBanco } from "@/lib/whatsapp";
import { resumoDeHoje } from "@/lib/lembretes-agendador";
import PageHeader from "@/components/PageHeader";
import Aviso from "@/components/Aviso";

export const dynamic = "force-dynamic";
const ROTA = "/configuracoes/whatsapp";

async function autorizado() {
  const session = await auth();
  return Boolean(session?.user?.papel && podeAcessar(session.user.papel, "config"));
}

/** Passo 1: guarda a chave. A instância é escolhida depois, na lista. */
async function salvarChave(formData: FormData) {
  "use server";
  if (!(await autorizado())) return;
  const atual = await lerIntegracao(getDb());
  try {
    await salvarIntegracao(getDb(), {
      baseUrl: String(formData.get("baseUrl") || BASE_URL_PADRAO),
      token: String(formData.get("token") || ""),
      instancia: atual.instancia ?? "",
      ativo: atual.ativo,
    });
  } catch (e) {
    redirect(`${ROTA}?erro=${encodeURIComponent(e instanceof Error ? e.message : "erro ao salvar")}`);
  }
  revalidatePath(ROTA);
  redirect(`${ROTA}?ok=${encodeURIComponent("Chave salva. As instâncias da conta apareceram abaixo.")}`);
}

/** Passo 2: escolhe qual número envia. */
async function salvarInstancia(formData: FormData) {
  "use server";
  if (!(await autorizado())) return;
  const atual = await lerIntegracao(getDb());
  const escolhida = String(formData.get("instancia") || "");
  if (!escolhida) {
    redirect(`${ROTA}?erro=${encodeURIComponent("Escolha uma instância na lista.")}`);
  }
  try {
    await salvarIntegracao(getDb(), {
      baseUrl: atual.baseUrl,
      token: "",
      instancia: escolhida,
      ativo: formData.get("ativo") === "on",
    });
  } catch (e) {
    redirect(`${ROTA}?erro=${encodeURIComponent(e instanceof Error ? e.message : "erro ao salvar")}`);
  }
  revalidatePath(ROTA);
  redirect(`${ROTA}?ok=${encodeURIComponent("Configuração salva.")}`);
}

async function testar() {
  "use server";
  if (!(await autorizado())) return;
  const r = await verificarInstancia(await lerIntegracao(getDb()));
  redirect(`${ROTA}?${r.ok ? "ok" : "erro"}=${encodeURIComponent(r.mensagem)}`);
}

/** Passo 4: manda uma mensagem de verdade. É o único teste que prova a ponta a ponta. */
async function enviarTeste(formData: FormData) {
  "use server";
  if (!(await autorizado())) return;
  const telefone = String(formData.get("telefone") || "").replace(/\D/g, "");
  if (telefone.length < 10) {
    redirect(`${ROTA}?erro=${encodeURIComponent("Informe um número com DDD para o teste.")}`);
  }
  const cfg = await lerIntegracao(getDb());
  if (!cfg.ativo) {
    redirect(`${ROTA}?erro=${encodeURIComponent("Ligue a integração antes de enviar o teste.")}`);
  }
  try {
    const sender = await senderDoBanco(getDb());
    await sender.enviarTexto(telefone, "Teste do sistema da Faith Barbearia. Se você recebeu, está funcionando.");
  } catch (e) {
    redirect(`${ROTA}?erro=${encodeURIComponent(`Não saiu: ${e instanceof Error ? e.message : "erro no envio"}`)}`);
  }
  redirect(`${ROTA}?ok=${encodeURIComponent("Mensagem de teste enviada. Confira o celular.")}`);
}

const wrap = "min-h-screen bg-neutral-50 text-neutral-900";
const input =
  "rounded-lg border border-neutral-300 bg-white px-2 py-1.5 text-neutral-900 outline-none focus:border-neutral-900";
const btn = "rounded-lg bg-emerald-700 px-3 py-1.5 text-sm font-semibold text-white hover:bg-emerald-800";
const btnGhost =
  "rounded-lg border border-neutral-300 px-3 py-1.5 text-sm font-medium text-neutral-800 hover:bg-neutral-100";
const cartao = "rounded-xl border border-neutral-200 bg-white p-5";

export default async function WhatsappConfigPage({
  searchParams,
}: {
  searchParams: Promise<{ ok?: string; erro?: string }>;
}) {
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

  const db = getDb();
  const cfg = await lerIntegracao(db);
  const temChave = Boolean(cfg.token);
  // Lista ao abrir a tela: e o dado que faz a escolha existir. Falha nao derruba a
  // pagina, vira aviso, senao um SimplesZap fora do ar tiraria o dono da configuracao.
  const lista = temChave ? await listarInstancias(cfg) : { ok: false, instancias: [], mensagem: undefined };
  const lembretes = await resumoDeHoje(db);
  const escolhida = lista.instancias.find((i) => i.id === cfg.instancia);
  const ligadaDeVerdade = cfg.ativo && temChave && Boolean(cfg.instancia);

  return (
    <main className={wrap}>
      <div className="mx-auto max-w-3xl px-5 py-10">
        <PageHeader
          titulo="WhatsApp da barbearia"
          descricao="Onde o sistema aprende a mandar mensagem no WhatsApp: lembrete de horário para o cliente e aviso para o dono. Sem isso configurado, o sistema funciona igual, só não envia nada."
          acoes={
            <span
              data-testid="wa-situacao"
              className={`rounded-full px-2.5 py-1 text-xs font-semibold ${
                ligadaDeVerdade ? "bg-emerald-100 text-emerald-800" : "bg-neutral-200 text-neutral-700"
              }`}
            >
              {ligadaDeVerdade ? "Conectado" : "Desligado"}
            </span>
          }
          ajuda={
            <>
              <p>
                Crie a conta no SimplesZap e gere uma <strong>chave de API</strong> com as permissões
                de <strong>enviar mensagem</strong> e <strong>ler instâncias</strong>. Cole a chave
                aqui e os números da conta aparecem sozinhos na lista.
              </p>
              <p>
                <strong>Instância</strong> é cada número de WhatsApp conectado. Ela só funciona
                depois que alguém escaneia o QR Code no painel do SimplesZap com o celular daquele
                número.
              </p>
              <p>
                Por segurança a chave nunca é mostrada de volta. Para trocá-la, cole a nova; deixe
                o campo vazio para manter a atual.
              </p>
            </>
          }
        />

        <Aviso ok={sp?.ok} erro={sp?.erro} />

        {/* 1. chave */}
        <section className={`mt-6 ${cartao}`}>
          <h2 className="font-semibold">1. Chave de API do SimplesZap</h2>
          <p className="mt-1 text-sm text-neutral-600">
            Gere no painel do SimplesZap, em Chaves de API, com as permissões de enviar mensagem e
            ler instâncias.
          </p>
          <p className="mt-2 text-xs text-neutral-600" data-testid="wa-token-atual">
            {temChave ? `Chave atual: ${tokenMascarado(cfg.token)} (deixe em branco para manter)` : "Nenhuma chave salva ainda."}
          </p>
          <form action={salvarChave} className="mt-3 flex flex-wrap items-end gap-2">
            <input type="hidden" name="baseUrl" value={cfg.baseUrl || BASE_URL_PADRAO} />
            <input
              name="token"
              type="password"
              autoComplete="off"
              placeholder="sk_..."
              aria-label="Chave da API"
              data-testid="wa-token"
              className={`${input} min-w-64 flex-1`}
            />
            <button type="submit" className={btn} data-testid="wa-salvar-chave">
              Salvar e listar instâncias
            </button>
          </form>
        </section>

        {/* 2. instancia */}
        <section className={`mt-4 ${cartao}`} data-testid="wa-instancias">
          <h2 className="font-semibold">2. Escolha a instância de envio</h2>
          {!temChave ? (
            <p className="mt-2 text-sm text-neutral-600">Salve a chave acima para ver os números da conta.</p>
          ) : !lista.ok ? (
            <p className="mt-2 text-sm text-red-700" data-testid="wa-instancias-erro">
              {lista.mensagem}
            </p>
          ) : lista.instancias.length === 0 ? (
            <p className="mt-2 text-sm text-neutral-600" data-testid="wa-instancias-vazio">
              Nenhuma instância nesta conta ainda. Crie uma no painel do SimplesZap e escaneie o QR
              com o celular da barbearia.
            </p>
          ) : (
            <form action={salvarInstancia} className="mt-3 flex flex-col gap-3">
              <div className="flex flex-col gap-2">
                {lista.instancias.map((i) => (
                  <label key={i.id} data-instancia={i.nome} className="flex items-center gap-2 text-sm">
                    <input
                      type="radio"
                      name="instancia"
                      value={i.id}
                      defaultChecked={i.id === cfg.instancia}
                      className="h-4 w-4"
                    />
                    <span className="font-medium">{i.nome}</span>
                    <span className={i.conectada ? "text-xs text-emerald-700" : "text-xs text-amber-700"}>
                      {i.conectada ? "conectado" : i.status}
                    </span>
                    {i.numero ? <span className="text-xs text-neutral-500">{i.numero}</span> : null}
                  </label>
                ))}
              </div>
              <label className="flex items-center gap-2 text-sm font-medium">
                <input
                  type="checkbox"
                  name="ativo"
                  defaultChecked={cfg.ativo}
                  aria-label="Integração ligada"
                  data-testid="wa-ativo"
                  className="h-4 w-4"
                />
                Integração ligada (o sistema pode enviar mensagens)
              </label>
              <div className="flex flex-wrap gap-2">
                <button type="submit" className={btn} data-testid="wa-salvar">
                  Salvar configuração
                </button>
                <button type="submit" formAction={testar} className={btnGhost} data-testid="wa-testar">
                  Testar conexão
                </button>
              </div>
            </form>
          )}
        </section>

        {/* 3. teste real */}
        <section className={`mt-4 ${cartao}`}>
          <h2 className="font-semibold">3. Enviar mensagem de teste</h2>
          <p className="mt-1 text-sm text-neutral-600">
            É o único teste que prova o caminho inteiro. Use um número que você possa conferir agora.
          </p>
          <form action={enviarTeste} className="mt-3 flex flex-wrap items-end gap-2">
            <input
              name="telefone"
              inputMode="numeric"
              placeholder="61999998888"
              aria-label="Número para o teste"
              data-testid="wa-teste-numero"
              className={`${input} min-w-56 flex-1`}
            />
            <button type="submit" className={btnGhost} data-testid="wa-enviar-teste">
              Enviar teste
            </button>
          </form>
        </section>

        <section className="mt-6 text-sm text-neutral-700">
          <p data-testid="wa-resumo">
            {escolhida
              ? `Enviando por: ${escolhida.nome}${escolhida.numero ? ` (${escolhida.numero})` : ""}.`
              : "Nenhuma instância escolhida ainda."}
          </p>
          {/* LEA-008: sem isto o dono nao tem como saber se os lembretes estao saindo. */}
          <p className="mt-1" data-testid="wa-lembretes">
            <strong>Lembretes hoje:</strong>{" "}
            {lembretes.enviadosHoje === 0
              ? "nenhum enviado ainda."
              : `${lembretes.enviadosHoje} enviado(s), o último às ${lembretes.ultimoEnvio?.toLocaleTimeString(
                  "pt-BR",
                  { hour: "2-digit", minute: "2-digit" },
                )}.`}
          </p>
        </section>
      </div>
    </main>
  );
}
