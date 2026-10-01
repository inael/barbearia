import { describe, it, expect, vi, afterEach } from "vitest";
import { asaasConfigurado } from "./asaas-assinaturas";

afterEach(() => vi.unstubAllGlobals());

describe("ASS-ASAAS - client Asaas assinaturas (unit)", () => {
  it("ASS-U01 asaasConfigurado retorna false sem env vars", () => {
    const savedUrl = process.env.ASAAS_URL;
    const savedKey = process.env.ASAAS_API_KEY;
    delete process.env.ASAAS_URL;
    delete process.env.ASAAS_API_KEY;
    expect(asaasConfigurado()).toBe(false);
    if (savedUrl) process.env.ASAAS_URL = savedUrl;
    if (savedKey) process.env.ASAAS_API_KEY = savedKey;
  });

  it("ASS-U02 asaasConfigurado retorna true com env vars", () => {
    const savedUrl = process.env.ASAAS_URL;
    const savedKey = process.env.ASAAS_API_KEY;
    process.env.ASAAS_URL = "https://sandbox.asaas.com/api/v3";
    process.env.ASAAS_API_KEY = "sk_test";
    expect(asaasConfigurado()).toBe(true);
    if (savedUrl) process.env.ASAAS_URL = savedUrl;
    else delete process.env.ASAAS_URL;
    if (savedKey) process.env.ASAAS_API_KEY = savedKey;
    else delete process.env.ASAAS_API_KEY;
  });
});
