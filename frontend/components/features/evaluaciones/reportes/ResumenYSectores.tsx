"use client"

import { Table, TableBody, TableCell, TableHead, TableHeader, TableRow } from "@/components/ui/table"
import type { ResumenCiclo, SectorItem } from "@/types/evaluacionReportes"

const val = (v: number | null) => (v == null ? "—" : v)

function Tarjeta({ label, valor }: { label: string; valor: string | number }) {
  return (
    <div className="rounded-lg border border-border p-3">
      <p className="text-xs text-muted-foreground">{label}</p>
      <p className="text-xl font-semibold">{valor}</p>
    </div>
  )
}

export function ResumenYSectores({ resumen, sectores }: { resumen: ResumenCiclo; sectores: SectorItem[] }) {
  return (
    <div className="space-y-6">
      <div className="grid grid-cols-2 gap-3 sm:grid-cols-3 lg:grid-cols-6">
        <Tarjeta label="Evaluados" valor={resumen.evaluados} />
        <Tarjeta label="Con nota final" valor={resumen.con_nota_final} />
        <Tarjeta label="Promedio" valor={val(resumen.promedio)} />
        <Tarjeta label="Más alta" valor={val(resumen.nota_mas_alta)} />
        <Tarjeta label="Más baja" valor={val(resumen.nota_mas_baja)} />
        <Tarjeta label="Evaluaciones" valor={resumen.evaluaciones} />
      </div>

      <section>
        <h3 className="mb-2 text-sm font-semibold">
          Por sector <span className="text-xs font-normal text-muted-foreground">(solo con nota final)</span>
        </h3>
        {sectores.length === 0 ? (
          <p className="text-sm text-muted-foreground">Sin datos.</p>
        ) : (
          <Table>
            <TableHeader>
              <TableRow>
                <TableHead>Sector</TableHead><TableHead>Evaluados</TableHead>
                <TableHead>Promedio</TableHead><TableHead>Mínima</TableHead><TableHead>Máxima</TableHead>
              </TableRow>
            </TableHeader>
            <TableBody>
              {sectores.map((s) => (
                <TableRow key={s.sector}>
                  <TableCell>{s.sector}</TableCell>
                  <TableCell>{s.evaluados}</TableCell>
                  <TableCell>{s.promedio}</TableCell>
                  <TableCell>{s.minima}</TableCell>
                  <TableCell>{s.maxima}</TableCell>
                </TableRow>
              ))}
            </TableBody>
          </Table>
        )}
      </section>
    </div>
  )
}
