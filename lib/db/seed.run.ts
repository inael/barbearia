import { getDb } from "./index";
import { seedCatalog, SERVICOS, COMBOS, PROFISSIONAIS } from "./seed";

// CLI do seed (uso: `npm run db:seed`). Mantido separado de seed.ts para que
// importar o catalogo/seedCatalog nos testes NAO dispare conexao/efeito.
async function main() {
  const db = getDb();
  console.log(`Semeando ${SERVICOS.length} servicos, ${COMBOS.length} combos, ${PROFISSIONAIS.length} profissionais...`);
  await seedCatalog(db);
  console.log("Seed concluido com sucesso.");
  process.exit(0);
}

main().catch((e) => {
  console.error("Falha no seed:", e);
  process.exit(1);
});
