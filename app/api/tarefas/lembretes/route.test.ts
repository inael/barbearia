import { describe, it, expect, vi, beforeEach, afterEach } from "vitest";

// A rota importa getDb/processarLembretes no topo. Aqui interessa SO a porta de
// entrada: quem entra e quem nao entra. O que acontece depois do segredo aceito
// e coberto por lib/lembretes-agendador.test.ts, e nao deve tocar banco aqui.
// vi.hoisted porque a fabrica do vi.mock sobe acima das consts do arquivo:
// referenciar um const normal ali daria "cannot access before initialization".
const { processar } = vi.hoisted(() => ({ processar: vi.fn(async () => ({ enviados: 2, falhas: 0 })) }));
vi.mock("@/lib/db", () => ({ getDb: () => ({}) }));
vi.mock("@/lib/lembretes-agendador", () => ({ processarLembretes: processar }));

const { POST } = await import("./route");

const SEGREDO = "segredo-de-teste-1234";
const chamar = (headers: Record<string, string> = {}) =>
  POST(new Request("http://localhost/api/tarefas/lembretes", { method: "POST", headers }));

let anterior: string | undefined;
beforeEach(() => {
  anterior = process.env.TAREFAS_SECRET;
  processar.mockClear();
});
afterEach(() => {
  if (anterior === undefined) delete process.env.TAREFAS_SECRET;
  else process.env.TAREFAS_SECRET = anterior;
});

describe("LEA — a rota do agendador so abre com o segredo", () => {
  it("LEA-001 sem segredo no pedido: 401 e NENHUMA mensagem enviada", async () => {
    process.env.TAREFAS_SECRET = SEGREDO;

    const semNada = await chamar();
    expect(semNada.status).toBe(401);

    const errado = await chamar({ "x-tarefa-secret": "chute" });
    expect(errado.status).toBe(401);

    // o que de fato importa: 401 nao pode ser so o codigo, tem que nao disparar nada
    expect(processar, "pedido recusado nao pode mandar WhatsApp para ninguem").not.toHaveBeenCalled();
  });

  it("LEA-001 com o segredo certo: 200 e o resultado do envio volta no corpo", async () => {
    process.env.TAREFAS_SECRET = SEGREDO;

    const res = await chamar({ "x-tarefa-secret": SEGREDO });
    expect(res.status).toBe(200);
    expect(await res.json()).toEqual({ enviados: 2, falhas: 0 });
    expect(processar).toHaveBeenCalledTimes(1);
  });

  it("LEA-001 aceita o segredo tambem como Bearer, que e o formato de quem chama por API", async () => {
    process.env.TAREFAS_SECRET = SEGREDO;
    const res = await chamar({ authorization: `Bearer ${SEGREDO}` });
    expect(res.status).toBe(200);
    expect(processar).toHaveBeenCalledTimes(1);
  });

  it("LEA-001 sem TAREFAS_SECRET no ambiente a rota fica FECHADA (503), nao aberta", async () => {
    delete process.env.TAREFAS_SECRET;

    // o erro perigoso seria "sem segredo configurado, deixa passar": qualquer um na
    // internet dispararia WhatsApp para os clientes da barbearia.
    const res = await chamar({ "x-tarefa-secret": "qualquer-coisa" });
    expect(res.status).toBe(503);
    expect(processar).not.toHaveBeenCalled();

    const vazio = await chamar();
    expect(vazio.status).toBe(503);
    expect(processar).not.toHaveBeenCalled();
  });
});
