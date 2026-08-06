import { pgTable, serial, text, integer, boolean, pgEnum } from "drizzle-orm/pg-core";

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

export type Servico = typeof servicos.$inferSelect;
export type Combo = typeof combos.$inferSelect;
export type Profissional = typeof profissionais.$inferSelect;
