import { auth } from "@/auth";
import { podeAcessar } from "@/lib/auth/rbac";
import PageHeader from "@/components/PageHeader";

export const dynamic = "force-dynamic";

interface LinkExterno {
  titulo: string;
  url: string;
  descricao: string;
  categoria: string;
}

const links: LinkExterno[] = [
  {
    titulo: "Site em producao",
    url: "https://barbearia.itbooster.com.br",
    descricao: "O site que o cliente acessa. Agendar, catalogo e login.",
    categoria: "Producao",
  },
  {
    titulo: "Coolify",
    url: "http://179.198.113.115:8000",
    descricao: "Painel de deploy e containers da VPS. Build, logs, variaveis de ambiente.",
    categoria: "Infra",
  },
  {
    titulo: "Asaas",
    url: "https://www.asaas.com",
    descricao: "Painel de cobranças, assinaturas e notas fiscais. Login: rodrigo.ss1996@hotmail.com",
    categoria: "Pagamentos",
  },
  {
    titulo: "Link de pagamento Asaas",
    url: "https://www.asaas.com/c/m63ocghbjne26k3z",
    descricao: "Carne de R$ 3.400 (10x) da implantacao do sistema.",
    categoria: "Pagamentos",
  },
  {
    titulo: "SimplesZap",
    url: "https://back.simpleszap.com",
    descricao: "API de envio de WhatsApp. Gerencia instancias e mensagens automaticas.",
    categoria: "Integracoes",
  },
  {
    titulo: "Hub IA (LiteLLM)",
    url: "https://litellm.toolpad.cloud",
    descricao: "Gateway de IA que o sistema usa para gerar textos e sugestoes.",
    categoria: "Integracoes",
  },
  {
    titulo: "VPS (SSH)",
    url: "ssh://root@179.198.113.115",
    descricao: "Acesso SSH a VPS. Chave: faith_barbearia_vps. Senha root desabilitada.",
    categoria: "Infra",
  },
  {
    titulo: "Repositorio (GitHub)",
    url: "https://github.com/inael/barbearia",
    descricao: "Codigo-fonte do sistema. Branch principal: master.",
    categoria: "Desenvolvimento",
  },
];

const categoriaOrdem = ["Producao", "Pagamentos", "Integracoes", "Infra", "Desenvolvimento"];

export default async function FerramentasPage() {
  const session = await auth();
  const papel = session?.user?.papel;

  if (!papel || !podeAcessar(papel, "config")) {
    return (
      <main className="min-h-screen bg-neutral-50 text-neutral-900">
        <div className="mx-auto max-w-2xl px-5 py-10">
          <p role="alert" className="text-sm text-neutral-700">Sem acesso a esta pagina.</p>
        </div>
      </main>
    );
  }

  const porCategoria = categoriaOrdem.map((cat) => ({
    categoria: cat,
    itens: links.filter((l) => l.categoria === cat),
  })).filter((g) => g.itens.length > 0);

  return (
    <main className="min-h-screen bg-neutral-50 text-neutral-900">
      <div className="mx-auto max-w-3xl px-5 py-10">
        <PageHeader
          titulo="Ferramentas externas"
          descricao="Atalhos para os paineis e servicos que o sistema usa por fora. Nenhum dado sensivel aqui, so links."
        />

        <div className="mt-6 space-y-8">
          {porCategoria.map(({ categoria, itens }) => (
            <section key={categoria}>
              <h2 className="text-xs font-semibold uppercase tracking-widest text-neutral-500">{categoria}</h2>
              <div className="mt-3 grid gap-3 sm:grid-cols-2">
                {itens.map((link) => (
                  <a
                    key={link.url}
                    href={link.url}
                    target="_blank"
                    rel="noopener noreferrer"
                    className="block rounded-xl border border-neutral-200 bg-white p-4 hover:border-neutral-400 transition-colors"
                  >
                    <h3 className="font-semibold text-sm">{link.titulo}</h3>
                    <p className="mt-1 text-xs text-neutral-500 break-all">{link.url}</p>
                    <p className="mt-2 text-sm text-neutral-600">{link.descricao}</p>
                  </a>
                ))}
              </div>
            </section>
          ))}
        </div>
      </div>
    </main>
  );
}
