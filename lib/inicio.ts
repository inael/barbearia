// INI — a tela de entrada muda conforme quem entrou.
//
// Pedido do Inael (14/09): ao entrar, cada tipo de usuário tem de cair num painel útil
// para ELE, com números, gráfico e atalhos, em vez da mesma lista de links para todos.
//
// Por que aqui e não em cada página: as três telas leem os MESMOS dados por recortes
// diferentes, e o recorte é justamente o que protege o barbeiro de ver o faturamento
// da casa. Deixar isso espalhado em JSX é como um vazamento acontece.
//
// Nada de biblioteca de gráfico: os gráficos são SVG montado no servidor. São três
// barras simples; uma dependência de chart mandaria JavaScript para o navegador do
// Rodrigo e pesaria numa VPS de 1 vCPU, sem ganho nenhum de leitura.
import type { PostgresJsDatabase } from "drizzle-orm/postgres-js";
import { and, eq, lt } from "drizzle-orm";
import * as schema from "./db/schema";
import { faturamentoTotal, faturamentoPorProfissional, ultimaVisitaPorCliente, clientesEmChurn } from "./dashboard";
import { fechamentoDoCaixa, listarComandasAbertas, type FechamentoCaixa } from "./caixa";
import { listarAgendamentos, type AgendamentoView } from "./agendamento";
import { relatorioProfissional } from "./metas";
import { relatorioPote } from "./pote-gestao";
import { lerIntegracao } from "./integracao-whatsapp";

type DB = PostgresJsDatabase<typeof schema>;

/** Meia-noite LOCAL. Nunca montar dia com toISOString: em UTC a virada cai às 21h. */
export function inicioDoDia(d: Date): Date {
  const x = new Date(d);
  x.setHours(0, 0, 0, 0);
  return x;
}

export function somarDias(d: Date, dias: number): Date {
  const x = new Date(d);
  x.setDate(x.getDate() + dias);
  return x;
}

export interface PontoDia {
  dia: Date;
  centavos: number;
}

/**
 * Faturamento dia a dia, do mais antigo para o mais novo, incluindo HOJE.
 *
 * Dias sem venda entram com zero de propósito: um gráfico que pula o dia vazio mente
 * sobre o ritmo da semana.
 */
export async function serieDiaria(db: DB, dias: number, agora: Date = new Date()): Promise<PontoDia[]> {
  const hoje = inicioDoDia(agora);
  const pontos: PontoDia[] = [];
  for (let i = dias - 1; i >= 0; i--) {
    const dia = somarDias(hoje, -i);
    pontos.push({ dia, centavos: await faturamentoTotal(db, dia, somarDias(dia, 1)) });
  }
  return pontos;
}

export interface ResumoAgenda {
  total: number;
  atendidos: number;
  faltas: number;
  /** Ainda vão acontecer: nem atendidos, nem faltas, com início no futuro. */
  restantes: number;
  /** Os próximos da fila, para a tela mostrar nome e hora sem outra consulta. */
  proximos: AgendamentoView[];
}

const LIMITE_PROXIMOS = 5;

export async function resumoDaAgenda(
  db: DB,
  agora: Date = new Date(),
  profissionalId?: number,
): Promise<ResumoAgenda> {
  const hoje = inicioDoDia(agora);
  const todos = await listarAgendamentos(db, hoje, somarDias(hoje, 1), profissionalId);
  const atendidos = todos.filter((a) => a.status === "atendido").length;
  const faltas = todos.filter((a) => a.status === "faltou").length;
  const aVir = todos
    .filter((a) => a.status !== "atendido" && a.status !== "faltou" && a.inicio.getTime() >= agora.getTime())
    .sort((a, b) => a.inicio.getTime() - b.inicio.getTime());
  return {
    total: todos.length,
    atendidos,
    faltas,
    restantes: aVir.length,
    proximos: aVir.slice(0, LIMITE_PROXIMOS),
  };
}

/** Produtos que ZERARAM. Não invento "estoque mínimo": esse número é do Rodrigo. */
export async function produtosZerados(db: DB): Promise<{ nome: string; unidade: string }[]> {
  return db
    .select({ nome: schema.produtosEstoque.nome, unidade: schema.produtosEstoque.unidade })
    .from(schema.produtosEstoque)
    .where(lt(schema.produtosEstoque.saldo, 1));
}

export interface PainelDono {
  hojeCentavos: number;
  ontemCentavos: number;
  mesCentavos: number;
  serie: PontoDia[];
  porProfissionalHoje: { nome: string; centavos: number }[];
  agenda: ResumoAgenda;
  assinaturasAtendimentos: number;
  poteReais: number;
  /** Coisas que pedem ação do dono. Vazio = nada pendente, e a tela diz isso. */
  alertas: string[];
}

const DIAS_SERIE = 14;
const JANELA_CHURN = 30;

export async function painelDoDono(db: DB, agora: Date = new Date()): Promise<PainelDono> {
  const hoje = inicioDoDia(agora);
  const amanha = somarDias(hoje, 1);
  const ontem = somarDias(hoje, -1);
  const inicioMes = new Date(hoje.getFullYear(), hoje.getMonth(), 1);

  const [hojeCentavos, ontemCentavos, mesCentavos, serie, porProf, agenda, pote, zerados, visitas, wpp] =
    await Promise.all([
      faturamentoTotal(db, hoje, amanha),
      faturamentoTotal(db, ontem, hoje),
      faturamentoTotal(db, inicioMes, amanha),
      serieDiaria(db, DIAS_SERIE, agora),
      faturamentoPorProfissional(db, hoje, amanha),
      resumoDaAgenda(db, agora),
      relatorioPote(db, inicioMes, amanha),
      produtosZerados(db),
      ultimaVisitaPorCliente(db),
      lerIntegracao(db),
    ]);

  const sumidos = clientesEmChurn(visitas, agora, JANELA_CHURN);
  const alertas: string[] = [];
  // so o que pede acao: alerta que aparece sempre vira paisagem e ninguem le
  if (zerados.length > 0) {
    alertas.push(`${zerados.length} produto(s) zerado(s) no estoque: ${zerados.map((p) => p.nome).join(", ")}`);
  }
  if (!(wpp.ativo && wpp.token && wpp.instancia)) {
    alertas.push("WhatsApp desligado: nenhum lembrete de horário está saindo");
  }
  if (sumidos.length > 0) {
    alertas.push(`${sumidos.length} cliente(s) sem voltar há mais de ${JANELA_CHURN} dias`);
  }

  return {
    hojeCentavos,
    ontemCentavos,
    mesCentavos,
    serie,
    porProfissionalHoje: porProf.map((p) => ({ nome: p.nome, centavos: p.totalCentavos })),
    agenda,
    assinaturasAtendimentos: pote.totalAtendimentos,
    poteReais: pote.poteTotal,
    alertas,
  };
}

export interface PainelRecepcao {
  agenda: ResumoAgenda;
  caixa: FechamentoCaixa;
  comandasAbertas: number;
  produtosZerados: { nome: string; unidade: string }[];
}

export async function painelDaRecepcao(db: DB, agora: Date = new Date()): Promise<PainelRecepcao> {
  const hoje = inicioDoDia(agora);
  const [agenda, caixa, abertas, zerados] = await Promise.all([
    resumoDaAgenda(db, agora),
    fechamentoDoCaixa(db, hoje, somarDias(hoje, 1)),
    listarComandasAbertas(db),
    produtosZerados(db),
  ]);
  return { agenda, caixa, comandasAbertas: abertas.length, produtosZerados: zerados };
}

export interface PainelBarbeiro {
  agenda: ResumoAgenda;
  /** Números DELE no mês: faturamento, comissão, vales, meta. Nada da casa. */
  mes: Awaited<ReturnType<typeof relatorioProfissional>>;
  /** Fatia dele no pote do mês, em reais. Zero quando não atendeu assinante. */
  poteReais: number;
  assinantesAtendidos: number;
}

/**
 * Painel do barbeiro.
 *
 * Recebe o `profissionalId` de propósito, em vez de descobrir sozinho: quem chama é a
 * página, que já tem a sessão, e um id errado aqui mostraria o dinheiro de outro.
 */
export async function painelDoBarbeiro(
  db: DB,
  profissionalId: number,
  agora: Date = new Date(),
): Promise<PainelBarbeiro> {
  const hoje = inicioDoDia(agora);
  const amanha = somarDias(hoje, 1);
  const inicioMes = new Date(hoje.getFullYear(), hoje.getMonth(), 1);

  const [agenda, mes, pote] = await Promise.all([
    resumoDaAgenda(db, agora, profissionalId),
    relatorioProfissional(db, profissionalId, inicioMes, amanha),
    relatorioPote(db, inicioMes, amanha),
  ]);
  const minha = pote.linhas.find((l) => l.profissionalId === profissionalId);
  return {
    agenda,
    mes,
    poteReais: minha?.valor ?? 0,
    assinantesAtendidos: minha?.clientes ?? 0,
  };
}

/** Quantos agendamentos o barbeiro tem HOJE ainda por atender. Usado no aviso do topo. */
export async function proximosDoBarbeiro(
  db: DB,
  profissionalId: number,
  agora: Date = new Date(),
): Promise<AgendamentoView[]> {
  return (await resumoDaAgenda(db, agora, profissionalId)).proximos;
}

/** Existe profissional com esse id e ativo? Protege contra vínculo quebrado. */
export async function profissionalAtivo(db: DB, id: number): Promise<boolean> {
  const [row] = await db
    .select({ id: schema.profissionais.id })
    .from(schema.profissionais)
    .where(and(eq(schema.profissionais.id, id), eq(schema.profissionais.ativo, true)));
  return Boolean(row);
}

/** Alturas de barra (0 a 100) para o gráfico SVG. Série vazia ou toda zero = tudo zero. */
export function alturasRelativas(valores: number[]): number[] {
  const max = Math.max(0, ...valores);
  if (max <= 0) return valores.map(() => 0);
  return valores.map((v) => Math.round((Math.max(0, v) / max) * 100));
}

/** Variação percentual de `agora` sobre `antes`. Null quando não há base de comparação. */
export function variacao(agora: number, antes: number): number | null {
  if (antes <= 0) return null;
  return Math.round(((agora - antes) / antes) * 100);
}
