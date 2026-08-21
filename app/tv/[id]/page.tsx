import { getDb } from "@/lib/db";
import { listarTelas, listarItens } from "@/lib/tv";
import TvPlayer from "@/components/TvPlayer";

export const dynamic = "force-dynamic";

export default async function TvPlayerPage({ params }: { params: Promise<{ id: string }> }) {
  const { id } = await params;
  const telaId = Number(id);
  const db = getDb();
  const tela = (await listarTelas(db)).find((t) => t.id === telaId);
  if (!tela) {
    return (
      <main className="flex h-screen w-screen items-center justify-center bg-black text-neutral-400">
        Tela não encontrada.
      </main>
    );
  }
  const itens = await listarItens(db, telaId);
  return <TvPlayer items={itens.map((i) => i.url)} velocidadeSegundos={tela.velocidadeSegundos} />;
}
