# Feedback UX do Inael — 2026-08-26 (review do app em prod)

Veredito: "não está com cara de sistema, está parecendo protótipo". Referência visual:
SaaS com **sidebar escura à esquerda** (grupos + submenus) e **conteúdo claro** (estilo
Untitled UI / screenshot enviado no chat).

## Punch list (por tela)

1. **Shell**: menu lateral escuro à esquerda com grupos (menus principais + submenus),
   centro claro. Hoje é uma navbar horizontal de links soltos.
2. **Onboarding**: ao logar, tela autoexplicativa mostrando onde faz as coisas, o que
   fazer primeiro, onde cadastra.
3. **Catálogo `/` ("Painel")**: sem texto explicando o que é/pra que serve; serviços
   sem filtro, sem interação.
4. **Comissão (simulador)**: dá pra alterar mas não tem botão salvar → confuso; conta
   separada em quadros sem agrupamento claro. Reagrupar e deixar explícito que é
   simulação (ou onde configura de verdade).
5. **Agenda**: vazia, só títulos; deveria ter CTA de cadastrar cliente antes
   (empty state com botão).
6. **Caixa**: "abrir comanda, balcão" sem nenhuma explicação/interrogação ensinando o
   que é a tela e como usa.
7. **Painel do dono**: ranking fixo em 30 dias → precisa filtro de período
   (semana/mês/semestre...).
8. **Metas**: só em R$; deveria aceitar também quantidade de atendimentos.
9. **Estoque**: unidade é texto livre → select com unidades pré-configuradas
   (un, ml, L, g, kg, cx, pct...).
10. **Planos (assinaturas)**: deveriam vir pré-configurados conforme os áudios do
    Rodrigo (RF25/RF28: Flex ter-qui 10%/5%, Premium todo dia 20%/10%).
11. **Pote de assinaturas**: tela não explica o que é; explicar conforme o modelo dos
    áudios (RF29: 60% barbearia, 40% dividido por pontos).
12. **TV**: pergunta "URL da propaganda" sem explicar; como envia imagem/vídeo/link do
    YouTube? Como funciona o link que abre na TV? Explicar na tela.

## Encaminhamento
Spec TLC `\.specs/features/ux-shell-v2.md` (UXS). Onda 1 = shell + onboarding +
explicações + filtros/fixes de tela. Onda 2 = metas por quantidade + planos seed.
