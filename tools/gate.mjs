#!/usr/bin/env node
// Gate local tipo-CI. Uso: node tools/gate.mjs [quick|feature|full]
// quick   = lint + typecheck + unit
// feature = quick + integration + e2e
// full    = tlc + lint + typecheck + unit + integration + e2e + coverage + mutation + security-audit
import { spawnSync } from "node:child_process";

const level = process.argv[2] || "quick";
const npm = process.platform === "win32" ? "npm.cmd" : "npm";

const S = (name, cmd, args, blocking = true) => ({ name, cmd, args, blocking });

const PLANS = {
  quick: () => [S("lint", npm, ["run", "lint"]), S("typecheck", npm, ["run", "typecheck"]), S("test:unit", npm, ["run", "test:unit"])],
  feature: () => [...PLANS.quick(), S("test:integration", npm, ["run", "test:integration"]), S("test:e2e", npm, ["run", "test:e2e"])],
  full: () => [
    S("tlc-validate", npm, ["run", "tlc"]),
    ...PLANS.feature(),
    S("test:coverage", npm, ["run", "test:coverage"]),
    S("test:mutation", npm, ["run", "test:mutation"]),
    S("security-audit", npm, ["audit", "--audit-level=high"], false),
  ],
};

const plan = PLANS[level];
if (!plan) {
  console.error(`nivel invalido: ${level} (use quick|feature|full)`);
  process.exit(2);
}

const steps = plan();
const results = [];
console.log(`\n=== GATE [${level}] — ${steps.length} passos ===\n`);
for (const s of steps) {
  console.log(`\n--- ${s.name} ---`);
  const r = spawnSync(s.cmd, s.args, { stdio: "inherit", shell: true });
  const ok = r.status === 0;
  results.push({ name: s.name, ok, blocking: s.blocking });
  if (!ok && s.blocking) console.log(`>>> ${s.name} FALHOU (bloqueante)`);
  else if (!ok) console.log(`>>> ${s.name} falhou (nao-bloqueante, warning)`);
}

console.log(`\n=== RESUMO GATE [${level}] ===`);
for (const r of results) console.log(`  ${r.ok ? "PASS" : r.blocking ? "FAIL" : "WARN"}  ${r.name}`);
const hardFail = results.some((r) => !r.ok && r.blocking);
console.log(hardFail ? "\nGATE: FAIL\n" : "\nGATE: PASS\n");
process.exit(hardFail ? 1 : 0);
