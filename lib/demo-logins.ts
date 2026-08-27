// Atalho de teste do login (UXS-012): seletor "Entrar como" que preenche e-mail/senha
// de um perfil. Existe SÓ quando NEXT_PUBLIC_DEMO_LOGINS=1 (ambiente de dev/teste).
// Em produção a env não é setada e a lista sai vazia — o seletor não é renderizado,
// então credenciais de demonstração nunca aparecem para o cliente final.

export interface PerfilDemo {
  rotulo: string;
  email: string;
  senha: string;
}

const PERFIS: PerfilDemo[] = [
  { rotulo: "Dono (Rodrigo)", email: "dono@faith.com", senha: "dono123" },
  { rotulo: "Recepção", email: "recepcao@faith.com", senha: "recep123" },
  { rotulo: "Barbeiro (Pedro)", email: "barbeiro@faith.com", senha: "barb123" },
];

/** Perfis do atalho de teste. Lista vazia = seletor desligado (produção). */
export function perfisDemo(flag: string | undefined): PerfilDemo[] {
  return flag === "1" ? PERFIS : [];
}
