import { getDb } from "./index";
import { servicos, combos, profissionais } from "./schema";

const db = getDb();

// Catalogo real da Faith Barbearia (docs/produto/RESPOSTAS.md).
const SERVICOS = [
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

const COMBOS = [
  { slug: "camuflagem", nome: "Camuflagem", precoCentavos: 17000, duracaoMin: 60, inclui: "Corte+barba, tonalizacao barba, tonalizacao corte" },
  { slug: "rilex", nome: "Rilex", precoCentavos: 15000, duracaoMin: 60, inclui: "Hidratacao corte+barba, limpeza de pele, cone hindu" },
  { slug: "ouro", nome: "Ouro", precoCentavos: 14000, duracaoMin: 60, inclui: "Corte, sobrancelha, hidratacao, limpeza de pele" },
  { slug: "reconstrucao", nome: "Reconstrucao", precoCentavos: 13000, duracaoMin: 60, inclui: "Corte, acidificacao, reconstrucao detox" },
  { slug: "diamante", nome: "Diamante", precoCentavos: 20000, duracaoMin: 80, inclui: "Corte+barba, sobrancelha, limpeza de pele, hidratacao (ambas)" },
  { slug: "faith", nome: "Faith", precoCentavos: 28000, duracaoMin: 80, inclui: "Corte+barba, sobrancelha, limpeza de pele, (progressiva/selagem/realinhamento/tonalizacao)" },
];

const PROFISSIONAIS = [
  { nome: "Rodrigo", papel: "dono" as const },
  { nome: "Pedro", papel: "barbeiro" as const },
  { nome: "Joao", papel: "barbeiro" as const },
  { nome: "Recepcao", papel: "recepcionista" as const },
];

async function main() {
  console.log("Limpando tabelas...");
  await db.delete(servicos);
  await db.delete(combos);
  await db.delete(profissionais);

  console.log(`Inserindo ${SERVICOS.length} servicos, ${COMBOS.length} combos, ${PROFISSIONAIS.length} profissionais...`);
  await db.insert(servicos).values(SERVICOS);
  await db.insert(combos).values(COMBOS);
  await db.insert(profissionais).values(PROFISSIONAIS);

  console.log("Seed concluido com sucesso.");
  process.exit(0);
}

main().catch((e) => {
  console.error("Falha no seed:", e);
  process.exit(1);
});
