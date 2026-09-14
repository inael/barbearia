import Link from "next/link";
import BarrasDia from "./BarrasDia";
import {
  variacao,
  type PainelBarbeiro,
  type PainelDono,
  type PainelRecepcao,
  type ResumoAgenda,
} from "@/lib/inicio";
import { FORMAS_ATUAIS, ROTULO_PAGAMENTO } from "@/lib/caixa";

const brl = (c: number) => (c / 100).toLocaleString("pt-BR", { style: "currency", currency: "BRL" });
const brlReais = (v: number) => v.toLocaleString("pt-BR", { style: "currency", currency: "BRL" });
const hora = (d: Date) => d.toLocaleTimeString("pt-BR", { hour: "2-digit", minute: "2-digit" });

const cartao = "rounded-xl border border-neutral-200 bg-white p-4 dark:border-neutral-800 dark:bg-neutral-900";
const atalho =
  "rounded-lg bg-emerald-700 px-3 py-2 text-sm font-semibold text-white hover:bg-emerald-800";
const atalhoFraco =
  "rounded-lg border border-neutral-300 px-3 py-2 text-sm font-medium text-neutral-800 hover:bg-neutral-100 dark:border-neutral-700 dark:text-neutral-200 dark:hover:bg-neutral-800";

function Numero({ rotulo, valor, nota, testId }: { rotulo: string; valor: string; nota?: string; testId: string }) {
  return (
    <div className={cartao}>
      <div className="text-xs text-neutral-600 dark:text-neutral-400">{rotulo}</div>
      <div className="mt-1 text-2xl font-bold" data-testid={testId}>
        {valor}
      </div>
      {nota ? <div className="mt-1 text-xs text-neutral-500">{nota}</div> : null}
    </div>
  );
}

/** Próximos horários. Serve aos três papéis, mudando só o que aparece em cada linha. */
function Proximos({ agenda, mostrarBarbeiro }: { agenda: ResumoAgenda; mostrarBarbeiro: boolean }) {
  return (
    <div className={cartao} data-testid="inicio-proximos">
      <div className="flex flex-wrap items-baseline justify-between gap-2">
        <span className="text-sm font-semibold">Próximos horários de hoje</span>
        <span className="text-xs text-neutral-500">
          {agenda.atendidos} atendido(s) · {agenda.faltas} falta(s) · {agenda.restantes} a vir
        </span>
      </div>
      {agenda.proximos.length === 0 ? (
        <p className="mt-2 text-sm text-neutral-600 dark:text-neutral-400">
          {agenda.total === 0 ? "Nenhum horário marcado para hoje." : "Todos os horários de hoje já passaram."}
        </p>
      ) : (
        <ul className="mt-3 flex flex-col gap-2">
          {agenda.proximos.map((a) => (
            <li key={a.id} data-proximo={a.clienteNome} className="flex flex-wrap items-center gap-3 text-sm">
              <span className="w-14 font-semibold tabular-nums">{hora(a.inicio)}</span>
              <span className="min-w-0 flex-1 truncate font-medium">{a.clienteNome}</span>
              <span className="truncate text-neutral-600 dark:text-neutral-400">{a.servicoNome}</span>
              {mostrarBarbeiro ? <span className="text-xs text-neutral-500">{a.profissionalNome}</span> : null}
            </li>
          ))}
        </ul>
      )}
    </div>
  );
}

export function PainelDonoResumo({ d }: { d: PainelDono }) {
  const v = variacao(d.hojeCentavos, d.ontemCentavos);
  return (
    <section className="flex flex-col gap-4" data-testid="inicio-dono">
      {d.alertas.length > 0 ? (
        <div
          data-testid="inicio-alertas"
          className="rounded-xl border border-amber-300 bg-amber-50 p-4 text-sm dark:border-amber-900 dark:bg-amber-950/30"
        >
          <span className="font-semibold">Precisa da sua atenção</span>
          <ul className="mt-2 flex list-disc flex-col gap-1 pl-5">
            {d.alertas.map((a) => (
              <li key={a}>{a}</li>
            ))}
          </ul>
        </div>
      ) : null}

      <div className="grid grid-cols-2 gap-4 sm:grid-cols-4">
        <Numero
          rotulo="Faturamento hoje"
          valor={brl(d.hojeCentavos)}
          nota={v === null ? "sem venda ontem para comparar" : `${v >= 0 ? "+" : ""}${v}% vs ontem`}
          testId="ini-hoje"
        />
        <Numero rotulo="No mês" valor={brl(d.mesCentavos)} testId="ini-mes" />
        <Numero
          rotulo="Agenda de hoje"
          valor={String(d.agenda.total)}
          nota={`${d.agenda.restantes} ainda por atender`}
          testId="ini-agenda"
        />
        <Numero
          rotulo="Assinaturas no mês"
          valor={String(d.assinaturasAtendimentos)}
          nota={`pote de ${brlReais(d.poteReais)}`}
          testId="ini-assinaturas"
        />
      </div>

      <div className={cartao}>
        <BarrasDia serie={d.serie} titulo="Faturamento dos últimos 14 dias" />
      </div>

      <div className={cartao} data-testid="inicio-por-barbeiro">
        <span className="text-sm font-semibold">Hoje, por barbeiro</span>
        {d.porProfissionalHoje.length === 0 ? (
          <p className="mt-2 text-sm text-neutral-600 dark:text-neutral-400">Nenhuma venda fechada hoje.</p>
        ) : (
          <ul className="mt-3 flex flex-col gap-1">
            {d.porProfissionalHoje.map((p) => (
              <li key={p.nome} data-barbeiro-hoje={p.nome} className="flex items-center gap-3 text-sm">
                <span className="w-28 truncate font-medium">{p.nome}</span>
                <span className="ml-auto font-semibold">{brl(p.centavos)}</span>
              </li>
            ))}
          </ul>
        )}
      </div>

      <Proximos agenda={d.agenda} mostrarBarbeiro />

      <div className="flex flex-wrap gap-2" data-testid="inicio-atalhos">
        <Link href="/painel" className={atalho}>Painel completo</Link>
        <Link href="/caixa" className={atalhoFraco}>Caixa</Link>
        <Link href="/agenda" className={atalhoFraco}>Agenda</Link>
        <Link href="/pote" className={atalhoFraco}>Pote das assinaturas</Link>
        <Link href="/configuracoes" className={atalhoFraco}>Configurações</Link>
      </div>
    </section>
  );
}

export function PainelRecepcaoResumo({ d }: { d: PainelRecepcao }) {
  return (
    <section className="flex flex-col gap-4" data-testid="inicio-recepcao">
      {d.produtosZerados.length > 0 ? (
        <div
          data-testid="inicio-alertas"
          className="rounded-xl border border-amber-300 bg-amber-50 p-4 text-sm dark:border-amber-900 dark:bg-amber-950/30"
        >
          <span className="font-semibold">Estoque zerado</span>
          <p className="mt-1">{d.produtosZerados.map((p) => p.nome).join(", ")}</p>
        </div>
      ) : null}

      <div className="grid grid-cols-2 gap-4 sm:grid-cols-4">
        <Numero
          rotulo="Agenda de hoje"
          valor={String(d.agenda.total)}
          nota={`${d.agenda.restantes} ainda por atender`}
          testId="ini-agenda"
        />
        <Numero rotulo="Comandas abertas" valor={String(d.comandasAbertas)} testId="ini-abertas" />
        <Numero rotulo="Caixa de hoje" valor={brl(d.caixa.totalCentavos)} testId="ini-caixa" />
        <Numero rotulo="Faltas hoje" valor={String(d.agenda.faltas)} testId="ini-faltas" />
      </div>

      {/* CXP: e por aqui que ela confere maquininha, Pix e gaveta no fim do dia */}
      <div className={cartao} data-testid="inicio-formas">
        <span className="text-sm font-semibold">Entrou hoje, por forma</span>
        <ul className="mt-3 grid grid-cols-2 gap-2 sm:grid-cols-4">
          {FORMAS_ATUAIS.map((f) => (
            <li key={f} data-forma-inicio={f} className="rounded-lg border border-neutral-200 p-2 dark:border-neutral-800">
              <div className="text-xs text-neutral-600 dark:text-neutral-400">{ROTULO_PAGAMENTO[f]}</div>
              <div className="text-sm font-bold">{brl(d.caixa.porForma[f])}</div>
              <div className="text-[11px] text-neutral-500">{d.caixa.quantidadePorForma[f]} venda(s)</div>
            </li>
          ))}
        </ul>
      </div>

      <Proximos agenda={d.agenda} mostrarBarbeiro />

      <div className="flex flex-wrap gap-2" data-testid="inicio-atalhos">
        <Link href="/caixa" className={atalho}>Abrir comanda</Link>
        <Link href="/agenda" className={atalhoFraco}>Marcar horário</Link>
        <Link href="/cadastros/clientes" className={atalhoFraco}>Novo cliente</Link>
        <Link href="/vales" className={atalhoFraco}>Vales</Link>
        <Link href="/estoque" className={atalhoFraco}>Estoque</Link>
      </div>
    </section>
  );
}

export function PainelBarbeiroResumo({ d }: { d: PainelBarbeiro }) {
  const meta =
    d.mes.tipoAlvo === null
      ? "sem meta definida"
      : d.mes.batido
        ? "meta batida"
        : d.mes.tipoAlvo === "quantidade"
          ? `meta: ${d.mes.alvoQuantidade} atendimentos`
          : `meta: ${brl(d.mes.alvoCentavos ?? 0)}`;

  return (
    <section className="flex flex-col gap-4" data-testid="inicio-barbeiro">
      <div className="grid grid-cols-2 gap-4 sm:grid-cols-4">
        <Numero
          rotulo="Meus horários hoje"
          valor={String(d.agenda.total)}
          nota={`${d.agenda.restantes} ainda por atender`}
          testId="ini-agenda"
        />
        <Numero
          rotulo="Meu faturamento no mês"
          valor={brl(d.mes.faturamentoCentavos)}
          nota={`${d.mes.atendimentos} atendimento(s)`}
          testId="ini-meu-faturamento"
        />
        <Numero
          rotulo="Minha comissão no mês"
          valor={brlReais(d.mes.comissaoTotalReais)}
          nota={meta}
          testId="ini-minha-comissao"
        />
        <Numero
          rotulo="Meus vales no mês"
          valor={brl(d.mes.valesCentavos)}
          nota="sai do acerto"
          testId="ini-meus-vales"
        />
      </div>

      <div className={cartao} data-testid="inicio-meu-pote">
        <span className="text-sm font-semibold">Minha fatia do pote (mês)</span>
        <div className="mt-1 text-2xl font-bold" data-testid="ini-meu-pote">{brlReais(d.poteReais)}</div>
        <p className="mt-1 text-xs text-neutral-500">
          {d.assinantesAtendidos} assinante(s) atendido(s). O pote é dividido pelos pontos de cada barbeiro.
        </p>
      </div>

      {/* sem nome de colega e sem numero da casa: o barbeiro so ve o que e dele */}
      <Proximos agenda={d.agenda} mostrarBarbeiro={false} />

      <div className="flex flex-wrap gap-2" data-testid="inicio-atalhos">
        <Link href="/minha-agenda/grade" className={atalho}>Minha grade</Link>
        <Link href="/comissao" className={atalhoFraco}>Minha comissão</Link>
        <Link href="/pote" className={atalhoFraco}>Meu pote</Link>
        <Link href="/minha-agenda/bloqueios" className={atalhoFraco}>Meus bloqueios</Link>
      </div>
    </section>
  );
}
