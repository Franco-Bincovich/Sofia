"use client"

import { Table, TableBody, TableCell, TableHead, TableHeader, TableRow } from "@/components/ui/table"
import type { CompetenciaItem, CompetenciasReporte } from "@/types/evaluacionReportes"

function Tabla({ titulo, n, items }: { titulo: string; n: number; items: CompetenciaItem[] }) {
  return (
    <section>
      <h3 className="mb-2 text-sm font-semibold">
        {titulo} <span className="text-xs font-normal text-muted-foreground">({n} {n === 1 ? "evaluado" : "evaluados"})</span>
      </h3>
      {items.length === 0 ? (
        <p className="text-sm text-muted-foreground">Sin datos.</p>
      ) : (
        <Table>
          <TableHeader>
            <TableRow><TableHead>Competencia</TableHead><TableHead>Promedio</TableHead><TableHead>Notas</TableHead></TableRow>
          </TableHeader>
          <TableBody>
            {items.map((i) => (
              <TableRow key={i.competencia}>
                <TableCell>{i.competencia}</TableCell>
                <TableCell>{i.promedio}</TableCell>
                <TableCell>{i.n}</TableCell>
              </TableRow>
            ))}
          </TableBody>
        </Table>
      )}
    </section>
  )
}

// Dos tablas SEPARADAS: perfil líder y perfil general nunca se mezclan (sets de competencias
// distintos → un ranking único daría un resultado falso). Cada una muestra su n.
export function CompetenciasTables({ data }: { data: CompetenciasReporte }) {
  return (
    <div className="space-y-6">
      <div>
        <h2 className="text-base font-semibold">Competencias</h2>
        <p className="text-xs text-muted-foreground">
          Promedio por competencia, excluyendo autoevaluaciones. Líder y general no se mezclan.
        </p>
      </div>
      <Tabla titulo="Perfil líder" n={data.n_lider} items={data.lider} />
      <Tabla titulo="Perfil general" n={data.n_general} items={data.general} />
    </div>
  )
}
