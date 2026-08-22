import { getDb } from "./index";
import { criarUsuario } from "../auth/usuarios";
import * as schema from "./schema";
import { eq } from "drizzle-orm";

// Cria usuários de login para DEV/demo (idempotente). NÃO usar em produção.
async function existe(db: ReturnType<typeof getDb>, email: string) {
  const r = await db.select().from(schema.usuarios).where(eq(schema.usuarios.email, email));
  return r.length > 0;
}

async function main() {
  const db = getDb();
  const [rodrigo] = await db.select().from(schema.profissionais).where(eq(schema.profissionais.nome, "Rodrigo"));
  const [pedro] = await db.select().from(schema.profissionais).where(eq(schema.profissionais.nome, "Pedro"));

  if (!(await existe(db, "dono@faith.com"))) {
    await criarUsuario(db, { email: "dono@faith.com", senha: "dono123", nome: "Rodrigo (dono)", papel: "dono", profissionalId: rodrigo?.id ?? null });
  }
  if (!(await existe(db, "barbeiro@faith.com"))) {
    await criarUsuario(db, { email: "barbeiro@faith.com", senha: "barb123", nome: "Pedro (barbeiro)", papel: "barbeiro", profissionalId: pedro?.id ?? null });
  }
  console.log("Usuarios demo prontos: dono@faith.com / dono123  e  barbeiro@faith.com / barb123");
  process.exit(0);
}

main().catch((e) => {
  console.error("Falha ao criar usuarios demo:", e);
  process.exit(1);
});
