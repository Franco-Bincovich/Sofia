"use client"

import { Pencil, Trash2 } from "lucide-react"
import { Badge } from "@/components/ui/badge"
import { Button } from "@/components/ui/button"
import { Table, TableBody, TableCell, TableHead, TableHeader, TableRow } from "@/components/ui/table"
import type { EstadoObjetivo, Objetivo, PrioridadObjetivo } from "@/types/objetivo"

const ESTADO_LABEL:   Record<EstadoObjetivo, string>                              = { por_hacer: "Por hacer", haciendo: "Haciendo", terminado: "Terminado" }
const ESTADO_VARIANT: Record<EstadoObjetivo, "default" | "secondary" | "outline"> = { por_hacer: "outline",   haciendo: "default",  terminado: "secondary" }
const PRIORIDAD_LABEL: Record<PrioridadObjetivo, string>   = { baja: "Baja", media: "Media", alta: "Alta" }
const PRIORIDAD_CLASS: Record<PrioridadObjetivo, string>   = {
  baja:  "border-border bg-transparent text-muted-foreground",
  media: "border-primary/40 bg-primary/10 text-primary",
  alta:  "border-destructive/40 bg-destructive/10 text-destructive",
}

function formatDate(s: string | null) {
  if (!s) return "—"; const [y,m,d] = s.split("-"); return `${d}/${m}/${y}`
}
function isOverdue(fecha: string | null, estado: string) {
  return !(!fecha || estado === "terminado") && fecha < new Date().toISOString().slice(0, 10)
}

interface Props {
  objetivos:  Objetivo[]
  showEmpresa: boolean
  onEdit:     (obj: Objetivo) => void
  onDelete:   (id: string) => void
  deletingId: string | null
}

export function ListView({ objetivos, showEmpresa, onEdit, onDelete, deletingId }: Props) {
  if (objetivos.length === 0) {
    return (
      <div className="rounded-lg border border-dashed border-border p-10 text-center text-sm text-muted-foreground">
        No hay objetivos para los filtros seleccionados.
      </div>
    )
  }

  return (
    <Table>
      <TableHeader>
        <TableRow>
          <TableHead>Título</TableHead>
          <TableHead>Responsable</TableHead>
          <TableHead>Prioridad</TableHead>
          <TableHead>Estado</TableHead>
          {showEmpresa && <TableHead>Empresa</TableHead>}
          <TableHead>Fecha entrega</TableHead>
          <TableHead />
        </TableRow>
      </TableHeader>
      <TableBody>
        {objetivos.map((obj) => {
          const atrasado = isOverdue(obj.fecha_entrega, obj.estado)
          return (
            <TableRow key={obj.id}>
              <TableCell className="font-medium">{obj.titulo}</TableCell>
              <TableCell className="text-muted-foreground">{obj.responsable_nombre ?? "—"}</TableCell>
              <TableCell>
                <span className={`inline-flex items-center rounded-md border px-2 py-0.5 text-xs font-medium ${PRIORIDAD_CLASS[obj.prioridad]}`}>
                  {PRIORIDAD_LABEL[obj.prioridad]}
                </span>
              </TableCell>
              <TableCell>
                <Badge variant={ESTADO_VARIANT[obj.estado]}>{ESTADO_LABEL[obj.estado]}</Badge>
              </TableCell>
              {showEmpresa && <TableCell className="text-muted-foreground">{obj.empresa_nombre ?? "—"}</TableCell>}
              <TableCell className={atrasado ? "font-semibold text-destructive" : "text-muted-foreground"}>
                {formatDate(obj.fecha_entrega)}{atrasado ? " ⚠" : ""}
              </TableCell>
              <TableCell>
                <div className="flex items-center gap-1">
                  <Button variant="ghost" size="sm" onClick={() => onEdit(obj)} aria-label="Editar">
                    <Pencil className="size-3.5" />
                  </Button>
                  <Button variant="ghost" size="sm" className="text-destructive hover:text-destructive" disabled={deletingId === obj.id} onClick={() => onDelete(obj.id)} aria-label="Eliminar">
                    {deletingId === obj.id ? "..." : <Trash2 className="size-3.5" />}
                  </Button>
                </div>
              </TableCell>
            </TableRow>
          )
        })}
      </TableBody>
    </Table>
  )
}
