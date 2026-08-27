// GRD2 (RF5, áudios 01/03): grade do dia estilo Trinks — colunas por barbeiro,
// linhas por passo de 30min, com os agendamentos ocupando os slots. Puro e testável.

export interface AgendamentoGrade {
  profissionalId: number;
  clienteNome: string;
  servicoNome: string;
  inicio: Date;
  fim: Date;
}

export interface CelulaGrade {
  profissionalId: number;
  ocupado: { clienteNome: string; servicoNome: string; comeca: boolean } | null;
}

export interface LinhaGrade {
  slotMin: number;
  rotulo: string;
  celulas: CelulaGrade[];
}

/** Monta a grade do dia. `dia` deve ser 00:00 local do dia exibido; janela null = fechado. */
export function montarGradeDia(
  janela: { abreMin: number; fechaMin: number } | null,
  dia: Date,
  profissionais: { id: number }[],
  agendamentos: AgendamentoGrade[],
  passoMin = 30,
): LinhaGrade[] {
  if (!janela) return [];
  const linhas: LinhaGrade[] = [];
  for (let m = janela.abreMin; m < janela.fechaMin; m += passoMin) {
    const slotIni = dia.getTime() + m * 60_000;
    const slotFim = slotIni + passoMin * 60_000;
    const rotulo = `${String(Math.floor(m / 60)).padStart(2, "0")}:${String(m % 60).padStart(2, "0")}`;
    const celulas: CelulaGrade[] = profissionais.map((p) => {
      const ag = agendamentos.find(
        (a) => a.profissionalId === p.id && a.inicio.getTime() < slotFim && slotIni < a.fim.getTime(),
      );
      return {
        profissionalId: p.id,
        ocupado: ag
          ? {
              clienteNome: ag.clienteNome,
              servicoNome: ag.servicoNome,
              comeca: ag.inicio.getTime() >= slotIni && ag.inicio.getTime() < slotFim,
            }
          : null,
      };
    });
    linhas.push({ slotMin: m, rotulo, celulas });
  }
  return linhas;
}
