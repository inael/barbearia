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
    /**
     * MTV: segundos SO deste item. Null = usa a velocidade da tela.
     *
     * Pedido do Rodrigo (audio 14/09): "eu poder botar a quantidade de segundos que
     * ele vai ficar na tela... se eu subir uma foto eu poder botar cinco segundos, e
     * em outra botar dez, e em outra um video de 25". Antes o tempo era um so para a
     * playlist inteira, entao foto e video ficavam o mesmo tanto.
     */
    segundos: integer("segundos"),
    /**
     * Giro da midia na exibicao, em graus (0, 90, 180, 270).
     *
     * A TV dele esta montada DE LADO, como painel. Os videos que ele mesmo edita ele
     * ja sobe girados; os do YouTube ele nao tem como girar. Por isso o giro e por
     * ITEM e nasce em 0: o que ja esta no ar continua igual.
     */
    rotacao: integer("rotacao").notNull().default(0),
  },
  (t) => [uniqueIndex("uniq_tela_ordem").on(t.telaId, t.ordem)],
);

/** Comanda do caixa. Aberta -> recebe itens; fechada = venda (fechadaEm + formaPagamento). */
export const comandas = pgTable("comandas", {
  id: serial("id").primaryKey(),
  clienteId: integer("cliente_id").references(() => clientes.id, { onDelete: "set null" }),
  /** CNA: comanda aberta a partir de um agendamento. Opcional — comanda de balcão não tem. */
  agendamentoId: integer("agendamento_id"),
  status: text("status").notNull().default("aberta"),
  formaPagamento: text("forma_pagamento"),
  criadoEm: timestamp("criado_em", { withTimezone: true }).notNull().defaultNow(),
  fechadaEm: timestamp("fechada_em", { withTimezone: true }),
});

/** Item de uma comanda. tipo: servico|combo|produto. slug do serviço p/ detectar dividido.
 * lancamento: normal|cortesia|servico_barbeiro (CRT — cortesia e serviço do barbeiro). */
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
  lancamento: text("lancamento").notNull().default("normal"),
  /** DSC/RF28: % de desconto de assinante aplicado no valor (0 = sem desconto). */
  descontoPct: integer("desconto_pct").notNull().default(0),
});

/** Planos de assinatura (Flex/Premium): desconto e dias contratados. */
export const planos = pgTable("planos", {
  id: serial("id").primaryKey(),
  nome: text("nome").notNull(),
  tipo: text("tipo").notNull(),
  precoCentavos: integer("preco_centavos").notNull(),
  descontoServicoPct: integer("desconto_servico_pct").notNull().default(0),
  descontoProdutoPct: integer("desconto_produto_pct").notNull().default(0),
  dias: text("dias").notNull().default(""),
  ativo: boolean("ativo").notNull().default(true),
});

/** Assinatura de um cliente. status: ativa|atraso|cancelada. */
export const assinaturas = pgTable("assinaturas", {
  id: serial("id").primaryKey(),
  clienteId: integer("cliente_id")
    .notNull()
    .references(() => clientes.id, { onDelete: "cascade" }),
  planoId: integer("plano_id")
    .notNull()
    .references(() => planos.id, { onDelete: "restrict" }),
  status: text("status").notNull().default("ativa"),
  criadoEm: timestamp("criado_em", { withTimezone: true }).notNull().defaultNow(),
});

/** Fila de espera de assinatura: cliente pede, dono aprova. status: aguardando|aprovado|rejeitado. */
export const filaAssinatura = pgTable("fila_assinatura", {
  id: serial("id").primaryKey(),
  clienteId: integer("cliente_id")
    .notNull()
    .references(() => clientes.id, { onDelete: "cascade" }),
  planoId: integer("plano_id")
    .notNull()
    .references(() => planos.id, { onDelete: "restrict" }),
  status: text("status").notNull().default("aguardando"),
  criadoEm: timestamp("criado_em", { withTimezone: true }).notNull().defaultNow(),
});

/** Cobrança (Asaas) de uma comanda. status: pendente|confirmado|falha. */
export const pagamentos = pgTable("pagamentos", {
  id: serial("id").primaryKey(),
  comandaId: integer("comanda_id")
    .notNull()
    .references(() => comandas.id, { onDelete: "cascade" }),
  asaasId: text("asaas_id").unique(),
  status: text("status").notNull().default("pendente"),
  valorCentavos: integer("valor_centavos").notNull(),
  criadoEm: timestamp("criado_em", { withTimezone: true }).notNull().defaultNow(),
});

/** Nota fiscal emitida no fechamento (rascunho local; emissão real na prefeitura é go-live). */
export const notasFiscais = pgTable("notas_fiscais", {
  id: serial("id").primaryKey(),
  comandaId: integer("comanda_id")
    .notNull()
    .unique()
    .references(() => comandas.id, { onDelete: "cascade" }),
  cpf: text("cpf").notNull(),
  valorCentavos: integer("valor_centavos").notNull(),
  /** NFA: retorno do Asaas. Null = nota so registrada aqui, ainda nao emitida. */
  asaasInvoiceId: text("asaas_invoice_id"),
  asaasStatus: text("asaas_status"),
  pdfUrl: text("pdf_url"),
  criadoEm: timestamp("criado_em", { withTimezone: true }).notNull().defaultNow(),
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
  /** LEA: quando o lembrete deste agendamento foi enviado. Null = ainda nao saiu.
   * E o que garante que rodar a tarefa duas vezes nao manda dois WhatsApp pro cliente. */
  lembreteEnviadoEm: timestamp("lembrete_enviado_em", { withTimezone: true }),
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

/** Metas (semanais) por profissional. tipoAlvo: valor (R$, realizado = faturamento)
 * ou quantidade (nº de atendimentos) em [inicio, fim). */
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
    tipoAlvo: text("tipo_alvo").notNull().default("valor"),
    alvoQuantidade: integer("alvo_quantidade"),
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

/** Gatilhos de lembrete ao cliente (minutos antes do agendamento). */
export const lembreteConfig = pgTable("lembrete_config", {
  id: serial("id").primaryKey(),
  minutosAntes: integer("minutos_antes").notNull().unique(),
});

/** Config de quais eventos notificam o dono (default: ativo). */
export const notificacaoConfig = pgTable("notificacao_config", {
  id: serial("id").primaryKey(),
  evento: text("evento").notNull().unique(),
  ativo: boolean("ativo").notNull().default(true),
});

export type Servico = typeof servicos.$inferSelect;
export type Produto = typeof produtos.$inferSelect;
export type Notificacao = typeof notificacoes.$inferSelect;
export type Vale = typeof vales.$inferSelect;
export type Meta = typeof metas.$inferSelect;
export type ProdutoEstoque = typeof produtosEstoque.$inferSelect;
export type MovimentoEstoque = typeof movimentosEstoque.$inferSelect;
export type Plano = typeof planos.$inferSelect;
export type Assinatura = typeof assinaturas.$inferSelect;
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

/** Mural de recados: o dono publica um aviso e TODA a equipe vê no topo do sistema
 * (ex.: "salário sai dia 5", "festa sexta", "meta nova do mês"). */
export const recados = pgTable("recados", {
  id: serial("id").primaryKey(),
  mensagem: text("mensagem").notNull(),
  /** info | alerta | comemoracao — muda só a cor/ícone da faixa. */
  tipo: text("tipo").notNull().default("info"),
  ativo: boolean("ativo").notNull().default(true),
  /** null = sem data de validade; senão some sozinho depois dessa data. */
  expiraEm: timestamp("expira_em", { withTimezone: true }),
  criadoEm: timestamp("criado_em", { withTimezone: true }).notNull().defaultNow(),
});

export type Recado = typeof recados.$inferSelect;

/** Credencial do WhatsApp (SimplesZap) editavel pela tela do dono, em vez de variavel
 * de ambiente: trocar token/instancia nao pode exigir rebuild no Coolify. Linha unica
 * (id = 1); o token fica em texto puro no banco DO CLIENTE e nunca volta pra tela. */
export const integracaoWhatsapp = pgTable("integracao_whatsapp", {
  id: serial("id").primaryKey(),
  baseUrl: text("base_url").notNull().default("https://back.simpleszap.com/api"),
  token: text("token"),
  instancia: text("instancia"),
  ativo: boolean("ativo").notNull().default(false),
  atualizadoEm: timestamp("atualizado_em", { withTimezone: true }).notNull().defaultNow(),
});

export type IntegracaoWhatsapp = typeof integracaoWhatsapp.$inferSelect;

/** NFA: credencial fiscal da barbearia. Linha unica, pelo mesmo motivo da IWA: cada
 * barbearia emite com o PROPRIO CNPJ, e trocar a chave nao pode exigir rebuild. */
export const configFiscal = pgTable("config_fiscal", {
  id: serial("id").primaryKey(),
  ambiente: text("ambiente").notNull().default("sandbox"),
  chave: text("chave"),
  codigoServico: text("codigo_servico"),
  descricaoServico: text("descricao_servico"),
  /** numeric em texto para nao perder centavo de aliquota no ida e volta. */
  issPercent: text("iss_percent").notNull().default("0"),
  ativo: boolean("ativo").notNull().default(false),
  atualizadoEm: timestamp("atualizado_em", { withTimezone: true }).notNull().defaultNow(),
});

export type ConfigFiscalRow = typeof configFiscal.$inferSelect;
