# Como usar este template

Este diretório (`tools/catalog/template-projeto/`) é o **modelo de referência** que todo projeto novo IT Booster deve seguir.

## Opção 1 — Copiar arquivos manualmente

```bash
# de dentro do repo novo (vazio ou recém-clonado):
cp -r /caminho/ItBoosterEmpresa/tools/catalog/template-projeto/{.itbooster-meta.yaml,CLAUDE.md,README.md,.env.example,.gitignore} .
# editar .itbooster-meta.yaml (slug/nome/tipo/status reais)
git add . && git commit --author="inael <inael.rodrigues@gmail.com>" -m "chore: bootstrap IT Booster (catalogo+CLAUDE)"
```

## Opção 2 — Repo template no GitHub (próximo passo, manual)

Criar um repo separado `inael/itbooster-project-template` no GitHub, marcar como **template repository** (Settings → Template repository). Aí qualquer projeto novo nasce direto via "Use this template" no GitHub UI.

Conteúdo do repo template = exatamente este diretório.

## Conteúdo

- `.itbooster-meta.yaml` — metadata pro catálogo automático (slug, tipo, stack, integrações)
- `CLAUDE.md` — convenções IT Booster (git author, services.env, status dashboard, garantia)
- `README.md` — boilerplate de descrição
- `.env.example` — variáveis padrão
- `.gitignore` — exclusões comuns

## Manutenção do template

Quando uma convenção IT Booster mudar (ex: novo serviço comum, mudança no fluxo de credenciais), atualizar o template aqui e abrir issue lembrando de propagar nos repos existentes.
