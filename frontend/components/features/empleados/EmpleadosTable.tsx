/**
 * Tabla de empleados, presentacional. Dueña de los estados de carga/error/vacío. Sin fetch
 * ni lógica de negocio: la página le pasa datos y el handler de navegación a la ficha.
 */
import { Users } from "lucide-react"

import { EmptyState } from "@/components/ui/EmptyState"
import { ErrorState } from "@/components/ui/ErrorState"
import { Badge } from "@/components/ui/badge"
import { Skeleton } from "@/components/ui/skeleton"
import {
  Table, TableBody, TableCell, TableHead, TableHeader, TableRow,
} from "@/components/ui/table"
import type { Empleado } from "@/types/empleado"

const ESTADO_LABELS: Record<string, string> = {
  activo: "Activo",
  baja: "Baja",
  licencia: "Licencia",
}

const ESTADO_VARIANTS: Record<string, "default" | "destructive" | "secondary"> = {
  activo: "default",
  baja: "destructive",
  licencia: "secondary",
}

interface EmpleadosTableProps {
  items: Empleado[]
  loading: boolean
  error: boolean
  showEmpresa: boolean
  onRetry: () => void
  onRowClick: (id: string) => void
}

function TableSkeleton() {
  return (
    <div className="space-y-2">
      {Array.from({ length: 8 }).map((_, i) => (
        <Skeleton key={i} className="h-12 w-full rounded-lg" />
      ))}
    </div>
  )
}

export function EmpleadosTable({ items, loading, error, showEmpresa, onRetry, onRowClick }: EmpleadosTableProps) {
  if (loading) return <TableSkeleton />
  if (error) return <ErrorState action={onRetry} />
  if (items.length === 0) {
    return (
      <EmptyState
        icon={<Users />}
        title="Sin resultados"
        description="No hay empleados que coincidan con los filtros aplicados."
      />
    )
  }

  return (
    <Table>
      <TableHeader>
        <TableRow>
          <TableHead>Nombre</TableHead>
          {showEmpresa && <TableHead>Empresa</TableHead>}
          <TableHead>Área</TableHead>
          <TableHead>Roles</TableHead>
          <TableHead>Modalidad</TableHead>
          <TableHead>Estado</TableHead>
        </TableRow>
      </TableHeader>
      <TableBody>
        {items.map((emp) => (
          <TableRow key={emp.id} className="cursor-pointer" onClick={() => onRowClick(emp.id)}>
            <TableCell className="font-medium">{emp.nombre} {emp.apellido}</TableCell>
            {showEmpresa && <TableCell className="text-muted-foreground">{emp.empresa_nombre ?? "—"}</TableCell>}
            <TableCell className="text-muted-foreground">{emp.area_nombre ?? "—"}</TableCell>
            <TableCell>{(emp.roles ?? []).join(", ") || emp.cargo || "—"}</TableCell>
            <TableCell className="capitalize">{emp.modalidad_trabajo}</TableCell>
            <TableCell>
              <Badge variant={ESTADO_VARIANTS[emp.estado] ?? "secondary"}>
                {ESTADO_LABELS[emp.estado] ?? emp.estado}
              </Badge>
            </TableCell>
          </TableRow>
        ))}
      </TableBody>
    </Table>
  )
}
