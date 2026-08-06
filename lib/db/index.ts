import { drizzle } from "drizzle-orm/postgres-js";
import postgres from "postgres";
import * as schema from "./schema";

// Lazy: a conexao so e criada quando o banco e usado (nao no import),
// pra o build do Next nao precisar de DATABASE_URL.
const g = globalThis as unknown as { _db?: ReturnType<typeof drizzle<typeof schema>> };

export function getDb() {
  if (!g._db) {
    const url = process.env.DATABASE_URL;
    if (!url) throw new Error("DATABASE_URL nao definida");
    g._db = drizzle(postgres(url, { prepare: false }), { schema });
  }
  return g._db;
}

export { schema };
