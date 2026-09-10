import { describe, it, expect } from "vitest";
import { gruposParaPapel, hrefsVisiveis, type ItemNav } from "./nav";
import { podeAcessar, type Papel } from "./auth/rbac";

/** Labels dos itens de PRIMEIRO nível (pais). */
const pais = (p: Papel | null) => gruposParaPapel(p).flatMap((g) => g.itens.map((i) => i.label));
/** Labels de todos os itens (pais + filhos). */
const todos = (p: Papel | null) =>
  gruposParaPapel(p).flatMap((g) => g.itens.flatMap((i) => [i.label, ...(i.filhos ?? []).map((f) => f.label)]));
const acharItem = (p: Papel, label: string): ItemNav | undefined =>
  gruposParaPapel(p).flatMap((g) => g.itens).find((i) => i.label === label);

describe("UXS — grupos de navegação por papel (sidebar)", () => {
  it("UXS-001 dono vê tudo: Painel do dono, Operação, Cadastros completos, Gestão e TV", () => {
    const t = todos("dono");
    for (const esperado of [
      "Painel do dono", "Catálogo", "Comissão", "Agenda", "Minha agenda", "Caixa", "Vales",
      "Cadastros", "Serviços e combos", "Produtos", "Clientes", "Profissionais", "Usuários",
      "Horários", "Metas", "Estoque", "Assinaturas", "Pote", "Avisos", "TVs", "Conta",
    ]) {
      expect(t, `dono deveria ver ${esperado}`).toContain(esperado);
    }
    expect(gruposParaPapel("dono").map((g) => g.titulo)).toEqual([null, "Operação", "Cadastros", "Gestão", "TV", null]);
  });

  it("UXS-001 recepção opera e cadastra, mas não vê Painel do dono, TVs nem cadastros de config", () => {
    const t = todos("recepcionista");
    for (const esperado of ["Agenda", "Caixa", "Vales", "Cadastros", "Serviços e combos", "Clientes", "Estoque", "Assinaturas"]) {
      expect(t).toContain(esperado);
    }
    for (const proibido of ["Painel do dono", "TVs", "Profissionais", "Usuários", "Horários", "Minha agenda"]) {
      expect(t, `recepção NÃO deveria ver ${proibido}`).not.toContain(proibido);
    }
  });

  it("UXS-018 hierarquia: submenu só existe sob um pai, com ícone da lib em todo item", () => {
    // Cadastros é PAI e os cadastros viraram filhos (antes era tudo no mesmo nível)
    const cadastros = acharItem("dono", "Cadastros");
    expect(cadastros?.filhos?.map((f) => f.label)).toEqual([
      "Serviços e combos", "Produtos", "Clientes", "Profissionais", "Usuários", "Horários",
    ]);
    // recepção vê o mesmo pai, com menos filhos
    expect(acharItem("recepcionista", "Cadastros")?.filhos).toHaveLength(3);
    // Agenda e Assinaturas também têm submenu
    expect(acharItem("dono", "Agenda")?.filhos?.[0].label).toBe("Minha agenda");
    expect(acharItem("dono", "Assinaturas")?.filhos?.[0].label).toBe("Pote");

    // TODO item (pai ou filho) tem ícone declarado — nenhum emoji, só nome de ícone lucide
    for (const papel of ["dono", "recepcionista", "barbeiro"] as const) {
      for (const g of gruposParaPapel(papel)) {
        for (const i of g.itens) {
          for (const item of [i, ...(i.filhos ?? [])]) {
            expect(item.icone, `${item.label} sem ícone`).toMatch(/^[A-Z][A-Za-z]+$/);
          }
        }
      }
    }
  });

  it("UXS-001 barbeiro vê só o próprio mundo; visitante não vê menu (app exige login)", () => {
    const t = todos("barbeiro");
    for (const esperado of ["Catálogo", "Comissão", "Minha agenda", "Vales", "Metas", "Pote", "Conta"]) {
      expect(t).toContain(esperado);
    }
    for (const proibido of ["Painel do dono", "Agenda", "Caixa", "Cadastros", "Estoque", "TVs", "Avisos"]) {
      expect(t).not.toContain(proibido);
    }
    // barbeiro não tem "agenda" (só a própria): o item vira raiz, sem pai Agenda
    expect(pais("barbeiro")).toContain("Minha agenda");

    // UXS-012: deslogado não existe dentro do app
    expect(gruposParaPapel(null)).toEqual([]);
    expect(hrefsVisiveis(null)).toEqual([]);
    for (const g of gruposParaPapel("barbeiro")) expect(g.itens.length).toBeGreaterThan(0);
  });

  it("UXS-015 INVARIANTE: todo href do menu é acessível ao papel (nada leva a 'Sem acesso')", () => {
    const exigido: Record<string, Parameters<typeof podeAcessar>[1]> = {
      "/painel": "config", "/agenda": "agenda", "/minha-agenda": "agenda_propria",
      "/caixa": "caixa", "/cadastros": "cadastro", "/cadastros/servicos": "cadastro",
      "/cadastros/produtos": "cadastro", "/cadastros/clientes": "cadastro",
      "/cadastros/profissionais": "config", "/cadastros/usuarios": "config",
      "/cadastros/horarios": "config", "/estoque": "estoque", "/admin/tv": "tv",
      "/notificacoes": "config",
    };
    for (const papel of ["dono", "recepcionista", "barbeiro"] as const) {
      for (const href of hrefsVisiveis(papel)) {
        const rec = exigido[href];
        if (rec) expect(podeAcessar(papel, rec), `${papel} vê ${href} mas não pode abrir`).toBe(true);
      }
    }
  });
});
