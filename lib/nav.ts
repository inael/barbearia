// Modelo de navegação do shell (sidebar). Puro e testável: os grupos/itens que cada
// papel enxerga. A UI (components/AppFrame.tsx) só renderiza o que sai daqui.
//
// Hierarquia (feedback do Inael 2026-09-10): item PAI tem ícone; os filhos ficam
// indentados sob ele, ligados por uma guia vertical. Antes tudo vinha no mesmo
// nível e não dava pra distinguir menu de submenu.
import { podeAcessar, type Papel } from "./auth/rbac";

/** Nome do ícone em `lucide-react` (a UI resolve; aqui fica só o dado). */
export type IconeNav =
  | "LayoutDashboard" | "BookOpen" | "Calculator" | "CalendarDays" | "CalendarClock"
  | "ShoppingCart" | "Receipt" | "FolderCog" | "Scissors" | "Package" | "Users"
  | "UserCog" | "IdCard" | "Clock" | "Target" | "Boxes" | "CreditCard" | "PiggyBank"
  | "Bell" | "MonitorPlay" | "CircleUser" | "Megaphone" | "Settings" | "MessageCircle";

export interface ItemNav {
  href: string;
  label: string;
  icone: IconeNav;
  /** Submenus: aparecem indentados sob o pai. */
  filhos?: ItemNav[];
}

export interface GrupoNav {
  /** null = grupo sem título (topo). */
  titulo: string | null;
  itens: ItemNav[];
}

/** Grupos de menu visíveis para o papel. Visitante (null) não vê menu nenhum:
 * o app inteiro exige login (UXS-012) — deslogado só existe /login e o player da TV. */
export function gruposParaPapel(papel: Papel | null): GrupoNav[] {
  if (!papel) return [];
  const pode = (r: Parameters<typeof podeAcessar>[1]) => podeAcessar(papel, r);

  const visaoGeral: ItemNav[] = [];
  if (pode("config")) visaoGeral.push({ href: "/painel", label: "Painel do dono", icone: "LayoutDashboard" });
  visaoGeral.push({ href: "/", label: "Catálogo", icone: "BookOpen" });
  visaoGeral.push({ href: "/comissao", label: "Comissão", icone: "Calculator" });

  const operacao: ItemNav[] = [];
  if (pode("agenda")) {
    const agenda: ItemNav = { href: "/agenda", label: "Agenda", icone: "CalendarDays" };
    if (pode("agenda_propria")) {
      agenda.filhos = [{ href: "/minha-agenda", label: "Minha agenda", icone: "CalendarClock" }];
    }
    operacao.push(agenda);
  } else if (pode("agenda_propria")) {
    operacao.push({ href: "/minha-agenda", label: "Minha agenda", icone: "CalendarClock" });
  }
  if (pode("caixa")) operacao.push({ href: "/caixa", label: "Caixa", icone: "ShoppingCart" });
  if (pode("caixa") || pode("comissao")) operacao.push({ href: "/vales", label: "Vales", icone: "Receipt" });

  const cadastros: ItemNav[] = [];
  if (pode("cadastro")) {
    const filhos: ItemNav[] = [
      { href: "/cadastros/servicos", label: "Serviços e combos", icone: "Scissors" },
      { href: "/cadastros/produtos", label: "Produtos", icone: "Package" },
      { href: "/cadastros/clientes", label: "Clientes", icone: "Users" },
    ];
    if (pode("config")) {
      filhos.push({ href: "/cadastros/profissionais", label: "Profissionais", icone: "IdCard" });
      filhos.push({ href: "/cadastros/usuarios", label: "Usuários", icone: "UserCog" });
      filhos.push({ href: "/cadastros/horarios", label: "Horários", icone: "Clock" });
    }
    cadastros.push({ href: "/cadastros", label: "Cadastros", icone: "FolderCog", filhos });
  }

  const gestao: ItemNav[] = [];
  if (pode("config") || pode("comissao")) gestao.push({ href: "/metas", label: "Metas", icone: "Target" });
  if (pode("estoque")) gestao.push({ href: "/estoque", label: "Estoque", icone: "Boxes" });
  if (pode("config") || pode("caixa")) {
    const ass: ItemNav = { href: "/assinaturas", label: "Assinaturas", icone: "CreditCard" };
    if (pode("config") || pode("comissao")) {
      ass.filhos = [{ href: "/pote", label: "Pote", icone: "PiggyBank" }];
    }
    gestao.push(ass);
  } else if (pode("comissao")) {
    gestao.push({ href: "/pote", label: "Pote", icone: "PiggyBank" });
  }
  if (pode("config")) {
    gestao.push({
      href: "/notificacoes",
      label: "Avisos",
      icone: "Bell",
      filhos: [{ href: "/notificacoes/recados", label: "Recados da equipe", icone: "Megaphone" }],
    });
  }

  const tv: ItemNav[] = [];
  if (pode("tv")) tv.push({ href: "/admin/tv", label: "TVs", icone: "MonitorPlay" });

  const config: ItemNav[] = [];
  if (pode("config")) {
    config.push({
      href: "/configuracoes",
      label: "Configurações",
      icone: "Settings",
      filhos: [{ href: "/configuracoes/whatsapp", label: "WhatsApp", icone: "MessageCircle" }],
    });
  }

  const conta: ItemNav[] = [{ href: "/conta", label: "Conta", icone: "CircleUser" }];

  const grupos: GrupoNav[] = [
    { titulo: null, itens: visaoGeral },
    { titulo: "Operação", itens: operacao },
    { titulo: "Cadastros", itens: cadastros },
    { titulo: "Gestão", itens: gestao },
    { titulo: "TV", itens: tv },
    { titulo: "Sistema", itens: config },
    { titulo: null, itens: conta },
  ];
  return grupos.filter((g) => g.itens.length > 0);
}

/** Todos os hrefs visíveis para o papel (pais + filhos) — usado em testes/varreduras. */
export function hrefsVisiveis(papel: Papel | null): string[] {
  return gruposParaPapel(papel).flatMap((g) =>
    g.itens.flatMap((i) => [i.href, ...(i.filhos ?? []).map((f) => f.href)]),
  );
}
