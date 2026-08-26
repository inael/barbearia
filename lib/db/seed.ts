import type { PostgresJsDatabase } from "drizzle-orm/postgres-js";
import * as schema from "./schema";
import { servicos, combos, profissionais } from "./schema";

// Catalogo real da Faith Barbearia (docs/produto/RESPOSTAS.md).
export const SERVICOS = [
  { slug: "corte", nome: "Corte", precoCentavos: 6000, duracaoMin: 40, entraPote: true, pontosPote: 30 },
  { slug: "barba", nome: "Barba", precoCentavos: 5000, duracaoMin: 30, entraPote: true, pontosPote: 30 },
  { slug: "corte_barba", nome: "Corte + barba", precoCentavos: 10000, duracaoMin: 60, entraPote: false, pontosPote: 0 },
  { slug: "sobrancelha", nome: "Sobrancelha", precoCentavos: 2500, duracaoMin: 10, entraPote: true, pontosPote: 15 },
  { slug: "pezinho", nome: "Pezinho", precoCentavos: 2000, duracaoMin: 10, entraPote: true, pontosPote: 15 },
  { slug: "depilacao_ouvido", nome: "Depilacao de ouvido", precoCentavos: 3000, duracaoMin: 15, entraPote: false, pontosPote: 0 },
  { slug: "depilacao_nariz", nome: "Depilacao de nariz", precoCentavos: 3000, duracaoMin: 15, entraPote: false, pontosPote: 0 },
  { slug: "limpeza_pele", nome: "Limpeza de pele", precoCentavos: 5000, duracaoMin: 25, entraPote: false, pontosPote: 0 },
  { slug: "hidratacao_barba", nome: "Hidratacao de barba", precoCentavos: 3000, duracaoMin: 15, entraPote: false, pontosPote: 0 },
  { slug: "hidratacao_cabelo", nome: "Hidratacao de cabelo", precoCentavos: 4500, duracaoMin: 15, entraPote: false, pontosPote: 0 },
  { slug: "acidificacao", nome: "Acidificacao", precoCentavos: 5000, duracaoMin: 25, entraPote: false, pontosPote: 0 },
  { slug: "limpeza_detox", nome: "Limpeza Detox", precoCentavos: 5000, duracaoMin: 25, entraPote: false, pontosPote: 0 },
  { slug: "realinhamento_capilar", nome: "Realinhamento capilar", precoCentavos: 10000, duracaoMin: 40, entraPote: false, pontosPote: 0 },
  { slug: "selagem", nome: "Selagem", precoCentavos: 12000, duracaoMin: 40, entraPote: false, pontosPote: 0 },
  { slug: "progressiva", nome: "Progressiva", precoCentavos: 15000, duracaoMin: 40, entraPote: false, pontosPote: 0 },
  { slug: "relaxamento", nome: "Relaxamento (alisante)", precoCentavos: 5000, duracaoMin: 10, entraPote: false, pontosPote: 0 },
  { slug: "cone_hindu", nome: "Cone hindu", precoCentavos: 5000, duracaoMin: 15, entraPote: false, pontosPote: 0 },
  { slug: "tonalizacao_barba", nome: "Tonalizacao barba", precoCentavos: 5000, duracaoMin: 30, entraPote: false, pontosPote: 0 },
  { slug: "tonalizacao_cabelo", nome: "Tonalizacao cabelo", precoCentavos: 5000, duracaoMin: 30, entraPote: false, pontosPote: 0 },
];

export const COMBOS = [
  { slug: "camuflagem", nome: "Camuflagem", precoCentavos: 17000, duracaoMin: 60, inclui: "Corte+barba, tonalizacao barba, tonalizacao corte" },
  { slug: "rilex", nome: "Rilex", precoCentavos: 15000, duracaoMin: 60, inclui: "Hidratacao corte+barba, limpeza de pele, cone hindu" },
  { slug: "ouro", nome: "Ouro", precoCentavos: 14000, duracaoMin: 60, inclui: "Corte, sobrancelha, hidratacao, limpeza de pele" },
  { slug: "reconstrucao", nome: "Reconstrucao", precoCentavos: 13000, duracaoMin: 60, inclui: "Corte, acidificacao, reconstrucao detox" },
  { slug: "diamante", nome: "Diamante", precoCentavos: 20000, duracaoMin: 80, inclui: "Corte+barba, sobrancelha, limpeza de pele, hidratacao (ambas)" },
  { slug: "faith", nome: "Faith", precoCentavos: 28000, duracaoMin: 80, inclui: "Corte+barba, sobrancelha, limpeza de pele, (progressiva/selagem/realinhamento/tonalizacao)" },
];

export const PROFISSIONAIS = [
  { nome: "Rodrigo", papel: "dono" as const },
  { nome: "Pedro", papel: "barbeiro" as const },
  { nome: "Joao", papel: "barbeiro" as const },
  { nome: "Recepcao", papel: "recepcionista" as const },
];

// Planos que o Rodrigo definiu (docs/produto/RESPOSTAS.md, perguntas 10 e 28):
// Flex vale ter-qui com 10%/5% de desconto extra; Premium vale todos os dias com 20%/10%.
export const PLANOS = [
  { nome: "Flex — Corte/barba/pezinho/sobrancelha", tipo: "flex", precoCentavos: 22000, descontoServicoPct: 10, descontoProdutoPct: 5, dias: "ter-qui" },
  { nome: "Flex — Corte/sobrancelha", tipo: "flex", precoCentavos: 12000, descontoServicoPct: 10, descontoProdutoPct: 5, dias: "ter-qui" },
  { nome: "Flex — Barba/pezinho", tipo: "flex", precoCentavos: 14000, descontoServicoPct: 10, descontoProdutoPct: 5, dias: "ter-qui" },
  { nome: "Premium — Corte/barba/pezinho/sobrancelha", tipo: "premium", precoCentavos: 25000, descontoServicoPct: 20, descontoProdutoPct: 10, dias: "todos" },
  { nome: "Premium — Corte/sobrancelha", tipo: "premium", precoCentavos: 15000, descontoServicoPct: 20, descontoProdutoPct: 10, dias: "todos" },
  { nome: "Premium — Barba/pezinho", tipo: "premium", precoCentavos: 17000, descontoServicoPct: 20, descontoProdutoPct: 10, dias: "todos" },
];

/** Semeia os planos do Rodrigo só quando a tabela está VAZIA (assinaturas referenciam
 * planos, então não dá pra apagar/reinserir; e o dono pode editar os dele). Idempotente. */
export async function seedPlanos(db: PostgresJsDatabase<typeof schema>): Promise<void> {
  const existentes = await db.select({ id: schema.planos.id }).from(schema.planos).limit(1);
  if (existentes.length === 0) await db.insert(schema.planos).values(PLANOS);
}

/**
 * Semeia o catalogo de forma determinística e idempotente:
 * limpa as tabelas e reinsere o catalogo canonico. Rodar 2x resulta no
 * mesmo estado. Função pura de efeito (recebe o db) para ser testável.
 */
export async function seedCatalog(db: PostgresJsDatabase<typeof schema>): Promise<void> {
  await db.delete(servicos);
  await db.delete(combos);
  await db.delete(profissionais);
  await db.insert(servicos).values(SERVICOS);
  await db.insert(combos).values(COMBOS);
  await db.insert(profissionais).values(PROFISSIONAIS);
  await seedPlanos(db);
}
