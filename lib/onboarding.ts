// Primeiros passos do onboarding (feedback UX 2026-08-26): checklist
// autoexplicativo que aparece após o login, com progresso REAL (contagens do
// banco) e link direto de cada passo. Some sozinho quando tudo está feito.
import type { PostgresJsDatabase } from "drizzle-orm/postgres-js";
import { eq, sql } from "drizzle-orm";
import * as schema from "./db/schema";
import { podeAcessar, type Papel, type Recurso } from "./auth/rbac";

type DB = PostgresJsDatabase<typeof schema>;

export interface PassoOnboarding {
  chave: string;
  titulo: string;
  descricao: string;
  href: string;
  feito: boolean;
  /** Permissão exigida pela tela do passo — quem não tem, não vê o passo. */
  recurso: Recurso;
}

async function conta(db: DB, tabela: { id: unknown }): Promise<number> {
  // drizzle aceita qualquer pgTable aqui; o cast evita repetir o select em cada passo
  const [row] = await db.select({ n: sql<number>`count(*)` }).from(tabela as never);
  return Number((row as { n: number })?.n ?? 0);
}

/**
 * Passos do onboarding com o estado real do banco, **filtrados pelo papel**:
 * cada passo leva a uma tela protegida, então quem não tem a permissão não vê
 * o passo (senão o botão "Fazer agora" cairia num "Sem acesso a esta página").
 * `papel` null = sem filtro (uso interno/teste).
 */
export async function primeirosPassos(db: DB, papel?: Papel | null): Promise<PassoOnboarding[]> {
  const todos = await todosOsPassos(db);
  return papel ? todos.filter((p) => podeAcessar(papel, p.recurso)) : todos;
}

async function todosOsPassos(db: DB): Promise<PassoOnboarding[]> {
  const [servicos, profissionais, horarios, clientes, agendamentos] = await Promise.all([
    conta(db, schema.servicos),
    conta(db, schema.profissionais),
    conta(db, schema.horariosFuncionamento),
    conta(db, schema.clientes),
    conta(db, schema.agendamentos),
  ]);
  const [vendas] = await db
    .select({ n: sql<number>`count(*)` })
    .from(schema.comandas)
    .where(eq(schema.comandas.status, "fechada"));

  return [
    {
      chave: "servicos",
      titulo: "Cadastre os serviços e combos",
      descricao: "Preços e durações que aparecem no catálogo, na agenda e no caixa.",
      href: "/cadastros/servicos",
      feito: servicos > 0,
      recurso: "cadastro",
    },
    {
      chave: "profissionais",
      titulo: "Cadastre a equipe",
      descricao: "Barbeiros e recepção — cada um com a sua comissão e agenda.",
      href: "/cadastros/profissionais",
      feito: profissionais > 0,
      recurso: "config", // tela dono-only
    },
    {
      chave: "horarios",
      titulo: "Configure os horários de funcionamento",
      descricao: "Dias e horários em que a agenda aceita marcação (e feriados).",
      href: "/cadastros/horarios",
      feito: horarios > 0,
      recurso: "config", // tela dono-only
    },
    {
      chave: "clientes",
      titulo: "Cadastre o primeiro cliente",
      descricao: "Só nome e telefone — o CPF fica pra hora da nota.",
      href: "/cadastros/clientes",
      feito: clientes > 0,
      recurso: "cadastro",
    },
    {
      chave: "agendamento",
      titulo: "Faça o primeiro agendamento",
      descricao: "Escolha o cliente, o serviço e o horário livre na agenda.",
      href: "/agenda",
      feito: agendamentos > 0,
      recurso: "agenda",
    },
    {
      chave: "venda",
      titulo: "Feche a primeira conta no caixa",
      descricao: "Abra a comanda, lance os itens e feche — é isso que alimenta comissão e painel.",
      href: "/caixa",
      feito: Number(vendas?.n ?? 0) > 0,
      recurso: "caixa",
    },
  ];
}
