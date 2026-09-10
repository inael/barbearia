"use client";

// Padrão de feedback do sistema (pedido do Inael 2026-09-10): TODA ação — cadastro,
// edição, exclusão — precisa confirmar na tela. Antes o usuário salvava e nada
// acontecia; só dava pra saber que funcionou dando F5.
//
// Como funciona: a server action termina com redirect("...?ok=mensagem") ou
// "?erro=mensagem". Esta faixa lê isso, mostra e some sozinha depois de alguns
// segundos (6s no sucesso, 10s no erro — erro precisa de mais tempo de leitura),
// limpando o endereço para a mensagem não voltar ao atualizar a página.
import { useEffect, useState } from "react";
import { useRouter } from "next/navigation";
import { CheckCircle2, AlertCircle, X } from "lucide-react";

export default function Aviso({ ok, erro }: { ok?: string; erro?: string }) {
  // `key` faz o React remontar quando a mensagem muda, então o estado nasce certo
  // e não precisa ser sincronizado dentro do efeito.
  return <AvisoInterno key={`${ok ?? ""}|${erro ?? ""}`} ok={ok} erro={erro} />;
}

function AvisoInterno({ ok, erro }: { ok?: string; erro?: string }) {
  const [visivel, setVisivel] = useState(Boolean(ok || erro));
  const router = useRouter();
  const sucesso = Boolean(ok);
  const texto = ok || erro;

  useEffect(() => {
    if (!ok && !erro) return;
    // limpa ?ok/?erro do endereço: assim o F5 não repete a mensagem
    const limparUrl = () => {
      const u = new URL(window.location.href);
      u.searchParams.delete("ok");
      u.searchParams.delete("erro");
      window.history.replaceState(null, "", u.pathname + (u.search || ""));
    };
    // erro fica mais tempo na tela: costuma exigir leitura e ação
    const t = setTimeout(() => {
      setVisivel(false);
      limparUrl();
      router.refresh();
    }, sucesso ? 6000 : 10000);
    return () => clearTimeout(t);
  }, [ok, erro, sucesso, router]);

  if (!visivel || !texto) return null;

  const Icone = sucesso ? CheckCircle2 : AlertCircle;
  return (
    <div
      role="status"
      aria-live="polite"
      data-testid={sucesso ? "aviso-ok" : "aviso-erro"}
      className={`mb-4 flex items-start gap-3 rounded-xl border px-4 py-3 text-sm ${
        sucesso
          ? "border-emerald-300 bg-emerald-50 text-emerald-900"
          : "border-red-300 bg-red-50 text-red-900"
      }`}
    >
      <Icone aria-hidden size={18} strokeWidth={2} className={`mt-0.5 shrink-0 ${sucesso ? "text-emerald-700" : "text-red-700"}`} />
      <div className="min-w-0 flex-1">
        <p className="font-semibold">{sucesso ? "Pronto!" : "Não deu certo"}</p>
        <p className="mt-0.5">{texto}</p>
      </div>
      <button
        type="button"
        onClick={() => setVisivel(false)}
        aria-label="Fechar aviso"
        className={`shrink-0 rounded p-1 ${sucesso ? "hover:bg-emerald-100" : "hover:bg-red-100"}`}
      >
        <X aria-hidden size={16} />
      </button>
    </div>
  );
}
