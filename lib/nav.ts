// Modelo de navegação do shell (sidebar). Puro e testável: os grupos/itens que cada
// papel enxerga. A UI (components/AppFrame.tsx) só renderiza o que sai daqui.
import { podeAcessar, type Papel } from "./auth/rbac";

export interface ItemNav {
  href: string;
  label: string;
}

export interface GrupoNav {
  /** null = grupo sem título (topo). */
  titulo: string | null;
  itens: ItemNav[];
}

/** Grupos de menu visíveis para o papel (null = visitante deslogado). */
export function gruposParaPapel(papel: Papel | null): GrupoNav[] {
  const pode = (r: Parameters<typeof podeAcessar>[1]) => (papel ? podeAcessar(papel, r) : false);

  const visaoGeral: ItemNav[] = [];
  if (pode("config")) visaoGeral.push({ href: "/painel", label: "Painel do dono" });
  visaoGeral.push({ href: "/", label: "Catálogo" });
  visaoGeral.push({ href: "/comissao", label: "Comissão" });

  const operacao: ItemNav[] = [];
  if (pode("agenda")) operacao.push({ href: "/agenda", label: "Agenda" });
  if (pode("agenda_propria")) operacao.push({ href: "/minha-agenda", label: "Minha agenda" });
  if (pode("caixa")) operacao.push({ href: "/caixa", label: "Caixa" });
  if (pode("caixa") || pode("comissao")) operacao.push({ href: "/vales", label: "Vales" });

  const cadastros: ItemNav[] = [];
  if (pode("cadastro")) {
    cadastros.push({ href: "/cadastros", label: "Cadastros" });
    cadastros.push({ href: "/cadastros/servicos", label: "Serviços e combos" });
    cadastros.push({ href: "/cadastros/produtos", label: "Produtos" });
    cadastros.push({ href: "/cadastros/clientes", label: "Clientes" });
  }
  if (pode("config")) {
    cadastros.push({ href: "/cadastros/profissionais", label: "Profissionais" });
    cadastros.push({ href: "/cadastros/usuarios", label: "Usuários" });
    cadastros.push({ href: "/cadastros/horarios", label: "Horários" });
  }

  const gestao: ItemNav[] = [];
  if (pode("config") || pode("comissao")) gestao.push({ href: "/metas", label: "Metas" });
  if (pode("estoque")) gestao.push({ href: "/estoque", label: "Estoque" });
  if (pode("config") || pode("caixa")) gestao.push({ href: "/assinaturas", label: "Assinaturas" });
  if (pode("config") || pode("comissao")) gestao.push({ href: "/pote", label: "Pote" });
  if (pode("config")) gestao.push({ href: "/notificacoes", label: "Avisos" });

  const tv: ItemNav[] = [];
  if (pode("tv")) tv.push({ href: "/admin/tv", label: "TVs" });

  const conta: ItemNav[] = [];
  if (papel) conta.push({ href: "/conta", label: "Conta" });

  const grupos: GrupoNav[] = [
    { titulo: null, itens: visaoGeral },
    { titulo: "Operação", itens: operacao },
    { titulo: "Cadastros", itens: cadastros },
    { titulo: "Gestão", itens: gestao },
    { titulo: "TV", itens: tv },
    { titulo: null, itens: conta },
  ];
  return grupos.filter((g) => g.itens.length > 0);
}
