import { describe, it, expect } from "vitest";
import { GET } from "./route";

describe("OPS — /health (unit, independente do banco)", () => {
  it("OPS-003 responde 200 sem DATABASE_URL e sem tocar no Postgres", async () => {
    // GET e uma funcao pura (nao importa lib/db); roda sem banco nenhum.
    const res = GET();
    expect(res.status).toBe(200);
    const body = await res.json();
    expect(body.status).toBe("ok");
    expect(body.service).toBe("barbearia");
    expect(typeof body.timestamp).toBe("string");
  });
});
