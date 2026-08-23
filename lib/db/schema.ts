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

/** Produtos vendidos no balcão (pomada, shampoo, etc.). Catálogo simples; estoque vem depois (EST). */
export const produtos = pgTable("produtos", {
  id: serial("id").primaryKey(),
  slug: text("slug").notNull().unique(),
  nome: text("nome").notNull(),
  precoCentavos: integer("preco_centavos").notNull(),
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
  telefone: text("telefone"),
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

/** Comanda do caixa. Aberta -> recebe itens; fechada = venda (fechadaEm + formaPagamento). */
export const comandas = pgTable("comandas", {
  id: serial("id").primaryKey(),
  clienteId: integer("cliente_id").references(() => clientes.id, { onDelete: "set null" }),
  status: text("status").notNull().default("aberta"),
  formaPagamento: text("forma_pagamento"),
  criadoEm: timestamp("criado_em", { withTimezone: true }).notNull().defaultNow(),
  fechadaEm: timestamp("fechada_em", { withTimezone: true }),
});

/** Item de uma comanda. tipo: servico|combo|produto. slug do serviço p/ detectar dividido. */
export const comandaItens = pgTable("comanda_itens", {
  id: serial("id").primaryKey(),
  comandaId: integer("comanda_id")
    .notNull()
    .references(() => comandas.id, { onDelete: "cascade" }),
  tipo: text("tipo").notNull(),
  refId: integer("ref_id").notNull(),
  slug: text("slug"),
  profissionalId: integer("profissional_id")
    .notNull()
    .references(() => profissionais.id, { onDelete: "restrict" }),
  descricao: text("descricao").notNull(),
  valorCentavos: integer("valor_centavos").notNull(),
});

/** Horário de funcionamento por dia da semana (0=domingo..6=sábado). Minutos desde a meia-noite. */
export const horariosFuncionamento = pgTable("horarios_funcionamento", {
  id: serial("id").primaryKey(),
  diaSemana: integer("dia_semana").notNull().unique(),
  abreMin: integer("abre_min").notNull(),
  fechaMin: integer("fecha_min").notNull(),
  fechado: boolean("fechado").notNull().default(false),
});

/** Feriados (data ISO 'YYYY-MM-DD'): a barbearia fica fechada. */
export const feriados = pgTable("feriados", {
  id: serial("id").primaryKey(),
  data: text("data").notNull().unique(),
  descricao: text("descricao"),
});

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

/** Clientes da barbearia. Reconhecidos pelo telefone (normalizado). CPF só no fechamento (NF). */
export const clientes = pgTable("clientes", {
  id: serial("id").primaryKey(),
  nome: text("nome").notNull(),
  telefone: text("telefone").notNull().unique(),
  cpf: text("cpf").unique(),
  criadoEm: timestamp("criado_em", { withTimezone: true }).notNull().defaultNow(),
});

/** Agendamentos (AGE). Intervalo [inicio, fim); fim = inicio + duração do barbeiro (R1). status: agendado|cancelado|concluido. */
export const agendamentos = pgTable("agendamentos", {
  id: serial("id").primaryKey(),
  clienteId: integer("cliente_id")
    .notNull()
    .references(() => clientes.id, { onDelete: "restrict" }),
  servicoId: integer("servico_id")
    .notNull()
    .references(() => servicos.id, { onDelete: "restrict" }),
  profissionalId: integer("profissional_id")
    .notNull()
    .references(() => profissionais.id, { onDelete: "restrict" }),
  inicio: timestamp("inicio", { withTimezone: true }).notNull(),
  fim: timestamp("fim", { withTimezone: true }).notNull(),
  status: text("status").notNull().default("agendado"),
  criadoEm: timestamp("criado_em", { withTimezone: true }).notNull().defaultNow(),
});

/** Vales que o barbeiro pega com 30% de desconto. tipo: produto_cliente | retirado_barbeiro. */
export const vales = pgTable("vales", {
  id: serial("id").primaryKey(),
  profissionalId: integer("profissional_id")
    .notNull()
    .references(() => profissionais.id, { onDelete: "restrict" }),
  tipo: text("tipo").notNull(),
  descricao: text("descricao").notNull(),
  precoCentavos: integer("preco_centavos").notNull(),
  valorCentavos: integer("valor_centavos").notNull(),
  criadoEm: timestamp("criado_em", { withTimezone: true }).notNull().defaultNow(),
});

/** Metas (semanais) por profissional. realizado = faturamento em [inicio, fim). */
export const metas = pgTable(
  "metas",
  {
    id: serial("id").primaryKey(),
    profissionalId: integer("profissional_id")
      .notNull()
      .references(() => profissionais.id, { onDelete: "cascade" }),
    inicio: timestamp("inicio", { withTimezone: true }).notNull(),
    fim: timestamp("fim", { withTimezone: true }).notNull(),
    alvoCentavos: integer("alvo_centavos").notNull(),
  },
  (t) => [uniqueIndex("uniq_meta_prof_inicio").on(t.profissionalId, t.inicio)],
);

/** Estoque: produto controlado (com saldo). */
export const produtosEstoque = pgTable("produtos_estoque", {
  id: serial("id").primaryKey(),
  nome: text("nome").notNull().unique(),
  unidade: text("unidade").notNull().default("un"),
  saldo: integer("saldo").notNull().default(0),
  ativo: boolean("ativo").notNull().default(true),
});

/** Movimento de estoque: entrada | saida. */
export const movimentosEstoque = pgTable("movimentos_estoque", {
  id: serial("id").primaryKey(),
  produtoEstoqueId: integer("produto_estoque_id")
    .notNull()
    .references(() => produtosEstoque.id, { onDelete: "cascade" }),
  tipo: text("tipo").notNull(),
  quantidade: integer("quantidade").notNull(),
  motivo: text("motivo"),
  criadoEm: timestamp("criado_em", { withTimezone: true }).notNull().defaultNow(),
});

/** Contagem diária (manha|noite) com divergência vs saldo esperado. */
export const contagensEstoque = pgTable("contagens_estoque", {
  id: serial("id").primaryKey(),
  produtoEstoqueId: integer("produto_estoque_id")
    .notNull()
    .references(() => produtosEstoque.id, { onDelete: "cascade" }),
  periodo: text("periodo").notNull(),
  contado: integer("contado").notNull(),
  saldoEsperado: integer("saldo_esperado").notNull(),
  divergencia: integer("divergencia").notNull(),
  criadoEm: timestamp("criado_em", { withTimezone: true }).notNull().defaultNow(),
});

/** Pedido de compra (dispara notificação ao dono). */
export const pedidosCompra = pgTable("pedidos_compra", {
  id: serial("id").primaryKey(),
  produtoEstoqueId: integer("produto_estoque_id")
    .notNull()
    .references(() => produtosEstoque.id, { onDelete: "cascade" }),
  quantidade: integer("quantidade").notNull(),
  criadoEm: timestamp("criado_em", { withTimezone: true }).notNull().defaultNow(),
});

/** Notificações ao dono (canal "chefe"): pedido de produto, anomalia de consumo, etc. */
export const notificacoes = pgTable("notificacoes", {
  id: serial("id").primaryKey(),
  evento: text("evento").notNull(),
  mensagem: text("mensagem").notNull(),
  lida: boolean("lida").notNull().default(false),
  criadoEm: timestamp("criado_em", { withTimezone: true }).notNull().defaultNow(),
});

export type Servico = typeof servicos.$inferSelect;
export type Produto = typeof produtos.$inferSelect;
export type Notificacao = typeof notificacoes.$inferSelect;
export type Vale = typeof vales.$inferSelect;
export type Meta = typeof metas.$inferSelect;
export type ProdutoEstoque = typeof produtosEstoque.$inferSelect;
export type MovimentoEstoque = typeof movimentosEstoque.$inferSelect;
export type Combo = typeof combos.$inferSelect;
export type Profissional = typeof profissionais.$inferSelect;
export type DuracaoBarbeiro = typeof duracoesBarbeiro.$inferSelect;
export type BloqueioAgenda = typeof bloqueiosAgenda.$inferSelect;
export type Tela = typeof telas.$inferSelect;
export type ItemPlaylist = typeof itensPlaylist.$inferSelect;
export type Usuario = typeof usuarios.$inferSelect;
export type Cliente = typeof clientes.$inferSelect;
export type Agendamento = typeof agendamentos.$inferSelect;
export type Comanda = typeof comandas.$inferSelect;
export type ComandaItem = typeof comandaItens.$inferSelect;
export type HorarioFuncionamento = typeof horariosFuncionamento.$inferSelect;
export type Feriado = typeof feriados.$inferSelect;
