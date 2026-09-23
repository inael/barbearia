import type { PostgresJsDatabase } from "drizzle-orm/postgres-js";
import { and, asc, desc, eq, gte, lt } from "drizzle-orm";
import * as schema from "./db/schema";

type DB = PostgresJsDatabase<typeof schema>;

/**
 * MEN — mensalidade do assinante.
 *
 * O Rodrigo recebe no balcão, em dinheiro ou PIX. Até aqui o sistema só tinha uma marca
 * manual (`ativa|atraso|cancelada`) sem mês, data, valor nem histórico: para dizer que o
 * cliente pagou, alguém trocava um seletor, e no mês seguinte ele continuava "ativa".
 *
 * Aqui a linha nasce NO PAGAMENTO. Não existe gerador mensal de cobrança: "em aberto" é
 * a ausência de linha para aquela competência. Uma coisa a menos para dessincronizar.
 */

/** Formas que aparecem no balcão. Cartão entra porque ele tem maquininha. */
export const FORMAS = ["dinheiro", "pix", "cartao", "outro"] as const;
export type FormaPagamento = (typeof FORMAS)[number];

const MESES = ["jan", "fev", "mar", "abr", "mai", "jun", "jul", "ago", "set", "out", "nov", "dez"];

/**
 * Competência (`YYYY-MM`) de uma data, montada com as partes LOCAIS.
 *
 * Nunca por `toISOString()`: em `America/Sao_Paulo` o dia 1º às 00h30 vira o mês anterior
 * em UTC, e o pagamento de outubro entraria como setembro.
 */
export function competenciaDe(data: Date): string {
  return `${data.getFullYear()}-${String(data.getMonth() + 1).padStart(2, "0")}`;
}

export function competenciaValida(c: string): boolean {
  return /^\d{4}-(0[1-9]|1[0-2])$/.test(String(c ?? ""));
}

/** "2026-09" vira "set/2026", que é como ele fala. */
export function rotuloCompetencia(c: string): string {
  if (!competenciaValida(c)) return c;
  const [ano, mes] = c.split("-");
  return `${MESES[Number(mes) - 1]}/${ano}`;
}

/** Competência deslocada em N meses (N pode ser negativo). */
export function competenciaSomando(c: string, meses: number): string {
  const [ano, mes] = c.split("-").map(Number);
  const total = ano * 12 + (mes - 1) + meses;
  return `${Math.floor(total / 12)}-${String((total % 12) + 1).padStart(2, "0")}`;
}

/** Quantos meses de `de` até `ate`, inclusive nas duas pontas. Negativo vira 0. */
export function mesesNoIntervalo(de: string, ate: string): number {
  const [a1, m1] = de.split("-").map(Number);
  const [a2, m2] = ate.split("-").map(Number);
  return Math.max(0, (a2 * 12 + m2) - (a1 * 12 + m1) + 1);
}

export interface DadosPagamento {
  assinaturaId: number;
  competencia: string;
  valorCentavos: number;
  forma?: FormaPagamento;
  observacao?: string | null;
  pagoEm?: Date;
}

/**
 * Registra o recebimento de um mês. Devolve o id da linha.
 *
 * Receber o mesmo mês duas vezes é engano comum de balcão (ele anota, a recepção anota
 * de novo), então o erro diz o que já existe em vez de falar em índice único.
 */
export async function registrarPagamento(db: DB, d: DadosPagamento): Promise<number> {
  if (!competenciaValida(d.competencia)) throw new Error("mês inválido (use o seletor de mês)");
  if (!Number.isInteger(d.valorCentavos) || d.valorCentavos <= 0) throw new Error("valor inválido");
  const forma = d.forma ?? "dinheiro";
  if (!(FORMAS as readonly string[]).includes(forma)) throw new Error("forma de pagamento inválida");

  const [ja] = await db
    .select()
    .from(schema.mensalidades)
    .where(
      and(
        eq(schema.mensalidades.assinaturaId, d.assinaturaId),
        eq(schema.mensalidades.competencia, d.competencia),
      ),
    );
  if (ja) {
    const valor = (ja.valorCentavos / 100).toFixed(2).replace(".", ",");
    const dia = ja.pagoEm.toLocaleDateString("pt-BR");
    throw new Error(`${rotuloCompetencia(d.competencia)} já está recebido: R$ ${valor} em ${dia}.`);
  }

  const [row] = await db
    .insert(schema.mensalidades)
    .values({
      assinaturaId: d.assinaturaId,
      competencia: d.competencia,
      valorCentavos: d.valorCentavos,
      forma,
      observacao: d.observacao?.trim() || null,
      ...(d.pagoEm ? { pagoEm: d.pagoEm } : {}),
    })
    .returning({ id: schema.mensalidades.id });
  return row.id;
}

/** Desfaz um recebimento lançado errado (valor trocado, cliente trocado). */
export async function estornarPagamento(db: DB, id: number): Promise<void> {
  await db.delete(schema.mensalidades).where(eq(schema.mensalidades.id, id));
}

/** Histórico do assinante, do mês mais recente para o mais antigo. */
export async function historicoDaAssinatura(
  db: DB,
  assinaturaId: number,
  limite = 12,
): Promise<schema.Mensalidade[]> {
  return db
    .select()
    .from(schema.mensalidades)
    .where(eq(schema.mensalidades.assinaturaId, assinaturaId))
    .orderBy(desc(schema.mensalidades.competencia))
    .limit(limite);
}

export interface SituacaoAssinante {
  assinaturaId: number;
  clienteId: number;
  clienteNome: string;
  planoNome: string;
  precoCentavos: number;
  status: string;
  /** Última competência recebida, ou null se nunca recebeu nada pelo sistema. */
  pagoAte: string | null;
  /** O mês corrente já foi recebido? */
  mesAtualPago: boolean;
  /** Meses sem recebimento, contados do primeiro mês registrado até o atual. */
  mesesEmAberto: number;
}

/**
 * Situação de cada assinatura ATIVA no mês de `hoje`.
 *
 * A contagem de meses em aberto começa no PRIMEIRO mês registrado daquele assinante, não
 * na data em que ele assinou. Assinante antigo, de antes do sistema controlar isso, não
 * pode nascer devendo dois anos: seria dívida inventada. Quem nunca teve recebimento
 * registrado aparece devendo só o mês corrente.
 */
export async function situacaoDosAssinantes(db: DB, hoje: Date = new Date()): Promise<SituacaoAssinante[]> {
  const atual = competenciaDe(hoje);

  const assinaturas = await db
    .select({
      assinaturaId: schema.assinaturas.id,
      clienteId: schema.assinaturas.clienteId,
      clienteNome: schema.clientes.nome,
      planoNome: schema.planos.nome,
      precoCentavos: schema.planos.precoCentavos,
      status: schema.assinaturas.status,
    })
    .from(schema.assinaturas)
    .innerJoin(schema.clientes, eq(schema.clientes.id, schema.assinaturas.clienteId))
    .innerJoin(schema.planos, eq(schema.planos.id, schema.assinaturas.planoId))
    .where(eq(schema.assinaturas.status, "ativa"))
    .orderBy(asc(schema.clientes.nome));

  const pagos = await db
    .select({
      assinaturaId: schema.mensalidades.assinaturaId,
      competencia: schema.mensalidades.competencia,
    })
    .from(schema.mensalidades);

  const porAssinatura = new Map<number, string[]>();
  for (const p of pagos) {
    const lista = porAssinatura.get(p.assinaturaId) ?? [];
    lista.push(p.competencia);
    porAssinatura.set(p.assinaturaId, lista);
  }

  return assinaturas.map((a) => {
    const meses = (porAssinatura.get(a.assinaturaId) ?? []).slice().sort();
    // mês futuro (adiantou) não conta como "pago até", senão ele some da cobrança
    const ateAgora = meses.filter((m) => m <= atual);
    const primeiro = ateAgora[0] ?? atual;
    const esperados = mesesNoIntervalo(primeiro, atual);
    return {
      ...a,
      pagoAte: meses.length ? meses[meses.length - 1] : null,
      mesAtualPago: meses.includes(atual),
      mesesEmAberto: Math.max(0, esperados - ateAgora.length),
    };
  });
}

/** Quanto de mensalidade ENTROU no período [de, ate), em centavos. */
export async function recebidoNoPeriodo(db: DB, de: Date, ate: Date): Promise<number> {
  const rows = await db
    .select({ valor: schema.mensalidades.valorCentavos })
    .from(schema.mensalidades)
    .where(and(gte(schema.mensalidades.pagoEm, de), lt(schema.mensalidades.pagoEm, ate)));
  return rows.reduce((s, r) => s + r.valor, 0);
}
