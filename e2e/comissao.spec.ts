import { test, expect } from "@playwright/test";
import {
  faixaComissaoServico,
  faixaComissaoProduto,
  comissaoServico,
  comissaoProduto,
  comissaoDividida,
  comissaoHidratacaoRecepcionista,
} from "../lib/comissao";
import { calcularPote, dividirPote } from "../lib/pote";

const round2 = (n: number) => Math.round((n + Number.EPSILON) * 100) / 100;
const numBR = (n: number) =>
  round2(n).toLocaleString("pt-BR", { minimumFractionDigits: 2, maximumFractionDigits: 2 });

// Defaults reais de app/comissao/page.tsx — a fonte da consistência UI<->motor.
const D = {
  fat: 13000,
  prod: 1800,
  avulsos: 4000,
  combos: 1500,
  divididos: 500,
  produtosVend: 900,
  hidr: 8,
  receita: 3000,
  pR: 300,
  pP: 180,
  pJ: 120,
};

test.describe("CUI — Simulador de Comissao & Pote", () => {
  test("CUI-001 rota responde e mostra o titulo", { tag: "@critical" }, async ({ page }) => {
    const resp = await page.goto("/comissao");
    expect(resp?.status()).toBe(200);
    await expect(page.getByRole("heading", { name: "Comissao & Pote" })).toBeVisible();
  });

  test("CUI-002 faixa de servico muda com o faturamento do mes anterior", { tag: "@critical" }, async ({ page }) => {
    await page.goto("/comissao");
    const faixaCard = page.locator("section", { hasText: "Faixa do mes" });
    const inp = faixaCard.getByLabel(/Faturamento do barbeiro no mes anterior/);
    // getByText exact:true evita casar com o texto de ajuda ("40% base, 45% ...").
    await inp.fill("8000");
    await expect(faixaCard.getByText("40%", { exact: true })).toBeVisible();
    await inp.fill("13000");
    await expect(faixaCard.getByText("45%", { exact: true })).toBeVisible();
    await inp.fill("15000");
    await expect(faixaCard.getByText("50%", { exact: true })).toBeVisible();
  });

  test("CUI-003/006 total do barbeiro exibido == calculado pelo motor", { tag: "@critical" }, async ({ page }) => {
    await page.goto("/comissao");
    const faixaS = faixaComissaoServico(D.fat);
    const faixaP = faixaComissaoProduto(D.prod);
    const total =
      comissaoServico(D.avulsos, faixaS, false) +
      comissaoServico(D.combos, faixaS, true) +
      comissaoDividida(D.divididos).barbeiro +
      comissaoProduto(D.produtosVend, faixaP);
    const card = page.locator("section", { hasText: "Comissao do barbeiro" });
    await expect(card.getByText(numBR(total))).toBeVisible();
  });

  test("CUI-004 pote total e divisao por pontos", { tag: "@critical" }, async ({ page }) => {
    await page.goto("/comissao");
    const pote = calcularPote(D.receita);
    const partes = dividirPote(pote, { Rodrigo: D.pR, Pedro: D.pP, Joao: D.pJ });
    const potCard = page.locator("section", { hasText: "Divisao do pote" });
    await expect(potCard.getByText(numBR(pote))).toBeVisible();
    await expect(potCard.getByText(numBR(partes.Rodrigo))).toBeVisible();
  });

  test("CUI-005 total da recepcao (divididos + hidratacoes)", { tag: "@critical" }, async ({ page }) => {
    await page.goto("/comissao");
    const total =
      comissaoDividida(D.divididos).recepcionista + comissaoHidratacaoRecepcionista(D.hidr);
    const card = page.locator("section", { hasText: "Recepcionista" });
    await expect(card.getByText(numBR(total))).toBeVisible();
  });
});
