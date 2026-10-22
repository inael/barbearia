// Linha do tempo do barbeiro no dia ("Minha grade").
//
// Rodrigo (22/10): a grade pedia um serviço antes de mostrar qualquer coisa e só
// listava horários vagos. Ele quer abrir o dia e ver, em ordem, quem está marcado
// (hora, cliente, serviço) e onde sobra espaço. Puro e testável.

export interface ItemLinhaDoTempo {
  tipo: "agendado" | "livre" | "bloqueado";
  /** Minutos desde 00:00 do dia. */
  iniMin: number;
  fimMin: number;
  clienteNome?: string;
  servicoNome?: string;
  motivo?: string | null;
}

interface Faixa {
  inicio: Date;
  fim: Date;
}

const minutos = (dia: Date, d: Date) => Math.round((d.getTime() - dia.getTime()) / 60_000);

export function linhaDoTempo(
  janela: { abreMin: number; fechaMin: number } | null,
  dia: Date,
  agendamentos: (Faixa & { clienteNome: string; servicoNome: string })[],
  bloqueios: (Faixa & { motivo?: string | null })[],
): ItemLinhaDoTempo[] {
  if (!janela) return [];
  const dentro = (ini: number, fim: number): [number, number] | null => {
    const a = Math.max(ini, janela.abreMin);
    const b = Math.min(fim, janela.fechaMin);
    return a < b ? [a, b] : null;
  };

  const ocupados: ItemLinhaDoTempo[] = [];
  for (const a of agendamentos) {
    const f = dentro(minutos(dia, a.inicio), minutos(dia, a.fim));
    if (f) ocupados.push({ tipo: "agendado", iniMin: f[0], fimMin: f[1], clienteNome: a.clienteNome, servicoNome: a.servicoNome });
  }
  for (const b of bloqueios) {
    const f = dentro(minutos(dia, b.inicio), minutos(dia, b.fim));
    if (f) ocupados.push({ tipo: "bloqueado", iniMin: f[0], fimMin: f[1], motivo: b.motivo ?? null });
  }
  ocupados.sort((x, y) => x.iniMin - y.iniMin || x.fimMin - y.fimMin);

  // Livre = o que sobra da janela fora da UNIÃO dos ocupados (encaixe sobrepõe).
  const livres: ItemLinhaDoTempo[] = [];
  let cursor = janela.abreMin;
  for (const o of ocupados) {
    if (o.iniMin > cursor) livres.push({ tipo: "livre", iniMin: cursor, fimMin: o.iniMin });
    cursor = Math.max(cursor, o.fimMin);
  }
  if (cursor < janela.fechaMin) livres.push({ tipo: "livre", iniMin: cursor, fimMin: janela.fechaMin });

  return [...ocupados, ...livres].sort((x, y) => x.iniMin - y.iniMin || x.fimMin - y.fimMin);
}
