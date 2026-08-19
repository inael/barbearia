import { test, expect } from "@playwright/test";

test.describe("OPS — /health (uptime)", () => {
  test("OPS-001/002 /health responde 200 + JSON status ok", { tag: "@critical" }, async ({ request }) => {
    const res = await request.get("/health");
    expect(res.status()).toBe(200);
    const body = await res.json();
    expect(body.status).toBe("ok");
    expect(body.service).toBe("barbearia");
    expect(typeof body.timestamp).toBe("string");
  });
});
