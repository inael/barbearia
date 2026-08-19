// RBAC da barbearia. Fonte: CLAUDE.md — Dono (total), Recepcionista (agenda/caixa/
// estoque/cadastro), Barbeiro (só a própria agenda + os próprios números).

export type Papel = "dono" | "recepcionista" | "barbeiro";
export type Recurso =
  | "agenda"
  | "agenda_propria"
  | "comissao"
  | "caixa"
  | "estoque"
  | "cadastro"
  | "tv"
  | "config";

export const PAPEIS: Papel[] = ["dono", "recepcionista", "barbeiro"];

const PERMISSOES: Record<Papel, Recurso[]> = {
  dono: ["agenda", "agenda_propria", "comissao", "caixa", "estoque", "cadastro", "tv", "config"],
  recepcionista: ["agenda", "caixa", "estoque", "cadastro"],
  barbeiro: ["agenda_propria", "comissao"],
};

/** True se o papel pode acessar o recurso. Papel/recurso desconhecido -> false. */
export function podeAcessar(papel: Papel, recurso: Recurso): boolean {
  return PERMISSOES[papel]?.includes(recurso) ?? false;
}
