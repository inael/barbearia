"use client";

// Faixa de recados no topo do sistema (pedido do Inael 2026-09-10): o dono publica
// um aviso — "salário sai dia 5", "festa sexta", "meta nova do mês" — e TODA a
// equipe vê ao entrar, sem depender de grupo de WhatsApp.
//
// Quem dispensa um recado não vê de novo naquele navegador (fica guardado no
// próprio aparelho). Publicar um recado novo aparece para todos outra vez.
import { useSyncExternalStore } from "react";
import { Info, TriangleAlert, PartyPopper, X } from "lucide-react";

export interface RecadoView {
  id: number;
  mensagem: string;
  tipo: string;
}

const ESTILO: Record<string, { cls: string; Icone: typeof Info }> = {
  info: { cls: "border-sky-300 bg-sky-50 text-sky-900", Icone: Info },
  alerta: { cls: "border-amber-300 bg-amber-50 text-amber-900", Icone: TriangleAlert },
  comemoracao: { cls: "border-emerald-300 bg-emerald-50 text-emerald-900", Icone: PartyPopper },
};

const CHAVE = "recados-dispensados";

// Os dispensados moram no localStorage (fora do React). `useSyncExternalStore` é a
// forma correta de ler isso: não escreve estado dentro de efeito e não quebra a
// hidratação — no servidor o snapshot é sempre vazio.
const ouvintes = new Set<() => void>();
function inscrever(cb: () => void) {
  ouvintes.add(cb);
  window.addEventListener("storage", cb); // outra aba dispensou
  return () => {
    ouvintes.delete(cb);
    window.removeEventListener("storage", cb);
  };
}
function lerCliente(): string {
  try {
    return window.localStorage.getItem(CHAVE) ?? "";
  } catch {
    return ""; // navegador sem storage: mostra tudo
  }
}
const lerServidor = () => "";

function dispensar(id: number, atual: number[]) {
  const novo = [...atual, id].slice(-50);
  try {
    window.localStorage.setItem(CHAVE, JSON.stringify(novo));
  } catch {
    /* sem storage: some só nesta visita */
  }
  ouvintes.forEach((cb) => cb());
}

export default function MuralRecados({ recados }: { recados: RecadoView[] }) {
  const cru = useSyncExternalStore(inscrever, lerCliente, lerServidor);
  let dispensados: number[] = [];
  try {
    dispensados = cru ? (JSON.parse(cru) as number[]) : [];
  } catch {
    dispensados = [];
  }

  const visiveis = recados.filter((r) => !dispensados.includes(r.id));
  if (visiveis.length === 0) return null;

  return (
    <div data-testid="mural-recados" className="flex flex-col gap-2 px-5 pt-4">
      {visiveis.map((r) => {
        const { cls, Icone } = ESTILO[r.tipo] ?? ESTILO.info;
        return (
          <div
            key={r.id}
            data-recado={r.id}
            role="status"
            className={`mx-auto flex w-full max-w-4xl items-start gap-3 rounded-xl border px-4 py-3 text-sm ${cls}`}
          >
            <Icone aria-hidden size={18} strokeWidth={2} className="mt-0.5 shrink-0" />
            <p className="min-w-0 flex-1 font-medium">{r.mensagem}</p>
            <button
              type="button"
              onClick={() => dispensar(r.id, dispensados)}
              aria-label="Dispensar recado"
              className="shrink-0 rounded p-1 hover:bg-black/5"
            >
              <X aria-hidden size={16} />
            </button>
          </div>
        );
      })}
    </div>
  );
}
