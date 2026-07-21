"use client"

import { Table, TableBody, TableCell, TableHead, TableHeader, TableRow } from "@/components/ui/table"
import type { BrechaItem } from "@/types/evaluacionReportes"

const val = (v: number | null) => (v == null ? "—" : v)

// Brecha positiva alta = se sobrevalora; negativa = se subvalora. Neutro cerca de 0.
function color(b: number | null): string {
  if (b == null) return "text-muted-foreground"
  if (b > 1) return "text-amber-600 font-medium"
  if (b < -1) return "text-sky-600 font-medium"
  return "text-foreground"
}

export function BrechaTable({ items }: { items: BrechaItem[] }) {
  if (items.length === 0) return <p className="text-sm text-muted-foreground">Sin datos.</p>
  return (
    <Table>
      <TableHeader>
        <TableRow>
          <TableHead>Evaluado</TableHead>
          <TableHead>Autoevaluación</TableHead>
          <TableHead>Terceros</TableHead>
          <TableHead>Brecha</TableHead>
        </TableRow>
      </TableHeader>
      <TableBody>
        {items.map((i, idx) => (
          <TableRow key={i.empleado_id ?? `${i.apellido}-${idx}`}>
            <TableCell>{i.apellido} {i.nombre}</TableCell>
            <TableCell>{val(i.auto)}</TableCell>
            <TableCell>{val(i.terceros)}</TableCell>
            <TableCell className={color(i.brecha)}>{val(i.brecha)}</TableCell>
          </TableRow>
        ))}
      </TableBody>
    </Table>
  )
}
