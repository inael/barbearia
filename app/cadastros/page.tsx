import Link from "next/link";
import { auth } from "@/auth";
import { podeAcessar } from "@/lib/auth/rbac";

export const dynamic = "force-dynamic";

const wrap = "min-h-screen bg-neutral-50 text-neutral-900 dark:bg-neutral-950 dark:text-neutral-100";
const card =
  "block rounded-xl border border-neutral-200 bg-white p-5 hover:border-neutral-400 dark:border-neutral-800 dark:bg-neutral-900";

export default async function CadastrosHubPage() {
  const session = await auth();
  const papel = session?.user?.papel;

  if (!papel || !podeAcessar(papel, "cadastro")) {
    return (
      <main className={wrap}>
        <div className="mx-auto max-w-2xl px-5 py-10">
          <p role="alert" className="text-sm text-neutral-700 dark:text-neutral-300">Sem acesso a esta página.</p>
        </div>
      </main>
    );
  }

  const podeConfig = podeAcessar(papel, "config");

  return (
    <main className={wrap}>
      <div className="mx-auto max-w-3xl px-5 py-10">
        <h1 className="text-2xl font-bold tracking-tight">Cadastros</h1>
        <p className="mt-1 text-sm text-neutral-600">Tudo que a barbearia precisa manter atualizado.</p>

        <div className="mt-6 grid gap-4 sm:grid-cols-2">
          <Link href="/cadastros/servicos" className={card}>
            <h2 className="font-semibold">Serviços e combos</h2>
            <p className="mt-1 text-sm text-neutral-600">Preços, durações e o que entra no pote.</p>
          </Link>
          <Link href="/cadastros/clientes" className={card}>
            <h2 className="font-semibold">Clientes</h2>
            <p className="mt-1 text-sm text-neutral-600">Pré-cadastro por telefone; CPF só na nota.</p>
          </Link>
          {podeConfig ? (
            <>
              <Link href="/cadastros/profissionais" className={card}>
                <h2 className="font-semibold">Profissionais</h2>
                <p className="mt-1 text-sm text-neutral-600">Equipe: barbeiros, recepção e dono.</p>
              </Link>
              <Link href="/cadastros/usuarios" className={card}>
                <h2 className="font-semibold">Usuários / logins</h2>
                <p className="mt-1 text-sm text-neutral-600">Acessos ao sistema e papéis.</p>
              </Link>
              <Link href="/cadastros/horarios" className={card}>
                <h2 className="font-semibold">Horários de funcionamento</h2>
                <p className="mt-1 text-sm text-neutral-600">Dias, abertura/fechamento e feriados.</p>
              </Link>
            </>
          ) : null}
        </div>
      </div>
    </main>
  );
}
