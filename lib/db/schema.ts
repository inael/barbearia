import { pgTable, serial, text, integer, boolean, pgEnum, uniqueIndex, timestamp } from "drizzle-orm/pg-core";

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

/** Bloqueios de agenda (ausências) por barbeiro (R2). Intervalo semi-aberto [inicio, fim). */
export const bloqueiosAgenda = pgTable("bloqueios_agenda", {
  id: serial("id").primaryKey(),
  profissionalId: integer("profissional_id")
    .notNull()
    .references(() => profissionais.id, { onDelete: "cascade" }),
  inicio: timestamp("inicio", { withTimezone: true }).notNull(),
  fim: timestamp("fim", { withTimezone: true }).notNull(),
  motivo: text("motivo"),
});

/** TVs/telas de mídia indoor (R3). Cada tela tem playlist e velocidade PRÓPRIAS (não espelha). */
export const telas = pgTable("telas", {
  id: serial("id").primaryKey(),
  nome: text("nome").notNull(),
  velocidadeSegundos: integer("velocidade_segundos").notNull().default(10),
  ativo: boolean("ativo").notNull().default(true),
});

/** Item da playlist de uma tela (propaganda). Ordem única por tela. */
export const itensPlaylist = pgTable(
  "itens_playlist",
  {
    id: serial("id").primaryKey(),
    telaId: integer("tela_id")
      .notNull()
      .references(() => telas.id, { onDelete: "cascade" }),
    ordem: integer("ordem").notNull(),
    url: text("url").notNull(),
    ativo: boolean("ativo").notNull().default(true),
  },
  (t) => [uniqueIndex("uniq_tela_ordem").on(t.telaId, t.ordem)],
);

/** Usuários do sistema (login). Papel = RBAC; profissionalId liga o barbeiro ao seu cadastro. */
export const usuarios = pgTable("usuarios", {
  id: serial("id").primaryKey(),
  email: text("email").notNull().unique(),
  senhaHash: text("senha_hash").notNull(),
  nome: text("nome").notNull(),
  papel: papelEnum("papel").notNull(),
  profissionalId: integer("profissional_id").references(() => profissionais.id, { onDelete: "set null" }),
  ativo: boolean("ativo").notNull().default(true),
});

export type Servico = typeof servicos.$inferSelect;
export type Combo = typeof combos.$inferSelect;
export type Profissional = typeof profissionais.$inferSelect;
export type DuracaoBarbeiro = typeof duracoesBarbeiro.$inferSelect;
export type BloqueioAgenda = typeof bloqueiosAgenda.$inferSelect;
export type Tela = typeof telas.$inferSelect;
export type ItemPlaylist = typeof itensPlaylist.$inferSelect;
export type Usuario = typeof usuarios.$inferSelect;
