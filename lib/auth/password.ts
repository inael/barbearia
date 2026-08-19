import { randomBytes, scryptSync, timingSafeEqual } from "node:crypto";

// Hash de senha com scrypt (stdlib, sem dependência). Formato: scrypt$<saltHex>$<hashHex>.

/** Gera o hash salgado da senha. Duas chamadas da mesma senha dão hashes diferentes. */
export function hashSenha(senha: string): string {
  const salt = randomBytes(16);
  const hash = scryptSync(senha, salt, 64);
  return `scrypt$${salt.toString("hex")}$${hash.toString("hex")}`;
}

/** Verifica a senha contra o hash armazenado. Retorna false (nunca lança) para formato inválido. */
export function verificarSenha(senha: string, armazenado: string): boolean {
  const partes = armazenado.split("$");
  if (partes.length !== 3 || partes[0] !== "scrypt") return false;
  let salt: Buffer;
  let esperado: Buffer;
  try {
    salt = Buffer.from(partes[1], "hex");
    esperado = Buffer.from(partes[2], "hex");
  } catch {
    return false;
  }
  if (salt.length === 0 || esperado.length === 0) return false;
  const calc = scryptSync(senha, salt, esperado.length);
  return esperado.length === calc.length && timingSafeEqual(esperado, calc);
}
