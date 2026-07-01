"use client"

import { Undo2 } from "lucide-react"

import { Badge } from "@/components/ui/badge"
import { Button } from "@/components/ui/button"
import {
  Table, TableBody, TableCell, TableHead, TableHeader, TableRow,
} from "@/components/ui/table"
import { MODULO_LABEL } from "@/services/periodos"
import type { Periodo } from "@/types/periodo"

interface Props {
  periodos: Periodo[]
  nombreUsuario: (id: string | null) => string
  canWrite: boolean
  onReabrir: (p: Periodo) => void
}

/** Tabla de períodos: módulo, rango, estado, quién/cuándo, y acción de reabrir si está cerrado. */
export function PeriodoList({ periodos, nombreUsuario, canWrite, onReabrir }: Props) {
  return (
    <div className="overflow-x-auto rounded-xl border bg-card">
      <Table>
        <TableHeader>
          <TableRow>
            <TableHead>Módulo</TableHead>
            <TableHead>Desde</TableHead>
            <TableHead>Hasta</TableHead>
            <TableHead>Estado</TableHead>
            <TableHead>Detalle</TableHead>
            {canWrite && <TableHead className="text-right">Acciones</TableHead>}
          </TableRow>
        </TableHeader>
        <TableBody>
          {periodos.map((p) => {
            const cerrado = p.estado === "cerrado"
            return (
              <TableRow key={p.id}>
                <TableCell className="font-medium text-foreground">
                  {p.modulo ? MODULO_LABEL[p.modulo] ?? p.modulo : "Todos los módulos"}
                </TableCell>
                <TableCell className="whitespace-nowrap">{p.desde}</TableCell>
                <TableCell className="whitespace-nowrap">{p.hasta}</TableCell>
                <TableCell>
                  <Badge variant={cerrado ? "default" : "secondary"}>{cerrado ? "Cerrado" : "Reabierto"}</Badge>
                </TableCell>
                <TableCell className="text-xs text-muted-foreground">
                  {cerrado
                    ? `Cerrado por ${nombreUsuario(p.cerrado_por)} el ${p.cerrado_at.slice(0, 10)}`
                    : `Reabierto por ${nombreUsuario(p.reabierto_por)} el ${(p.reabierto_at ?? "").slice(0, 10)}`}
                </TableCell>
                {canWrite && (
                  <TableCell className="text-right">
                    {cerrado && (
                      <Button
                        variant="ghost"
                        className="min-h-11 gap-1.5"
                        onClick={() => onReabrir(p)}
                        aria-label={`Reabrir el período de ${p.desde} a ${p.hasta}`}
                      >
                        <Undo2 className="size-4" /> Reabrir
                      </Button>
                    )}
                  </TableCell>
                )}
              </TableRow>
            )
          })}
        </TableBody>
      </Table>
    </div>
  )
}
