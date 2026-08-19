# Runbook — loopx (control plane) no Windows nativo

**Status:** loopx **0.4.9** funcionando no Windows nativo (Python 3.12, pip). `loopx doctor` = `ok: True`, `requires_upgrade: False`. Skills instaladas em `~/.claude/skills` (facade `/loopx*` + workflow: loopx-project, loopx-self-repair, loopx-doc-registry, loopx-pr-*).

Projeto conectado: goal **`barbearia-goal`**, registry local **`.loopx/registry.json`** (gitignored, junto de `.codex/goals/`, `.local/`).

Objetivo do goal: construir o produto barbearia feature a feature (Agenda R1 duração por barbeiro + R2 bloqueio de agenda; TV R3 multi-tela; auth Logto; assinaturas), cada unidade provada pelo gate `tools/gate.mjs`.

---

## 2 workarounds obrigatórios neste ambiente

### W1 — `--scan-path .loopx` em TODO comando de runtime (obrigatório)
**Bug loopx:** `default_public_scan_root()` retorna `Path(__file__).resolve().parents[2]` = **todo o `site-packages`**. A "privacy scan" default varre todos os pacotes Python instalados → satura 1 core e **trava** (`status`, `ready-score`, `quota`, `global-summary`). Passar `--scan-path` (um dir pequeno, ex. `.loopx`) sobrepõe o scan-root e resolve.

Comandos do loop (sempre com `--scan-path .loopx`):
```bash
cd <repo>/barbearia
# status
loopx --registry .loopx/registry.json status --goal-id barbearia-goal --scan-path .loopx
# quota (deve o próximo turno rodar?)
loopx --format json --registry .loopx/registry.json quota should-run --goal-id barbearia-goal --scan-path .loopx --runtime-profile generic_cli
# readiness
loopx --registry .loopx/registry.json ready-score --goal-id barbearia-goal --scan-path .loopx
```
> Ao usar `/loopx` no Claude Code: a skill pode chamar `loopx status` "pelado" → lembrar de acrescentar `--scan-path .loopx`, senão trava.

### W2 — `--no-global-sync` no connect
`loopx connect` faz um global sync/onboarding que varre a árvore inteira (`~/Documents/GitHub` = 27 repos com node_modules) → trava. Conectar assim:
```bash
loopx connect --project . --no-onboarding-scan --no-global-sync --objective "..." --domain engineering
```

---

## Patch aplicado no pacote (site-packages) — RE-APLICAR após upgrade
**Arquivo:** `C:\Users\inael-pc\AppData\Local\Programs\Python\Python312\Lib\site-packages\loopx\workflow_skill_install.py`, função `_exclusive_install_lock`.
**Bug:** fazia `import fcntl` (módulo Unix-only) sem fallback → `workflow-skills --install` crashava no Windows, mesmo o `file_lock.py` já tendo o padrão cross-platform certo.
**Fix aplicado:** `try: import fcntl except ImportError: fcntl=None` + `flock` só quando `fcntl is not None` (lock advisório best-effort; instalação single-user é segura sem kernel lock).
**IMPORTANTE:** `pip install --upgrade loopx` **sobrescreve** este patch. Re-aplicar depois de todo upgrade (ou até o upstream corrigir).

Instalar/atualizar as skills (depois do patch):
```bash
loopx workflow-skills --install --skills-dir "C:/Users/inael-pc/.claude/skills"
loopx slash-commands --install --surface claude-code --claude-home "C:/Users/inael-pc/.claude"
loopx doctor
```

---

## Bugs pra reportar upstream (github.com/huangruiteng/loopx)
1. `workflow_skill_install.py::_exclusive_install_lock` importa `fcntl` incondicionalmente (sem fallback Windows), apesar de `file_lock.py` já tratar `fcntl` ausente via `msvcrt`. Crash em Windows nativo.
2. `default_public_scan_root()` (duplicada em ~6 arquivos de `cli_commands/`) retorna `parents[2]` = `site-packages` inteiro. Em máquinas com muitos pacotes, a privacy scan default trava `status`/`quota`/`ready-score`. Deveria ser o projeto/CWD ou um dir pequeno, com respeito a .gitignore.

## Uso via Claude Code
`/loopx <task>` (skills instaladas). Papel: loopx = control plane (goal/todos/gates/evidência/quota); `tools/gate.mjs` continua o gate de validação; `.specs/` continua a verdade de produto. Não substitui o harness FASE 2 — governa a continuidade acima dele.
