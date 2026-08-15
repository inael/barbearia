import { execSync } from "node:child_process";
import { readFileSync, rmSync } from "node:fs";
import path from "node:path";

export default async function globalTeardown() {
  const f = path.join(process.cwd(), "e2e", ".runtime.json");
  try {
    const { pid, containerId } = JSON.parse(readFileSync(f, "utf8")) as {
      pid?: number;
      containerId?: string;
    };
    if (pid) {
      const cmd = process.platform === "win32" ? `taskkill /pid ${pid} /T /F` : `kill -9 ${pid}`;
      try {
        execSync(cmd, { stdio: "ignore" });
      } catch {
        /* ja morto */
      }
    }
    if (containerId) {
      try {
        execSync(`docker stop ${containerId}`, { stdio: "ignore" });
      } catch {
        /* Ryuk reaper limpa de qualquer forma */
      }
    }
    rmSync(f, { force: true });
  } catch {
    /* nada a limpar */
  }
}
