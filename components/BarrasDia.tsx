import { alturasRelativas, type PontoDia } from "@/lib/inicio";

const brl = (c: number) => (c / 100).toLocaleString("pt-BR", { style: "currency", currency: "BRL" });
const diaCurto = (d: Date) => d.toLocaleDateString("pt-BR", { day: "2-digit", month: "2-digit" });

/**
 * Barras de faturamento por dia, em SVG montado no servidor.
 *
 * Sem biblioteca de gráfico de propósito: são barras simples, e uma dependência
 * mandaria JavaScript para o navegador só para desenhar retângulos. Assim a página
 * abre pronta, inclusive no celular do Rodrigo com internet ruim.
 *
 * Cada barra tem `<title>`, que é o tooltip nativo e também o que o leitor de tela
 * anuncia: o gráfico não pode ser a única forma de saber o número.
 */
export default function BarrasDia({
  serie,
  titulo,
  testId = "grafico-dias",
}: {
  serie: PontoDia[];
  titulo: string;
  testId?: string;
}) {
  const alturas = alturasRelativas(serie.map((p) => p.centavos));
  const vazio = serie.every((p) => p.centavos <= 0);
  const larguraBarra = 100 / Math.max(1, serie.length);
  const melhor = Math.max(0, ...serie.map((p) => p.centavos));

  return (
    <div data-testid={testId}>
      <div className="flex flex-wrap items-baseline justify-between gap-2">
        <span className="text-sm font-semibold">{titulo}</span>
        <span className="text-xs text-neutral-500">melhor dia: {brl(melhor)}</span>
      </div>

      {vazio ? (
        <p className="mt-3 text-sm text-neutral-600 dark:text-neutral-400">
          Nenhuma venda fechada neste período ainda.
        </p>
      ) : (
        <svg
          viewBox="0 0 100 36"
          preserveAspectRatio="none"
          role="img"
          aria-label={titulo}
          className="mt-3 h-24 w-full"
        >
          {serie.map((p, i) => {
            const altura = (alturas[i] / 100) * 32;
            return (
              <rect
                key={p.dia.toISOString()}
                data-dia={diaCurto(p.dia)}
                data-centavos={p.centavos}
                x={i * larguraBarra + larguraBarra * 0.15}
                y={34 - altura}
                width={larguraBarra * 0.7}
                height={Math.max(altura, p.centavos > 0 ? 0.6 : 0)}
                rx={0.6}
                className="fill-emerald-600 dark:fill-emerald-500"
              >
                <title>{`${diaCurto(p.dia)}: ${brl(p.centavos)}`}</title>
              </rect>
            );
          })}
        </svg>
      )}

      <div className="mt-1 flex justify-between text-[10px] text-neutral-500">
        <span>{diaCurto(serie[0]?.dia ?? new Date())}</span>
        <span>hoje</span>
      </div>
    </div>
  );
}
