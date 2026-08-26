// Primeiros passos do onboarding (feedback UX 2026-08-26): checklist
// autoexplicativo que aparece após o login, com progresso REAL (contagens do
// banco) e link direto de cada passo. Some sozinho quando tudo está feito.
import type { PostgresJsDatabase } from "drizzle-orm/postgres-js";
import { eq, sql } from "drizzle-orm";
import * as schema from "./db/schema";

type DB = PostgresJsDatabase<typeof schema>;

export interface PassoOnboarding {
  chave: string;
  titulo: string;
  descricao: string;
  href: string;
  feito: boolean;
}

async function conta(db: DB, tabela: { id: unknown }): Promise<number> {
  // drizzle aceita qualquer pgTable aqui; o cast evita repetir o select em cada passo
  const [row] = await db.select({ n: sql<number>`count(*)` }).from(tabela as never);
  return Number((row as { n: number })?.n ?? 0);
}

/** Passos do onboarding com o estado real do banco. */
export async function primeirosPassos(db: DB): Promise<PassoOnboarding[]> {
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
    },
    {
      chave: "profissionais",
      titulo: "Cadastre a equipe",
      descricao: "Barbeiros e recepção — cada um com a sua comissão e agenda.",
      href: "/cadastros/profissionais",
      feito: profissionais > 0,
    },
    {
      chave: "horarios",
      titulo: "Configure os horários de funcionamento",
      descricao: "Dias e horários em que a agenda aceita marcação (e feriados).",
      href: "/cadastros/horarios",
      feito: horarios > 0,
    },
    {
      chave: "clientes",
      titulo: "Cadastre o primeiro cliente",
      descricao: "Só nome e telefone — o CPF fica pra hora da nota.",
      href: "/cadastros/clientes",
      feito: clientes > 0,
    },
    {
      chave: "agendamento",
      titulo: "Faça o primeiro agendamento",
      descricao: "Escolha o cliente, o serviço e o horário livre na agenda.",
      href: "/agenda",
      feito: agendamentos > 0,
    },
    {
      chave: "venda",
      titulo: "Feche a primeira conta no caixa",
      descricao: "Abra a comanda, lance os itens e feche — é isso que alimenta comissão e painel.",
      href: "/caixa",
      feito: Number(vendas?.n ?? 0) > 0,
    },
  ];
}
