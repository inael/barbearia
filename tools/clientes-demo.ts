/**
 * Cadastra (ou remove) uma carteira de 20 clientes de demonstração.
 *
 * Serve para o Rodrigo abrir o sistema e já encontrar gente na agenda e no caixa,
 * em vez de telas vazias. São dados FICTÍCIOS — antes de operar de verdade, rode
 * o modo `limpar` para não misturar com a base real.
 *
 *   npx tsx tools/clientes-demo.ts            # cadastra os que faltarem
 *   npx tsx tools/clientes-demo.ts limpar     # remove os que não têm histórico
 *
 * O DATABASE_URL vem do ambiente. Para produção, use o túnel SSH descrito em
 * docs/runbooks/deploy-producao.md (a porta 5432 não é mais pública — SEC-04).
 */
import postgres from "postgres";
import { drizzle } from "drizzle-orm/postgres-js";
import { eq } from "drizzle-orm";
import * as schema from "../lib/db/schema";
import { criarCliente, listarClientes, removerCliente, normalizarTelefone } from "../lib/clientes";

// Nomes comuns em Brasília; telefones no padrão 61 9xxxx-xxxx, todos distintos.
// Os 3 primeiros levam CPF válido para dar pra testar a emissão de nota fiscal.
const CLIENTES = [
  { nome: "Lucas Almeida", telefone: "61 99101-2001", cpf: "52998224725" },
  { nome: "Marcos Paulo Ribeiro", telefone: "61 99101-2002", cpf: "11144477735" },
  { nome: "Felipe Souza", telefone: "61 99101-2003", cpf: "12345678909" },
  { nome: "Thiago Nunes", telefone: "61 99101-2004" },
  { nome: "Bruno Castro", telefone: "61 99101-2005" },
  { nome: "Rafael Lima", telefone: "61 99101-2006" },
  { nome: "Diego Martins", telefone: "61 99101-2007" },
  { nome: "Gustavo Rocha", telefone: "61 99101-2008" },
  { nome: "André Pires", telefone: "61 99101-2009" },
  { nome: "Caio Ferreira", telefone: "61 99101-2010" },
  { nome: "Vinícius Ramos", telefone: "61 99101-2011" },
  { nome: "Eduardo Melo", telefone: "61 99101-2012" },
  { nome: "Renan Cardoso", telefone: "61 99101-2013" },
  { nome: "Igor Teixeira", telefone: "61 99101-2014" },
  { nome: "Otávio Reis", telefone: "61 99101-2015" },
  { nome: "Samuel Barros", telefone: "61 99101-2016" },
  { nome: "Henrique Dias", telefone: "61 99101-2017" },
  { nome: "Leandro Farias", telefone: "61 99101-2018" },
  { nome: "Matheus Prado", telefone: "61 99101-2019" },
  { nome: "Fábio Moura", telefone: "61 99101-2020" },
];

async function main() {
  const url = process.env.DATABASE_URL;
  if (!url) throw new Error("defina DATABASE_URL");
  const limpar = process.argv[2] === "limpar";
  const client = postgres(url, { prepare: false });
  const db = drizzle(client, { schema });

  const existentes = await listarClientes(db);
  const porTelefone = new Map(existentes.map((c) => [c.telefone, c]));

  if (limpar) {
    let removidos = 0;
    let mantidos = 0;
    for (const c of CLIENTES) {
      const achado = porTelefone.get(normalizarTelefone(c.telefone));
      if (!achado) continue;
      try {
        await removerCliente(db, achado.id);
        removidos++;
      } catch {
        mantidos++; // já tem histórico (venda/agendamento): não se apaga
      }
    }
    console.log(`removidos: ${removidos} | mantidos por terem histórico: ${mantidos}`);
    await client.end({ timeout: 5 });
    return;
  }

  let criados = 0;
  let jaExistiam = 0;
  for (const c of CLIENTES) {
    if (porTelefone.has(normalizarTelefone(c.telefone))) {
      jaExistiam++;
      continue;
    }
    // o CPF é único no banco: se já estiver em uso (base de teste anterior),
    // cadastra o cliente sem CPF em vez de abortar a carga inteira
    let id: number;
    try {
      id = await criarCliente(db, c);
    } catch (e) {
      // o drizzle embrulha o erro; o código real do Postgres fica em `cause`
      // (23505 = unique_violation)
      const causa = (e as { cause?: { code?: string } })?.cause;
      const msg = `${e instanceof Error ? e.message : String(e)} ${causa?.code ?? ""}`;
      if (!(causa?.code === "23505" || /duplicate|unique/i.test(msg)) || !c.cpf) throw e;
      id = await criarCliente(db, { nome: c.nome, telefone: c.telefone });
      console.warn(`  ${c.nome}: CPF já usado por outro cadastro, criado sem CPF`);
    }
    if (c.cpf) {
      const [dep] = await db.select({ cpf: schema.clientes.cpf }).from(schema.clientes).where(eq(schema.clientes.id, id));
      if (!dep?.cpf) console.warn(`  ${c.nome}: ficou sem CPF (nota fiscal exige preencher depois)`);
    }
    criados++;
  }

  const total = (await listarClientes(db)).length;
  console.log(`criados: ${criados} | já existiam: ${jaExistiam} | total de clientes na base: ${total}`);
  await client.end({ timeout: 5 });
}

main().catch((e) => {
  console.error("FALHOU:", e instanceof Error ? e.message : e);
  process.exit(1);
});
