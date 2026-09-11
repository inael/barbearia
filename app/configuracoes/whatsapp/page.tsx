import { revalidatePath } from "next/cache";
import { redirect } from "next/navigation";
import { auth } from "@/auth";
import { getDb } from "@/lib/db";
import { podeAcessar } from "@/lib/auth/rbac";
import {
  lerIntegracao,
  salvarIntegracao,
  verificarInstancia,
  tokenMascarado,
  BASE_URL_PADRAO,
} from "@/lib/integracao-whatsapp";
import { resumoDeHoje } from "@/lib/lembretes-agendador";
import PageHeader from "@/components/PageHeader";
import Aviso from "@/components/Aviso";

export const dynamic = "force-dynamic";
const ROTA = "/configuracoes/whatsapp";

async function autorizado() {
  const session = await auth();
  return Boolean(session?.user?.papel && podeAcessar(session.user.papel, "config"));
}

async function salvar(formData: FormData) {
  "use server";
  if (!(await autorizado())) return;
  try {
    await salvarIntegracao(getDb(), {
      baseUrl: String(formData.get("baseUrl") || ""),
      token: String(formData.get("token") || ""),
      instancia: String(formData.get("instancia") || ""),
      ativo: formData.get("ativo") === "on",
    });
  } catch (e) {
    redirect(`${ROTA}?erro=${encodeURIComponent(e instanceof Error ? e.message : "erro ao salvar")}`);
  }
  revalidatePath(ROTA);
  redirect(`${ROTA}?ok=${encodeURIComponent("Integração do WhatsApp salva.")}`);
}

async function testar() {
  "use server";
  if (!(await autorizado())) return;
  const cfg = await lerIntegracao(getDb());
  const r = await verificarInstancia(cfg);
  redirect(`${ROTA}?${r.ok ? "ok" : "erro"}=${encodeURIComponent(r.mensagem)}`);
}

const wrap = "min-h-screen bg-neutral-50 text-neutral-900";
const input =
  "rounded-lg border border-neutral-300 bg-white px-2 py-1.5 text-neutral-900 outline-none focus:border-neutral-900";
const btn = "rounded-lg bg-emerald-700 px-3 py-1.5 text-sm font-semibold text-white hover:bg-emerald-800";
const btnGhost =
  "rounded-lg border border-neutral-300 px-3 py-1.5 text-sm font-medium text-neutral-800 hover:bg-neutral-100";

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
          <p role="alert" className="text-sm text-neutral-700">
            Sem acesso a esta página.
          </p>
        </div>
      </main>
    );
  }

  const cfg = await lerIntegracao(getDb());
  const temToken = Boolean(cfg.token);
  const lembretes = await resumoDeHoje(getDb());

  return (
    <main className={wrap}>
      <div className="mx-auto max-w-3xl px-5 py-10">
        <PageHeader
          titulo="WhatsApp da barbearia"
          descricao="Onde o sistema aprende a mandar mensagem no WhatsApp: lembrete de horário para o cliente e aviso para o dono. Sem isso configurado, o sistema funciona igual, só não envia nada."
          ajuda={
            <>
              <p>
                <strong>Token da API</strong> e <strong>ID da instância</strong> saem do painel do
                SimplesZap, na conta da barbearia.
              </p>
              <p>
                A <strong>instância</strong> é o número de WhatsApp conectado. Ela só passa a
                funcionar depois que alguém escaneia o <strong>QR Code</strong> no painel do
                SimplesZap com o celular da barbearia.
              </p>
              <p>
                Use <strong>Testar conexão</strong> depois de salvar: é ele que diz se o QR já foi
                escaneado. Enquanto aparecer “desconectado”, nenhuma mensagem sai.
              </p>
              <p>
                Por segurança o token nunca é mostrado de volta. Para trocá-lo, digite o novo; deixe
                o campo vazio para manter o que está salvo.
              </p>
            </>
          }
        />

        <Aviso ok={sp?.ok} erro={sp?.erro} />

        <section className="mt-6">
          <form action={salvar} className="flex flex-col gap-4 rounded-xl border border-neutral-200 bg-white p-5">
            <label className="flex flex-col gap-1 text-xs font-medium">
              URL da API
              <input
                name="baseUrl"
                required
                defaultValue={cfg.baseUrl || BASE_URL_PADRAO}
                placeholder={BASE_URL_PADRAO}
                aria-label="URL da API"
                data-testid="wa-url"
                className={input}
              />
              <span className="font-normal text-neutral-600">
                Só mude se o SimplesZap indicar outro endereço.
              </span>
            </label>

            <label className="flex flex-col gap-1 text-xs font-medium">
              Token da API
              <input
                name="token"
                type="password"
                autoComplete="off"
                placeholder={temToken ? "deixe vazio para manter o atual" : "cole o token aqui"}
                aria-label="Token da API"
                data-testid="wa-token"
                className={input}
              />
              <span className="font-normal text-neutral-600" data-testid="wa-token-atual">
                {temToken ? `Token salvo: ${tokenMascarado(cfg.token)}` : "Nenhum token salvo ainda."}
              </span>
            </label>

            <label className="flex flex-col gap-1 text-xs font-medium">
              ID da instância
              <input
                name="instancia"
                defaultValue={cfg.instancia ?? ""}
                placeholder="ex.: 54d175f4-0618-40ae-b960-f0bdc92bd932"
                aria-label="ID da instância"
                data-testid="wa-instancia"
                className={input}
              />
              <span className="font-normal text-neutral-600">
                O identificador do número no painel do SimplesZap. Aceita o ID ou o nome.
              </span>
            </label>

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
                Salvar
              </button>
            </div>
          </form>
        </section>

        <section className="mt-6">
          <h2 className="mb-2 text-lg font-semibold">Conferir</h2>
          <p className="mb-3 text-sm text-neutral-700">
            O teste usa o que está salvo. Ele diz se o token vale, se a instância existe e,
            principalmente, se o QR Code já foi escaneado.
          </p>
          <form action={testar}>
            <button type="submit" className={btnGhost} data-testid="wa-testar">
              Testar conexão
            </button>
          </form>
        </section>

        <section className="mt-8 rounded-xl border border-neutral-200 bg-white p-5 text-sm text-neutral-700">
          <h2 className="mb-2 text-base font-semibold text-neutral-900">Situação agora</h2>
          <p data-testid="wa-situacao">
            {cfg.ativo && temToken && cfg.instancia
              ? "Ligada. O sistema tenta enviar pelo WhatsApp configurado."
              : "Desligada. Nenhuma mensagem é enviada; o resto do sistema funciona normalmente."}
          </p>
          {/* LEA-008: sem isto o dono nao tem como saber se os lembretes estao saindo. */}
          <p className="mt-2" data-testid="wa-lembretes">
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
