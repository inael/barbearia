// P4 (Rodrigo, 20/10 e 22/10): na agenda, cliente assinante tem que mostrar "Corte pela
// assinatura", "Barba pela assinatura", "Pezinho"... para ir pro sistema de assinatura.
//
// O plano não tem lista de serviços no banco, mas os planos do Rodrigo já dizem o que
// cobrem no nome: "Flex — Corte/barba/pezinho/sobrancelha". Lemos dali, sem mudar
// schema. Plano sem "—" (nome livre) não cobre nada de forma explícita.
// Puro e testável.

const normalizar = (t: string) =>
  t
    .normalize("NFD")
    .replace(/[\u0300-\u036f]/g, "")
    .toLowerCase()
    .trim();

/** Nomes dos serviços que o plano cobre, lidos do nome ("Flex — Corte/barba"). */
export function itensDoPlano(planoNome: string): string[] {
  const partes = planoNome.split(/\s[—–-]\s/);
  if (partes.length < 2) return [];
  return partes
    .slice(1)
    .join(" ")
    .split("/")
    .map(normalizar)
    .filter(Boolean);
}

/**
 * Ids dos serviços do catálogo cobertos pelo plano. Casa pelo nome exato do serviço
 * (sem acento/maiúscula): "barba" pega "Barba", mas não "Hidratação de barba".
 */
export function servicosCobertos<T extends { id: number; nome: string }>(planoNome: string, servicos: T[]): T[] {
  const itens = new Set(itensDoPlano(planoNome));
  return servicos.filter((s) => itens.has(normalizar(s.nome)));
}
