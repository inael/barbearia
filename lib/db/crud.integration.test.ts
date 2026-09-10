import { describe, it, expect, beforeAll, afterAll } from "vitest";
import { PostgreSqlContainer, type StartedPostgreSqlContainer } from "@testcontainers/postgresql";
import { execSync } from "node:child_process";
import postgres from "postgres";
import { drizzle, type PostgresJsDatabase } from "drizzle-orm/postgres-js";
import { eq } from "drizzle-orm";
import * as schema from "./schema";
import { seedCatalog } from "./seed";
import { criarCliente, listarClientes, removerCliente } from "../clientes";
import { criarUsuario, listarUsuarios, editarUsuario, removerUsuario } from "../auth/usuarios";
import {
  cadastrarProdutoEstoque,
  registrarMovimento,
  editarProdutoEstoque,
  removerProdutoEstoque,
  listarProdutosEstoque,
} from "../estoque";
import {
  criarPlano,
  listarPlanos,
  editarPlano,
  definirPlanoAtivo,
  removerPlano,
  criarAssinatura,
  trocarPlanoAssinatura,
} from "../assinaturas";
import { registrarVale, listarVales, editarVale, removerVale } from "../vales";
import { criarTela, listarTelas, editarTela, removerTela, adicionarItem, listarItens } from "../tv";
import { criarComanda, adicionarServico, fecharComanda } from "../caixa";

let container: StartedPostgreSqlContainer;
let client: ReturnType<typeof postgres>;
let db: PostgresJsDatabase<typeof schema>;

beforeAll(async () => {
  container = await new PostgreSqlContainer("postgres:16-alpine").start();
  const url = container.getConnectionUri();
  execSync("npx drizzle-kit push --force", { env: { ...process.env, DATABASE_URL: url }, stdio: "pipe" });
  client = postgres(url, { prepare: false });
  db = drizzle(client, { schema });
  await seedCatalog(db);
}, 200_000);

afterAll(async () => {
  await client?.end({ timeout: 5 });
  await container?.stop();
});

describe("CRUD — cadastro, edição e exclusão em todas as entidades (integration)", () => {
  it("CRUD-002 cliente: exclui quem não tem histórico; RECUSA quem já tem venda", async () => {
    const semNada = await criarCliente(db, { nome: "Excluivel", telefone: "61900000001" });
    await removerCliente(db, semNada);
    expect((await listarClientes(db)).some((c) => c.id === semNada)).toBe(false);

    // cliente com venda no caixa: o histórico não pode sumir
    const comVenda = await criarCliente(db, { nome: "Tem Venda", telefone: "61900000002" });
    const [corte] = await db.select().from(schema.servicos).where(eq(schema.servicos.slug, "corte"));
    const [pedro] = await db.select().from(schema.profissionais).where(eq(schema.profissionais.nome, "Pedro"));
    const c = await criarComanda(db, comVenda);
    await adicionarServico(db, c, corte.id, pedro.id);
    await fecharComanda(db, c, "dinheiro", new Date());
    await expect(removerCliente(db, comVenda)).rejects.toThrow(/venda|desative/i);
    expect((await listarClientes(db)).some((x) => x.id === comVenda)).toBe(true);
  });

  it("CRUD-003 usuário: edita nome/e-mail, recusa e-mail repetido e protege o único dono", async () => {
    const dono = (await criarUsuario(db, { nome: "Dono CRUD", email: "dono.crud@faith.com", senha: "dono12345", papel: "dono" })).id;
    const recep = (await criarUsuario(db, { nome: "Recep CRUD", email: "recep.crud@faith.com", senha: "recep12345", papel: "recepcionista" })).id;

    await editarUsuario(db, recep, "Recepção Nova", "recepcao.nova@faith.com");
    const lista = await listarUsuarios(db);
    const atualizado = lista.find((u) => u.id === recep);
    expect(atualizado?.nome).toBe("Recepção Nova");
    expect(atualizado?.email).toBe("recepcao.nova@faith.com");
    await expect(editarUsuario(db, recep, "X", "dono.crud@faith.com")).rejects.toThrow(/e-mail/i);

    // com um dono só, excluir é bloqueado; com dois, libera
    await expect(removerUsuario(db, dono)).rejects.toThrow(/único dono/i);
    const dono2 = (await criarUsuario(db, { nome: "Dono 2", email: "dono2.crud@faith.com", senha: "dono12345", papel: "dono" })).id;
    await removerUsuario(db, dono);
    expect((await listarUsuarios(db)).some((u) => u.id === dono)).toBe(false);
    await removerUsuario(db, recep);
    // dono2 agora é o único dono — a mesma proteção vale de novo (a regra não é
    // sobre QUEM é, e sim sobre não deixar o sistema sem administrador)
    await expect(removerUsuario(db, dono2)).rejects.toThrow(/único dono/i);
  });

  it("CRUD-004 estoque: edita nome/unidade e só exclui com saldo zerado", async () => {
    const id = await cadastrarProdutoEstoque(db, "Cera CRUD", "un", 3);
    await editarProdutoEstoque(db, id, "Cera CRUD Premium", "cx");
    const p = (await listarProdutosEstoque(db)).find((x) => x.id === id);
    expect(p?.nome).toBe("Cera CRUD Premium");
    expect(p?.unidade).toBe("cx");
    await expect(editarProdutoEstoque(db, id, "X", "frasco")).rejects.toThrow(/unidade/i);

    await expect(removerProdutoEstoque(db, id)).rejects.toThrow(/estoque|baixa/i); // ainda tem 3
    await registrarMovimento(db, id, "saida", 3, "baixa para exclusão");
    await removerProdutoEstoque(db, id);
    expect((await listarProdutosEstoque(db)).some((x) => x.id === id)).toBe(false);
  });

  it("CRUD-005/006 plano: edita, desativa, recusa excluir com assinante; assinatura troca de plano", async () => {
    const flex = await criarPlano(db, { nome: "Flex CRUD", tipo: "flex", precoCentavos: 10000, descontoServicoPct: 10, descontoProdutoPct: 5, dias: "2,3,4" });
    const premium = await criarPlano(db, { nome: "Premium CRUD", tipo: "premium", precoCentavos: 20000, descontoServicoPct: 20, descontoProdutoPct: 10, dias: "" });

    await editarPlano(db, flex, { nome: "Flex CRUD+", tipo: "flex", precoCentavos: 12000, descontoServicoPct: 15, descontoProdutoPct: 7, dias: "2,3,4" });
    let lista = await listarPlanos(db);
    const editado = lista.find((p) => p.id === flex);
    expect(editado?.nome).toBe("Flex CRUD+");
    expect(editado?.precoCentavos).toBe(12000);

    // com assinante: plano não pode ser apagado, e a assinatura pode trocar de plano
    const cli = await criarCliente(db, { nome: "Assinante CRUD", telefone: "61900000003" });
    const ass = await criarAssinatura(db, cli, flex);
    await expect(removerPlano(db, flex)).rejects.toThrow(/assinante|desative/i);
    await trocarPlanoAssinatura(db, ass, premium);
    const [depois] = await db.select().from(schema.assinaturas).where(eq(schema.assinaturas.id, ass));
    expect(depois.planoId).toBe(premium);

    // desativar tira da lista de contratação sem apagar nada
    await definirPlanoAtivo(db, flex, false);
    lista = await listarPlanos(db);
    expect(lista.some((p) => p.id === flex)).toBe(false);
    await removerPlano(db, flex); // agora ninguém assina o flex
  });

  it("CRUD-007 vale: edita recalculando o desconto, exclui, e não deixa mexer no vale do caixa", async () => {
    const [pedro] = await db.select().from(schema.profissionais).where(eq(schema.profissionais.nome, "Pedro"));
    const id = await registrarVale(db, { profissionalId: pedro.id, tipo: "retirado_barbeiro", descricao: "Pomada CRUD", precoCentavos: 10000 });
    let v = (await listarVales(db)).find((x) => x.id === id);
    expect(v?.valorCentavos).toBe(7000); // 30% de desconto

    await editarVale(db, id, { tipo: "produto_cliente", descricao: "Pomada CRUD 2", precoCentavos: 5000 });
    v = (await listarVales(db)).find((x) => x.id === id);
    expect(v?.descricao).toBe("Pomada CRUD 2");
    expect(v?.valorCentavos).toBe(3500); // recalculado pelo preço novo

    // vale gerado pelo caixa (serviço do barbeiro) não se edita por aqui
    const [row] = await db
      .insert(schema.vales)
      .values({ profissionalId: pedro.id, tipo: "servico_barbeiro", descricao: "Progressiva", precoCentavos: 15000, valorCentavos: 9000 })
      .returning({ id: schema.vales.id });
    await expect(editarVale(db, row.id, { tipo: "produto_cliente", descricao: "X", precoCentavos: 100 })).rejects.toThrow(/caixa/i);

    await removerVale(db, id);
    expect((await listarVales(db)).some((x) => x.id === id)).toBe(false);
  });

  it("CRUD-008 TV: edita nome/velocidade e excluir a tela leva a playlist junto", async () => {
    const id = await criarTela(db, "TV CRUD", 10);
    await adicionarItem(db, id, "https://exemplo.test/a.jpg");
    expect(await listarItens(db, id)).toHaveLength(1);

    await editarTela(db, id, "TV CRUD Recepção", 25);
    const t = (await listarTelas(db)).find((x) => x.id === id);
    expect(t?.nome).toBe("TV CRUD Recepção");
    expect(t?.velocidadeSegundos).toBe(25);
    await expect(editarTela(db, id, "", 10)).rejects.toThrow(/nome/i);

    await removerTela(db, id);
    expect((await listarTelas(db)).some((x) => x.id === id)).toBe(false);
    expect(await listarItens(db, id)).toHaveLength(0);
  });
});
