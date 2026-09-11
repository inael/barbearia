#!/usr/bin/env node
// Validador TLC: cada spec de feature tem as secoes obrigatorias e ACs com ID;
// STATE.md tem EXIT_SIGNAL. Sai !=0 se algo obrigatorio faltar.
import { readFileSync, readdirSync, existsSync } from "node:fs";
import path from "node:path";

const root = process.cwd();
const featDir = path.join(root, ".specs", "features");
const REQUIRED = ["## Requirement", "## Acceptance Criteria", "## Test Coverage Matrix", "## Gaps"];
const errors = [];
let totalAC = 0,
  pass = 0,
  pending = 0;

if (!existsSync(featDir)) {
  console.error("TLC FAIL: .specs/features nao existe");
  process.exit(1);
}

const files = readdirSync(featDir).filter((f) => f.endsWith(".md"));
for (const f of files) {
  const txt = readFileSync(path.join(featDir, f), "utf8");
  for (const sec of REQUIRED) if (!txt.includes(sec)) errors.push(`${f}: falta secao "${sec}"`);
  const acRows = txt.split("\n").filter((l) => /^\|\s*[A-Z]+-\d+\s*\|/.test(l));
  if (acRows.length === 0) errors.push(`${f}: nenhuma AC com ID (| XXX-000 |)`);
  for (const r of acRows) {
    totalAC++;
    if (/\bPASS\b/.test(r)) pass++;
    else if (/\bPENDING\b/.test(r)) pending++;
    if (!/\.(ts|tsx)\b/.test(r) && !/stryker/i.test(r)) {
      errors.push(`${f}: AC sem arquivo de teste referenciado -> ${r.trim().slice(0, 60)}...`);
    }
    // AC marcada PASS precisa apontar para um arquivo que EXISTE. Antes bastava citar um
    // nome, entao dava para declarar verde apontando para um teste nunca escrito -- foi
    // o que aconteceu com PTG-004/005. Citar nao e provar.
    // PENDING pode citar o arquivo que ainda vai ser escrito: ali o nome e um plano.
    if (/\bPASS\b/.test(r)) {
      for (const ref of r.match(/(?:lib|e2e|app|tools)\/[A-Za-z0-9._/-]+\.(?:ts|tsx)/g) ?? []) {
        if (!existsSync(path.join(root, ref))) {
          errors.push(`${f}: AC marcada PASS cita teste inexistente -> ${ref}`);
        }
      }
    }
  }
}

const stateFile = path.join(root, ".specs", "STATE.md");
if (!existsSync(stateFile)) errors.push("STATE.md nao existe");
else if (!readFileSync(stateFile, "utf8").includes("EXIT_SIGNAL")) errors.push("STATE.md sem EXIT_SIGNAL");

console.log(`TLC validate: ${files.length} features, ${totalAC} ACs (${pass} PASS / ${pending} PENDING)`);
if (errors.length) {
  console.error("TLC FAIL:");
  for (const e of errors) console.error("  - " + e);
  process.exit(1);
}
console.log("TLC OK");
