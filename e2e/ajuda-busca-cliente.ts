import { expect, type Page } from "@playwright/test";

/**
 * Escolhe um cliente no campo de busca (BCL).
 *
 * Antes era `selectOption` numa lista suspensa. Virou campo de digitação depois que o
 * Rodrigo reclamou de rolar a lista inteira no caixa. Este helper existe para que a
 * troca de interface não se espalhe por cada teste.
 */
export async function escolherCliente(page: Page, testId: string, nome: string) {
  const campo = page.getByTestId(testId);
  await campo.fill(nome);
  const sugestao = page.locator(`[data-cliente-sugerido="${nome}"]`);
  await expect(sugestao, `nenhuma sugestão para "${nome}"`).toBeVisible();
  await sugestao.click();
  // o campo passa a mostrar o cliente escolhido
  await expect(campo).toHaveValue(new RegExp(nome.replace(/[.*+?^${}()|[\]\\]/g, "\\$&")));
}

/** Escolhe o primeiro cliente que aparecer para um termo. Use quando o nome exato não importa. */
export async function escolherPrimeiroCliente(page: Page, testId: string, termo: string) {
  const campo = page.getByTestId(testId);
  await campo.fill(termo);
  const primeira = page.locator(`[data-testid="${testId}-sugestoes"] [data-cliente-sugerido]`).first();
  await expect(primeira).toBeVisible();
  await primeira.click();
}
