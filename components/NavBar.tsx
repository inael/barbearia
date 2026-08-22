import Link from "next/link";
import { auth, signOut } from "@/auth";
import { podeAcessar, type Papel } from "@/lib/auth/rbac";

const papelLabel: Record<Papel, string> = { dono: "Dono", recepcionista: "Recepção", barbeiro: "Barbeiro" };

const linkCls = "hover:text-neutral-900 dark:hover:text-neutral-100";

export default async function NavBar() {
  const session = await auth();
  const papel = session?.user?.papel as Papel | undefined;
  const nome = session?.user?.name;

  return (
    <nav className="border-b border-neutral-200 bg-white dark:border-neutral-800 dark:bg-neutral-950">
      <div className="mx-auto flex max-w-5xl flex-wrap items-center gap-x-4 gap-y-2 px-5 py-3">
        <span className="text-sm font-bold tracking-tight">Faith Barbearia</span>
        <div className="flex flex-wrap items-center gap-x-4 gap-y-1 text-sm text-neutral-600">
          <Link href="/" className={linkCls}>Painel</Link>
          <Link href="/comissao" className={linkCls}>Comissao</Link>
          {papel && podeAcessar(papel, "agenda_propria") ? (
            <Link href="/minha-agenda" className={linkCls}>Minha agenda</Link>
          ) : null}
          {papel && podeAcessar(papel, "cadastro") ? (
            <Link href="/cadastros" className={linkCls}>Cadastros</Link>
          ) : null}
          {papel && podeAcessar(papel, "tv") ? (
            <Link href="/admin/tv" className={linkCls}>TVs</Link>
          ) : null}
          {papel ? (
            <Link href="/conta" className={linkCls}>Conta</Link>
          ) : null}
        </div>

        <div className="ml-auto flex flex-wrap items-center gap-3">
          {papel ? (
            <>
              <span className="text-xs text-neutral-500" data-testid="nav-usuario">
                {nome} · {papelLabel[papel] ?? papel}
              </span>
              <form
                action={async () => {
                  "use server";
                  await signOut({ redirectTo: "/" });
                }}
              >
                <button
                  type="submit"
                  className="rounded-lg border border-neutral-300 px-3 py-1.5 text-xs font-medium text-neutral-800 hover:bg-neutral-100 dark:border-neutral-700 dark:text-neutral-200 dark:hover:bg-neutral-900"
                >
                  Sair
                </button>
              </form>
            </>
          ) : (
            <Link
              href="/login"
              className="rounded-lg border border-neutral-300 px-3 py-1.5 text-xs font-medium text-neutral-800 hover:bg-neutral-100 dark:border-neutral-700 dark:text-neutral-200 dark:hover:bg-neutral-900"
            >
              Entrar
            </Link>
          )}
          <a
            href="https://wa.me/556191196730?text=Ol%C3%A1%2C%20preciso%20de%20ajuda%20com%20o%20sistema%20da%20Faith%20Barbearia"
            target="_blank"
            rel="noopener noreferrer"
            aria-label="Abrir suporte no WhatsApp"
            className="rounded-lg bg-emerald-700 px-3 py-1.5 text-xs font-semibold text-white hover:bg-emerald-800 focus-visible:outline focus-visible:outline-2 focus-visible:outline-offset-2 focus-visible:outline-emerald-800"
          >
            Ajuda
          </a>
        </div>
      </div>
    </nav>
  );
}
