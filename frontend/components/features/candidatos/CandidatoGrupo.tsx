import { Badge } from "@/components/ui/badge"
import { CandidatoRow } from "@/components/features/candidatos/CandidatoRow"
import type { CandidatoConGrupo, GrupoCandidatos } from "@/types/candidato"

interface Props {
  grupo: GrupoCandidatos
  onSelect: (candidato: CandidatoConGrupo) => void
}

/** Card de un grupo (búsqueda): título + badge de estado + sus candidatos. */
export function CandidatoGrupo({ grupo, onSelect }: Props) {
  return (
    <section className="mb-6 rounded-xl border bg-card p-4 md:p-6">
      <div className="mb-4 flex flex-wrap items-center gap-2">
        <h2 className="text-base font-semibold text-foreground">{grupo.nombre}</h2>
        {grupo.activa ? (
          <Badge variant="outline">Activa</Badge>
        ) : (
          <Badge variant="secondary">Búsqueda cerrada</Badge>
        )}
        <span className="text-sm text-muted-foreground">
          {grupo.candidatos.length} candidato{grupo.candidatos.length !== 1 ? "s" : ""}
        </span>
      </div>
      <div className="space-y-2">
        {grupo.candidatos.map((c) => (
          <CandidatoRow key={c.id} candidato={c} onSelect={() => onSelect(c)} />
        ))}
      </div>
    </section>
  )
}
