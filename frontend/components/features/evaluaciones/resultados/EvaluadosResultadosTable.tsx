"use client"

import { ClipboardList } from "lucide-react"

import { Badge } from "@/components/ui/badge"
import { Button } from "@/components/ui/button"
import { EmptyState } from "@/components/ui/EmptyState"
import { Table, TableBody, TableCell, TableHead, TableHeader, TableRow } from "@/components/ui/table"
import type { EvaluadoListadoItem } from "@/types/evaluacionReportes"

interface Props {
  items: EvaluadoListadoItem[]
  onFicha: (id: string) => void
}

export function EvaluadosResultadosTable({ items, onFicha }: Props) {
  if (items.length === 0) {
    return <EmptyState icon={<ClipboardList />} title="Sin evaluados" description="No hay evaluados para este filtro." />
  }
  return (
    <Table>
      <TableHeader>
        <TableRow>
          <TableHead>Evaluado</TableHead><TableHead>Sector</TableHead><TableHead>Superior</TableHead>
          <TableHead>Evaluadores</TableHead><TableHead>Nota final</TableHead><TableHead />
        </TableRow>
      </TableHeader>
      <TableBody>
        {items.map((e) => (
          <TableRow key={e.id}>
            <TableCell>
              {e.apellido} {e.nombre}
              {!e.asignado && <Badge variant="outline" className="ml-2">Sin asignar</Badge>}
            </TableCell>
            <TableCell>{e.sector ?? "—"}</TableCell>
            <TableCell>{e.superior ?? "—"}</TableCell>
            <TableCell className="text-xs text-muted-foreground">{e.tipos.join(", ") || "—"}</TableCell>
            <TableCell>
              {e.nota_final != null ? e.nota_final : <span className="text-muted-foreground">Sin nota</span>}
            </TableCell>
            <TableCell>
              <Button variant="ghost" size="sm" onClick={() => onFicha(e.id)}>Ver ficha</Button>
            </TableCell>
          </TableRow>
        ))}
      </TableBody>
    </Table>
  )
}
