/**
 * SIM — Simulação de 1 MÊS de operação da Faith Barbearia no banco de DEV.
 * Objetivo (pedido do Inael, 2026-08-26): fingir uma operação real — barbeiros +
 * recepcionista atendendo por 4 semanas — pra validar os relatórios com dados vivos.
 *
 * Roda com:  npx tsx tools/simulacao-mes.ts
 * (usa o DATABASE_URL do .env.local — o banco de DEV, nunca produção)
 *
 * O script LIMPA os dados transacionais (comandas, agendamentos, vales, assinaturas,
 * estoque, metas, notificações, notas) e re-simula; catálogo/planos/usuários ficam.
 * Determinístico: RNG com semente fixa — rodar 2x dá o mesmo mês.
 */
import { readFileSync } from "node:fs";
import postgres from "postgres";
import { drizzle } from "drizzle-orm/postgres-js";
import { eq } from "drizzle-orm";
import * as schema from "../lib/db/schema";
import { seedCatalog } from "../lib/db/seed";
import { definirHorario } from "../lib/horarios";
import { criarCliente, completarCadastro } from "../lib/clientes";
import { criarProduto } from "../lib/produtos";
import { criarAssinatura, definirStatusAssinatura, listarPlanos } from "../lib/assinaturas";
import { criarAgendamento } from "../lib/agendamento";
import {
  criarComanda,
  adicionarServico,
  adicionarCombo,
  adicionarProduto,
  fecharComanda,
  totalVendas,
  comissaoDoPeriodo,
  comissaoRecepcaoDoPeriodo,
  cortesiasDoPeriodo,
  totalComanda,
  listarItens,
} from "../lib/caixa";
import { registrarVale } from "../lib/vales";
import { definirMeta, definirMetaQuantidade, relatorioProfissional, relatorioRecepcao, semanaAtual, atendimentosDoPeriodo } from "../lib/metas";
import { cadastrarProdutoEstoque, registrarMovimento, registrarContagem, registrarPedidoCompra } from "../lib/estoque";
import { faturamentoTotal, faturamentoPorProfissional, rankingItens, novosClientes, ultimaVisitaPorCliente, clientesEmChurn } from "../lib/dashboard";
import { relatorioPote } from "../lib/pote-gestao";
import { emitirNota } from "../lib/nf";

// ---------- infra ----------
function envUrl(): string {
  if (process.env.DATABASE_URL) return process.env.DATABASE_URL;
  const env = readFileSync(new URL("../.env.local", import.meta.url), "utf8");
  const m = env.match(/^DATABASE_URL=(.+)$/m);
  if (!m) throw new Error("DATABASE_URL não encontrado");
  return m[1].trim();
}
const url = envUrl();
if (/179\.198|sslip|prod/i.test(url)) throw new Error("recusando: isso parece PRODUÇÃO");
const client = postgres(url, { prepare: false });
const db = drizzle(client, { schema });

// RNG determinístico (mulberry32)
function mulberry32(a: number) {
  return function () {
    a |= 0; a = (a + 0x6d2b79f5) | 0;
    let t = Math.imul(a ^ (a >>> 15), 1 | a);
    t = (t + Math.imul(t ^ (t >>> 7), 61 | t)) ^ t;
    return ((t ^ (t >>> 14)) >>> 0) / 4294967296;
  };
}
const rng = mulberry32(20260826);
const pick = <T,>(arr: T[]): T => arr[Math.floor(rng() * arr.length)];
const chance = (p: number) => rng() < p;

const brl = (c: number) => (c / 100).toLocaleString("pt-BR", { style: "currency", currency: "BRL" });
const reais = (v: number) => v.toLocaleString("pt-BR", { style: "currency", currency: "BRL" });

async function main() {
  console.log("== SIM: limpando dados transacionais do banco de DEV ==");
  await db.delete(schema.notasFiscais);
  await db.delete(schema.pagamentos);
  await db.delete(schema.comandas); // comanda_itens via cascade
  await db.delete(schema.agendamentos);
  await db.delete(schema.vales);
  await db.delete(schema.metas);
  await db.delete(schema.contagensEstoque);
  await db.delete(schema.movimentosEstoque);
  await db.delete(schema.pedidosCompra);
  await db.delete(schema.produtosEstoque);
  await db.delete(schema.notificacoes);
  await db.delete(schema.filaAssinatura);
  await db.delete(schema.assinaturas);
  await db.delete(schema.produtos);
  await db.delete(schema.clientes);
  await seedCatalog(db); // catálogo canônico + planos (se faltarem)

  // horários do Rodrigo: seg-sex 8-20, sáb 8-18, dom 9-14
  for (const d of [1, 2, 3, 4, 5]) await definirHorario(db, d, 8 * 60, 20 * 60, false);
  await definirHorario(db, 6, 8 * 60, 18 * 60, false);
  await definirHorario(db, 0, 9 * 60, 14 * 60, false);

  const profs = await db.select().from(schema.profissionais);
  const barbeiros = profs.filter((p) => p.papel === "barbeiro" || p.papel === "dono");
  const recepcao = profs.find((p) => p.papel === "recepcionista")!;
  const servicos = await db.select().from(schema.servicos);
  const combos = await db.select().from(schema.combos);
  const porSlug = (s: string) => servicos.find((x) => x.slug === s)!;

  console.log("== SIM: clientes, assinaturas, produtos e estoque ==");
  const NOMES = [
    "Lucas Almeida", "Marcos Paulo", "Felipe Souza", "Thiago Nunes", "Bruno Castro",
    "Rafael Lima", "Diego Martins", "Gustavo Rocha", "André Pires", "Caio Ferreira",
    "Vinícius Ramos", "Eduardo Melo", "Renan Cardoso", "Igor Teixeira", "Otávio Reis",
    "Samuel Barros", "Henrique Dias", "Leandro Farias", "Matheus Prado", "Fábio Moura",
    "Danilo Costa", "Wesley Braga", "Pablo Duarte", "Sérgio Antunes",
  ];
  const clientesIds: number[] = [];
  for (let i = 0; i < NOMES.length; i++) {
    const id = await criarCliente(db, { nome: NOMES[i], telefone: `619940${String(10000 + i).slice(-5)}` });
    clientesIds.push(id);
  }
  // CPFs válidos p/ nota fiscal (2 clientes)
  await completarCadastro(db, clientesIds[0], "52998224725");
  await completarCadastro(db, clientesIds[1], "11144477735");

  const planos = await listarPlanos(db);
  const premium = planos.find((p) => p.tipo === "premium")!;
  const flex = planos.find((p) => p.tipo === "flex")!;
  // 5 assinantes: 3 premium, 2 flex; 1 premium entra em atraso no fim do mês
  const assinantes = clientesIds.slice(0, 5);
  const assIds: number[] = [];
  for (const [i, cid] of assinantes.entries()) {
    assIds.push(await criarAssinatura(db, cid, i < 3 ? premium.id : flex.id));
  }
  await definirStatusAssinatura(db, assIds[2], "atraso"); // RF26: atraso bloqueia agenda

  const balcao = [
    { nome: "Pomada modeladora", preco: 3500 },
    { nome: "Óleo de barba", preco: 4500 },
    { nome: "Shampoo antiqueda", preco: 4000 },
    { nome: "Cerveja long neck", preco: 1200 },
  ];
  const produtosIds: number[] = [];
  for (const p of balcao) produtosIds.push(await criarProduto(db, { nome: p.nome, precoCentavos: p.preco }));
  const estq: number[] = [];
  for (const p of balcao) estq.push(await cadastrarProdutoEstoque(db, p.nome, "un", 30));

  console.log("== SIM: 4 semanas de atendimento ==");
  const hoje = new Date();
  hoje.setHours(0, 0, 0, 0);
  const diasSimulados = 28;
  let totalEsperadoCentavos = 0;
  let qtdComandas = 0;
  let qtdCortesias = 0;
  let qtdSvcBarbeiro = 0;
  let notasEmitidas = 0;

  const AVULSOS = ["corte", "barba", "corte_barba", "sobrancelha", "pezinho", "limpeza_pele", "hidratacao_barba", "progressiva", "limpeza_detox", "acidificacao"];
  for (let d = diasSimulados - 1; d >= 0; d--) {
    const dia = new Date(hoje.getTime() - d * 24 * 60 * 60 * 1000);
    const dow = dia.getDay();
    const abre = dow === 0 ? 9 : 8;
    const fecha = dow === 0 ? 14 : dow === 6 ? 18 : 20;
    const atendimentosDia = dow === 0 ? 3 + Math.floor(rng() * 3) : 7 + Math.floor(rng() * 6);

    for (let a = 0; a < atendimentosDia; a++) {
      const hora = abre + Math.floor(rng() * (fecha - abre - 1));
      const quando = new Date(dia.getTime() + hora * 60 * 60 * 1000 + Math.floor(rng() * 2) * 30 * 60 * 1000);
      const clienteId = pick(clientesIds);
      const barbeiro = pick(barbeiros);

      // parte vira agendamento antes (o resto é walk-in)
      if (chance(0.5)) {
        try {
          await criarAgendamento(db, { clienteId, servicoId: porSlug(pick(AVULSOS)).id, profissionalId: barbeiro.id, inicio: quando });
        } catch { /* conflito/atraso: segue como walk-in */ }
      }

      const comanda = await criarComanda(db, chance(0.85) ? clienteId : null);
      const lanc = qtdCortesias < 4 && chance(0.03) ? "cortesia" : qtdSvcBarbeiro < 3 && chance(0.02) ? "servico_barbeiro" : "normal";
      if (lanc === "cortesia") qtdCortesias++;
      if (lanc === "servico_barbeiro") qtdSvcBarbeiro++;

      if (chance(0.12)) {
        await adicionarCombo(db, comanda, pick(combos).id, barbeiro.id, lanc === "servico_barbeiro" ? "servico_barbeiro" : lanc, quando);
      } else {
        await adicionarServico(db, comanda, porSlug(pick(AVULSOS)).id, barbeiro.id, lanc, quando);
        if (chance(0.3)) await adicionarServico(db, comanda, porSlug(pick(["sobrancelha", "pezinho"])).id, barbeiro.id, "normal", quando);
      }
      // venda de produto: 60% pela recepção, 40% pelo barbeiro
      if (chance(0.3)) {
        const idx = Math.floor(rng() * produtosIds.length);
        await adicionarProduto(db, comanda, produtosIds[idx], chance(0.6) ? recepcao.id : barbeiro.id, "normal", quando);
        try { await registrarMovimento(db, estq[idx], "saida", 1, "venda"); } catch { /* sem saldo */ }
      }
      // hidratação de cabelo feita pela recepção (1-2 por dia útil)
      if (a < 2 && dow !== 0 && chance(0.6)) {
        await adicionarServico(db, comanda, porSlug("hidratacao_cabelo").id, recepcao.id, "normal", quando);
      }

      const itens = await listarItens(db, comanda);
      totalEsperadoCentavos += totalComanda(itens);
      await fecharComanda(db, comanda, pick(["dinheiro", "pix", "cartao"]), quando);
      qtdComandas++;

      // nota fiscal automática pros clientes com CPF
      try { await emitirNota(db, comanda); notasEmitidas++; } catch { /* sem CPF / sem item faturável */ }
    }

    // contagem de estoque (manhã) em ~metade dos dias
    if (chance(0.5)) {
      const idx = Math.floor(rng() * estq.length);
      const [p] = await db.select().from(schema.produtosEstoque).where(eq(schema.produtosEstoque.id, estq[idx]));
      if (p) await registrarContagem(db, p.id, "manha", Math.max(0, p.saldo - (chance(0.2) ? 1 : 0)));
    }
  }

  // vales do mês (produtos retirados) — datas espalhadas
  for (let i = 0; i < 6; i++) {
    const b = pick(barbeiros);
    const p = pick(balcao);
    const quando = new Date(hoje.getTime() - Math.floor(rng() * diasSimulados) * 24 * 60 * 60 * 1000 + 15 * 60 * 60 * 1000);
    const id = await registrarVale(db, {
      profissionalId: b.id,
      tipo: chance(0.5) ? "retirado_barbeiro" : "produto_cliente",
      descricao: p.nome,
      precoCentavos: p.preco,
    });
    await db.update(schema.vales).set({ criadoEm: quando }).where(eq(schema.vales.id, id));
  }

  // pedido de compra (notifica o dono) + metas da semana corrente
  await registrarPedidoCompra(db, estq[0], 12);
  const { inicio, fim } = semanaAtual(new Date());
  await definirMeta(db, barbeiros[0].id, inicio, fim, 250000); // Rodrigo: R$2.500
  await definirMeta(db, barbeiros[1].id, inicio, fim, 200000); // Pedro: R$2.000
  await definirMetaQuantidade(db, barbeiros[2].id, inicio, fim, 25); // Joao: 25 atendimentos
  await definirMeta(db, recepcao.id, inicio, fim, 40000); // Recepção: R$400 em produtos

  // ---------- relatório ----------
  console.log("== SIM: conferindo os relatórios ==");
  const de = new Date(hoje.getTime() - (diasSimulados - 1) * 24 * 60 * 60 * 1000);
  const ate = new Date(hoje.getTime() + 24 * 60 * 60 * 1000);

  const fat = await faturamentoTotal(db, de, ate);
  const fatVendas = await totalVendas(db, de, ate);
  if (fat !== fatVendas) throw new Error(`INCONSISTÊNCIA: painel ${fat} != caixa ${fatVendas}`);
  if (fat !== totalEsperadoCentavos) throw new Error(`INCONSISTÊNCIA: esperado ${totalEsperadoCentavos}, painel ${fat}`);

  const porProf = await faturamentoPorProfissional(db, de, ate);
  const somaProf = porProf.reduce((s, p) => s + p.totalCentavos, 0);
  if (somaProf !== fat) throw new Error(`INCONSISTÊNCIA: soma por profissional ${somaProf} != total ${fat}`);

  const ranking = await rankingItens(db, de, ate);
  const cortes = await cortesiasDoPeriodo(db, de, ate);
  const novos = await novosClientes(db, de, ate);
  const churn = clientesEmChurn(await ultimaVisitaPorCliente(db), new Date(), 30);
  const pote = await relatorioPote(db, de, ate);

  const linhas: string[] = [];
  const p = (s: string) => { console.log(s); linhas.push(s); };

  p(`# Simulação de 1 mês — Faith Barbearia (gerada em ${new Date().toLocaleString("pt-BR")})`);
  p("");
  p(`Período simulado: ${de.toLocaleDateString("pt-BR")} a ${hoje.toLocaleDateString("pt-BR")} (${diasSimulados} dias, semente fixa 20260826).`);
  p(`Elenco: ${barbeiros.map((b) => b.nome).join(", ")} (cortam) + ${recepcao.nome} (recepção). ${NOMES.length} clientes, 5 assinantes (1 em atraso).`);
  p("");
  p("## Números do mês");
  p(`- Comandas fechadas: **${qtdComandas}** (cortesias: ${qtdCortesias}, consumo de barbeiro: ${qtdSvcBarbeiro}, notas emitidas: ${notasEmitidas})`);
  p(`- Faturamento (painel = caixa = esperado): **${brl(fat)}**`);
  p(`- Custo de cortesias: ${brl(cortes.valorCentavos)} concedidos · ${brl(cortes.comissaoCentavos)} de comissão a pagar`);
  p(`- Novos clientes no período: ${novos} · Clientes em churn (30d+): ${churn.length}`);
  p("");
  p("## Faturamento por profissional");
  for (const f of porProf) p(`- ${f.nome}: ${brl(f.totalCentavos)}`);
  p("");
  p("## Comissões do mês (motor real)");
  for (const b of barbeiros) {
    const c = await comissaoDoPeriodo(db, b.id, de, ate);
    const at = await atendimentosDoPeriodo(db, b.id, de, ate);
    p(`- ${b.nome}: **${reais(c.comissaoTotal)}** (avulsos ${reais(c.avulsos)} · combos ${reais(c.combos)} · divididos ${reais(c.divididos)} · produtos ${reais(c.produtos)} · cortesias ${reais(c.comissaoCortesias)}) — ${at} atendimentos`);
  }
  const rec = await comissaoRecepcaoDoPeriodo(db, recepcao.id, de, ate);
  p(`- ${recepcao.nome} (recepção): **${reais(rec.comissaoTotal)}** (produtos ${reais(rec.produtos)} · ${rec.qtdHidratacoes} hidratações · 20% de ${reais(rec.divididosCasa)} em divididos)`);
  p("");
  p("## Pote das assinaturas");
  p(`- Receita de assinaturas ativas: ${reais(pote.receita)} · Pote (40%): **${reais(pote.poteTotal)}**`);
  for (const l of pote.linhas) p(`- ${l.nome}: ${l.pontos} pts → ${reais(l.valor)}`);
  p("");
  p("## Ranking (top 5)");
  for (const r of ranking.slice(0, 5)) p(`- ${r.descricao} (${r.qtd}x): ${brl(r.totalCentavos)}`);
  p("");
  p("## Metas da semana corrente");
  for (const b of barbeiros) {
    const rel = await relatorioProfissional(db, b.id, inicio, fim);
    const alvo = rel.tipoAlvo === "quantidade" ? `${rel.alvoQuantidade} atendimentos` : rel.alvoCentavos != null ? brl(rel.alvoCentavos) : "—";
    p(`- ${b.nome}: fat ${brl(rel.faturamentoCentavos)} · ${rel.atendimentos} atendimentos · meta ${alvo} → ${rel.batido == null ? "sem meta" : rel.batido ? "BATIDA" : "não batida"}`);
  }
  const relRec = await relatorioRecepcao(db, recepcao.id, inicio, fim);
  p(`- ${recepcao.nome}: produtos ${brl(relRec.produtosCentavos)} · ${relRec.qtdHidratacoes} hidratações · meta ${relRec.alvoCentavos != null ? brl(relRec.alvoCentavos) : "—"} → ${relRec.batido == null ? "sem meta" : relRec.batido ? "BATIDA" : "não batida"}`);
  p("");
  p("## Onde ver no app (banco de dev, http://localhost:3001)");
  p("- Painel do dono (filtro 30 dias) · Metas & relatórios · Pote · Vales · Estoque · Caixa (badges de cortesia/assinante) · Agenda (grade do dia).");
  p("");
  p("Validações automáticas: painel == caixa == soma esperada; soma por profissional == total. ✔");

  const { writeFileSync } = await import("node:fs");
  writeFileSync(new URL("../docs/context/SIMULACAO-2026-08-26.md", import.meta.url), linhas.join("\n") + "\n");
  console.log("\nRelatório salvo em docs/context/SIMULACAO-2026-08-26.md");
  await client.end({ timeout: 5 });
}

main().catch(async (e) => {
  console.error("SIMULAÇÃO FALHOU:", e);
  await client.end({ timeout: 5 });
  process.exit(1);
});
