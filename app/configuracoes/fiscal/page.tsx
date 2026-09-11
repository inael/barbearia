import { revalidatePath } from "next/cache";
import { redirect } from "next/navigation";
import { auth } from "@/auth";
import { getDb } from "@/lib/db";
import { podeAcessar } from "@/lib/auth/rbac";
import {
  lerConfigFiscal,
  salvarConfigFiscal,
  chaveMascarada,
  oQueFalta,
  AMBIENTES,
  type Ambiente,
} from "@/lib/nota-fiscal-asaas";
import PageHeader from "@/components/PageHeader";
import Aviso from "@/components/Aviso";

export const dynamic = "force-dynamic";
const ROTA = "/configuracoes/fiscal";

async function autorizado() {
  const session = await auth();
  return Boolean(session?.user?.papel && podeAcessar(session.user.papel, "config"));
}

async function salvar(formData: FormData) {
  "use server";
  if (!(await autorizado())) return;
  try {
    await salvarConfigFiscal(getDb(), {
      ambiente: String(formData.get("ambiente") || "sandbox") as Ambiente,
      chave: String(formData.get("chave") || ""),
      codigoServico: String(formData.get("codigoServico") || ""),
      descricaoServico: String(formData.get("descricaoServico") || ""),
      issPercent: Number(String(formData.get("issPercent") || "0").replace(",", ".")),
      ativo: formData.get("ativo") === "on",
    });
  } catch (e) {
    redirect(`${ROTA}?erro=${encodeURIComponent(e instanceof Error ? e.message : "erro ao salvar")}`);
  }
  revalidatePath(ROTA);
  redirect(`${ROTA}?ok=${encodeURIComponent("Configuração fiscal salva.")}`);
}

const wrap = "min-h-screen bg-neutral-50 text-neutral-900";
const input =
  "rounded-lg border border-neutral-300 bg-white px-2 py-1.5 text-neutral-900 outline-none focus:border-neutral-900";
const btn = "rounded-lg bg-emerald-700 px-3 py-1.5 text-sm font-semibold text-white hover:bg-emerald-800";

export default async function FiscalPage({
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

  const cfg = await lerConfigFiscal(getDb());
  const falta = oQueFalta(cfg);

  return (
    <main className={wrap}>
      <div className="mx-auto max-w-3xl px-5 py-10">
        <PageHeader
          titulo="Nota fiscal"
          descricao="Emissão da nota de serviço pelo Asaas, com o CNPJ da barbearia. Sem isso configurado, a venda continua funcionando e a nota fica só registrada no sistema."
          ajuda={
            <>
              <p>
                A conta do Asaas precisa ser <strong>da barbearia</strong>. Se usar a conta de outra
                empresa, a nota sai com o CNPJ errado.
              </p>
              <p>
                Antes da primeira nota, o Asaas exige <strong>certificado digital</strong> e{" "}
                <strong>inscrição municipal</strong> cadastrados no painel dele. Isso é feito uma vez.
              </p>
              <p>
                O <strong>código de serviço</strong> é o da sua prefeitura. Barbearia costuma ser o
                item <strong>6.01</strong>, mas confirme com seu contador.
              </p>
              <p>
                Comece em <strong>sandbox</strong> para testar sem emitir nota de verdade. Só mude
                para produção quando estiver certo.
              </p>
            </>
          }
        />

        <Aviso ok={sp?.ok} erro={sp?.erro} />

        {!falta.pronto ? (
          <p
            className="mt-4 rounded-xl border border-amber-300 bg-amber-50 p-4 text-sm text-amber-900"
            data-testid="fiscal-falta"
          >
            Ainda falta: {falta.faltando.join(", ")}.
          </p>
        ) : null}

        <section className="mt-6">
          <form action={salvar} className="flex flex-col gap-4 rounded-xl border border-neutral-200 bg-white p-5">
            <label className="flex flex-col gap-1 text-xs font-medium">
              Ambiente
              <select name="ambiente" defaultValue={cfg.ambiente} aria-label="Ambiente" data-testid="fis-ambiente" className={input}>
                {AMBIENTES.map((a) => (
                  <option key={a} value={a}>
                    {a === "sandbox" ? "Sandbox (teste, não emite de verdade)" : "Produção (emite nota real)"}
                  </option>
                ))}
              </select>
            </label>

            <label className="flex flex-col gap-1 text-xs font-medium">
              Chave da API do Asaas
              <input
                name="chave"
                type="password"
                autoComplete="off"
                placeholder={cfg.chave ? "deixe vazio para manter a atual" : "cole a chave aqui"}
                aria-label="Chave da API"
                data-testid="fis-chave"
                className={input}
              />
              <span className="font-normal text-neutral-600" data-testid="fis-chave-atual">
                {cfg.chave ? `Chave salva: ${chaveMascarada(cfg.chave)}` : "Nenhuma chave salva ainda."}
              </span>
            </label>

            <div className="flex flex-wrap gap-4">
              <label className="flex flex-col gap-1 text-xs font-medium">
                Código de serviço
                <input
                  name="codigoServico"
                  defaultValue={cfg.codigoServico ?? ""}
                  placeholder="ex.: 6.01"
                  aria-label="Código de serviço"
                  data-testid="fis-codigo"
                  className={`${input} w-28`}
                />
              </label>
              <label className="flex flex-col gap-1 text-xs font-medium">
                ISS (%)
                <input
                  name="issPercent"
                  defaultValue={String(cfg.issPercent)}
                  inputMode="decimal"
                  aria-label="ISS"
                  data-testid="fis-iss"
                  className={`${input} w-24`}
                />
              </label>
              <label className="flex min-w-64 flex-1 flex-col gap-1 text-xs font-medium">
                Descrição do serviço na nota
                <input
                  name="descricaoServico"
                  defaultValue={cfg.descricaoServico ?? ""}
                  placeholder="ex.: Serviços de barbearia"
                  aria-label="Descrição do serviço"
                  data-testid="fis-descricao"
                  className={input}
                />
              </label>
            </div>

            <label className="flex items-center gap-2 text-sm font-medium">
              <input type="checkbox" name="ativo" defaultChecked={cfg.ativo} aria-label="Emissão ligada" data-testid="fis-ativo" className="h-4 w-4" />
              Emitir nota automaticamente ao fechar a conta
            </label>

            <div>
              <button type="submit" className={btn} data-testid="fis-salvar">Salvar</button>
            </div>
          </form>
        </section>
      </div>
    </main>
  );
}
