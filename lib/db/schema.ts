import { pgTable, serial, text, integer, boolean, pgEnum, uniqueIndex } from "drizzle-orm/pg-core";

export const papelEnum = pgEnum("papel", ["dono", "recepcionista", "barbeiro"]);

/** Servicos avulsos (corte, barba, quimica, etc). */
export const servicos = pgTable("servicos", {
  id: serial("id").primaryKey(),
  slug: text("slug").notNull().unique(),
  nome: text("nome").notNull(),
  precoCentavos: integer("preco_centavos").notNull(),
  duracaoMin: integer("duracao_min").notNull(),
  entraPote: boolean("entra_pote").notNull().default(false),
  pontosPote: integer("pontos_pote").notNull().default(0),
  ativo: boolean("ativo").notNull().default(true),
});

/** Combos (pacotes de servicos). */
export const combos = pgTable("combos", {
  id: serial("id").primaryKey(),
  slug: text("slug").notNull().unique(),
  nome: text("nome").notNull(),
  precoCentavos: integer("preco_centavos").notNull(),
  duracaoMin: integer("duracao_min").notNull(),
  inclui: text("inclui").notNull(),
  ativo: boolean("ativo").notNull().default(true),
});

/** Profissionais (barbeiros, recepcionistas, dono). */
export const profissionais = pgTable("profissionais", {
  id: serial("id").primaryKey(),
  nome: text("nome").notNull(),
  papel: papelEnum("papel").notNull(),
  ativo: boolean("ativo").notNull().default(true),
});

/** Override de duração de um serviço por barbeiro (R1). Sem linha = usa a duração padrão do serviço. */
export const duracoesBarbeiro = pgTable(
  "duracoes_barbeiro",
  {
    id: serial("id").primaryKey(),
    profissionalId: integer("profissional_id")
      .notNull()
      .references(() => profissionais.id, { onDelete: "cascade" }),
    servicoId: integer("servico_id")
      .notNull()
      .references(() => servicos.id, { onDelete: "cascade" }),
    duracaoMin: integer("duracao_min").notNull(),
  },
  (t) => [uniqueIndex("uniq_duracao_barbeiro_servico").on(t.profissionalId, t.servicoId)],
);

export type Servico = typeof servicos.$inferSelect;
export type Combo = typeof combos.$inferSelect;
export type Profissional = typeof profissionais.$inferSelect;
export type DuracaoBarbeiro = typeof duracoesBarbeiro.$inferSelect;
