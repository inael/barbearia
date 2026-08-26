import type { ReactNode } from "react";

/**
 * Cabeçalho padrão de tela: título + o que a tela é/pra que serve + bloco
 * expansível "Como funciona esta tela?" (feedback UX 2026-08-26: nenhuma tela
 * pode ficar sem explicação).
 */
export default function PageHeader({
  titulo,
  descricao,
  ajuda,
  acoes,
}: {
  titulo: string;
  descricao: string;
  ajuda?: ReactNode;
  acoes?: ReactNode;
}) {
  return (
    <header className="mb-6 border-b border-neutral-200 pb-4 dark:border-neutral-800">
      <div className="flex flex-wrap items-start justify-between gap-3">
        <div>
          <h1 className="text-2xl font-bold tracking-tight">{titulo}</h1>
          <p className="mt-1 max-w-2xl text-sm text-neutral-600 dark:text-neutral-400">{descricao}</p>
        </div>
        {acoes ? <div className="flex items-center gap-2">{acoes}</div> : null}
      </div>
      {ajuda ? (
        <details data-testid="ajuda-tela" className="mt-3 max-w-2xl rounded-lg border border-neutral-200 bg-white text-sm dark:border-neutral-800 dark:bg-neutral-900">
          <summary className="cursor-pointer select-none px-3 py-2 font-medium text-emerald-800 dark:text-emerald-400">
            Como funciona esta tela?
          </summary>
          <div className="space-y-2 px-3 pb-3 text-neutral-700 dark:text-neutral-300">{ajuda}</div>
        </details>
      ) : null}
    </header>
  );
}
