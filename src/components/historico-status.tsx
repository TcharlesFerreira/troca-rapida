import { dataHoraBR } from "@/lib/formatar";
import { ROTULO_STATUS, type StatusOS } from "@/lib/tipos";

interface Item {
  id: string;
  deStatus: StatusOS | null;
  paraStatus: StatusOS;
  em: Date;
  por?: { nome: string } | null;
}

/** Linha do tempo dos status: o que mudou, quando e (para a oficina) quem mudou. */
export function HistoricoStatus({ itens, mostrarAutor = false }: { itens: Item[]; mostrarAutor?: boolean }) {
  if (itens.length === 0) return <p className="text-muted-foreground">Ainda não há mudanças registradas.</p>;
  return (
    <ol className="grid gap-0 border-l-2 border-primary/30 pl-5">
      {itens.map((item) => (
        <li key={item.id} className="relative pb-4 last:pb-0">
          <span aria-hidden className="absolute -left-[1.7rem] top-1.5 size-3 rounded-full border-2 border-primary bg-card" />
          <p className="font-semibold">{ROTULO_STATUS[item.paraStatus]}</p>
          <p className="text-sm text-muted-foreground">
            <time dateTime={new Date(item.em).toISOString()}>{dataHoraBR(item.em)}</time>
            {item.deStatus && <> · antes: {ROTULO_STATUS[item.deStatus]}</>}
            {mostrarAutor && item.por?.nome && <> · por {item.por.nome}</>}
          </p>
        </li>
      ))}
    </ol>
  );
}
