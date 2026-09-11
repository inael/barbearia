import Link from "next/link";
import { auth } from "@/auth";
import { podeAcessar } from "@/lib/auth/rbac";

export const dynamic = "force-dynamic";

const wrap = "min-h-screen bg-neutral-50 text-neutral-900";
const card = "block rounded-xl border border-neutral-200 bg-white p-5 hover:border-neutral-400";

export default async function ConfiguracoesHubPage() {
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

  return (
    <main className={wrap}>
      <div className="mx-auto max-w-3xl px-5 py-10">
        <h1 className="text-2xl font-bold tracking-tight">Configurações</h1>
        <p className="mt-1 text-sm text-neutral-600">
          Ligações do sistema com serviços de fora. Mexer aqui não muda nada do dia a dia da loja.
        </p>

        <div className="mt-6 grid gap-4 sm:grid-cols-2">
          <Link href="/configuracoes/whatsapp" className={card} data-testid="cfg-whatsapp">
            <h2 className="font-semibold">WhatsApp</h2>
            <p className="mt-1 text-sm text-neutral-600">
              Token e instância do SimplesZap, para o sistema mandar lembrete ao cliente e aviso ao dono.
            </p>
          </Link>
        </div>
      </div>
    </main>
  );
}
