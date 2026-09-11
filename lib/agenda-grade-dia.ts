// Grade do dia estilo Trinks: colunas por barbeiro, agendamentos ocupando as linhas.
// Puro e testável.
//
// AHL (áudio do Rodrigo em 2026-09-11): a grade era de 30 em 30 minutos FIXOS, então um
// corte marcado às 10h20 aparecia ocupando a linha das 10h E a das 10h30. Com corte de
// 40 minutos comendo dois lugares, a agenda dele lotava com METADE da capacidade real.
// Isso é perda de faturamento, não incômodo de tela.
//
// A correção não é só diminuir o passo: passo de 5 minutos numa jornada de 12 horas
// daria 144 linhas por barbeiro, trocando um problema por outro. A grade passa a ser
// desenhada por FAIXA: linhas âncora de meia em meia hora para dar referência visual,
// mais uma linha em cada início e cada fim de agendamento. Assim o agendamento ocupa
// exatamente a duração dele e a tela continua curta.

export interface AgendamentoGrade {
  profissionalId: number;
  clienteNome: string;
  servicoNome: string;
  inicio: Date;
  fim: Date;
  /** Opcional: permite abrir a comanda direto da grade (CNA). */
  agendamentoId?: number;
}

export interface CelulaGrade {
  profissionalId: number;
  ocupado: {
    clienteNome: string;
    servicoNome: string;
    comeca: boolean;
    agendamentoId?: number;
  } | null;
}

export interface LinhaGrade {
  slotMin: number;
  /** Fim da faixa (minutos desde 00:00). A linha vale por `fimMin - slotMin` minutos. */
  fimMin: number;
  rotulo: string;
  /** True quando a linha é uma âncora de horário cheio/meia, e não uma quebra de agendamento. */
  ancora: boolean;
  celulas: CelulaGrade[];
}

const rotuloDe = (m: number) =>
  `${String(Math.floor(m / 60)).padStart(2, "0")}:${String(m % 60).padStart(2, "0")}`;

/** Minutos desde 00:00 do dia exibido. Pode passar de 1440 se o agendamento virar o dia. */
function minutosNoDia(dia: Date, quando: Date): number {
  return Math.round((quando.getTime() - dia.getTime()) / 60_000);
}

/**
 * Monta a grade do dia. `dia` deve ser 00:00 local do dia exibido; janela null = fechado.
 * `ancoraMin` é o espaçamento das linhas de referência (não limita o horário do
 * agendamento, que pode cair em qualquer minuto).
 */
export function montarGradeDia(
  janela: { abreMin: number; fechaMin: number } | null,
  dia: Date,
  profissionais: { id: number }[],
  agendamentos: AgendamentoGrade[],
  ancoraMin = 30,
): LinhaGrade[] {
  if (!janela) return [];

  // Cortes da grade: âncoras + início e fim de cada agendamento, tudo dentro da janela.
  const cortes = new Set<number>();
  for (let m = janela.abreMin; m < janela.fechaMin; m += ancoraMin) cortes.add(m);
  cortes.add(janela.fechaMin);

  for (const a of agendamentos) {
    for (const borda of [minutosNoDia(dia, a.inicio), minutosNoDia(dia, a.fim)]) {
      if (borda > janela.abreMin && borda < janela.fechaMin) cortes.add(borda);
    }
  }

  const ordenados = [...cortes].sort((x, y) => x - y);
  const ancoras = new Set<number>();
  for (let m = janela.abreMin; m < janela.fechaMin; m += ancoraMin) ancoras.add(m);

  const linhas: LinhaGrade[] = [];
  for (let i = 0; i < ordenados.length - 1; i++) {
    const ini = ordenados[i];
    const fim = ordenados[i + 1];
    if (fim <= ini) continue;

    const iniMs = dia.getTime() + ini * 60_000;
    const fimMs = dia.getTime() + fim * 60_000;

    const celulas: CelulaGrade[] = profissionais.map((p) => {
      const ag = agendamentos.find(
        (a) => a.profissionalId === p.id && a.inicio.getTime() < fimMs && iniMs < a.fim.getTime(),
      );
      return {
        profissionalId: p.id,
        ocupado: ag
          ? {
              clienteNome: ag.clienteNome,
              servicoNome: ag.servicoNome,
              comeca: ag.inicio.getTime() >= iniMs && ag.inicio.getTime() < fimMs,
              agendamentoId: ag.agendamentoId,
            }
          : null,
      };
    });

    linhas.push({ slotMin: ini, fimMin: fim, rotulo: rotuloDe(ini), ancora: ancoras.has(ini), celulas });
  }
  return linhas;
}
