"use client"

import { useState, useMemo } from "react"
import { useRouter } from "next/navigation"
import { Plus, Search, Users } from "lucide-react"

import { PageHeader } from "@/components/layout/PageHeader"
import { EmptyState } from "@/components/ui/EmptyState"
import { Badge } from "@/components/ui/badge"
import { Button } from "@/components/ui/button"
import { Input } from "@/components/ui/input"
import {
  Table,
  TableBody,
  TableCell,
  TableHead,
  TableHeader,
  TableRow,
} from "@/components/ui/table"

interface Empleado {
  id: string
  nombre: string
  apellido: string
  area: string
  cargo: string
  modalidad: "presencial" | "remoto" | "hibrido"
  estado: "activo" | "baja" | "licencia"
}

const MOCK: Empleado[] = [
  { id: "1", nombre: "Ana",     apellido: "García",    area: "Tecnología",  cargo: "Desarrolladora Senior", modalidad: "hibrido",     estado: "activo"   },
  { id: "2", nombre: "Carlos",  apellido: "López",     area: "Producto",    cargo: "Product Manager",       modalidad: "remoto",      estado: "activo"   },
  { id: "3", nombre: "María",   apellido: "Fernández", area: "Tecnología",  cargo: "UX Designer",           modalidad: "presencial",  estado: "licencia" },
  { id: "4", nombre: "Lucía",   apellido: "Morales",   area: "Finanzas",    cargo: "Analista Contable",     modalidad: "hibrido",     estado: "activo"   },
  { id: "5", nombre: "Martín",  apellido: "Díaz",      area: "RRHH",        cargo: "HR Business Partner",   modalidad: "presencial",  estado: "activo"   },
  { id: "6", nombre: "Sofía",   apellido: "Ruiz",      area: "Ventas",      cargo: "Account Executive",     modalidad: "remoto",      estado: "baja"     },
  { id: "7", nombre: "Diego",   apellido: "Torres",    area: "Tecnología",  cargo: "DevOps Engineer",       modalidad: "remoto",      estado: "activo"   },
]

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

const PAGE_SIZE = 20

export default function EmpleadosPage() {
  const router = useRouter()
  const [search, setSearch] = useState("")
  const [estado, setEstado] = useState("")
  const [page, setPage] = useState(1)

  const filtered = useMemo(() => {
    let rows = MOCK
    if (search.trim()) {
      const q = search.trim().toLowerCase()
      rows = rows.filter(
        (e) => e.nombre.toLowerCase().includes(q) || e.apellido.toLowerCase().includes(q),
      )
    }
    if (estado) {
      rows = rows.filter((e) => e.estado === estado)
    }
    return rows
  }, [search, estado])

  const totalPages = Math.ceil(filtered.length / PAGE_SIZE)
  const visible = filtered.slice((page - 1) * PAGE_SIZE, page * PAGE_SIZE)

  function handleSearch(value: string) {
    setSearch(value)
    setPage(1)
  }

  function handleEstado(value: string) {
    setEstado(value)
    setPage(1)
  }

  return (
    <div>
      <PageHeader
        title="Empleados"
        description={`${filtered.length} colaboradores`}
        action={
          <Button className="min-h-11">
            <Plus />
            Nuevo empleado
          </Button>
        }
      />

      <div className="mb-4 flex flex-col gap-3 sm:flex-row">
        <div className="relative flex-1">
          <Search className="pointer-events-none absolute left-2.5 top-1/2 size-4 -translate-y-1/2 text-muted-foreground" />
          <Input
            placeholder="Buscar por nombre..."
            className="pl-8"
            value={search}
            onChange={(e) => handleSearch(e.target.value)}
          />
        </div>
        <select
          aria-label="Filtrar por estado"
          className="min-h-[2rem] rounded-lg border border-input bg-transparent px-2.5 text-sm text-foreground focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-ring/50"
          value={estado}
          onChange={(e) => handleEstado(e.target.value)}
        >
          <option value="">Todos los estados</option>
          <option value="activo">Activo</option>
          <option value="baja">Baja</option>
          <option value="licencia">Licencia</option>
        </select>
      </div>

      {visible.length === 0 ? (
        <EmptyState
          icon={<Users />}
          title="Sin resultados"
          description="No hay empleados que coincidan con los filtros aplicados."
        />
      ) : (
        <Table>
          <TableHeader>
            <TableRow>
              <TableHead>Nombre</TableHead>
              <TableHead>Área</TableHead>
              <TableHead>Cargo</TableHead>
              <TableHead>Modalidad</TableHead>
              <TableHead>Estado</TableHead>
            </TableRow>
          </TableHeader>
          <TableBody>
            {visible.map((emp) => (
              <TableRow
                key={emp.id}
                className="cursor-pointer"
                onClick={() => router.push(`/empleados/${emp.id}`)}
              >
                <TableCell className="font-medium">
                  {emp.nombre} {emp.apellido}
                </TableCell>
                <TableCell className="text-muted-foreground">{emp.area}</TableCell>
                <TableCell>{emp.cargo}</TableCell>
                <TableCell className="capitalize">{emp.modalidad}</TableCell>
                <TableCell>
                  <Badge variant={ESTADO_VARIANTS[emp.estado]}>
                    {ESTADO_LABELS[emp.estado]}
                  </Badge>
                </TableCell>
              </TableRow>
            ))}
          </TableBody>
        </Table>
      )}

      {totalPages > 1 && (
        <div className="mt-4 flex items-center justify-between text-sm text-muted-foreground">
          <span>Página {page} de {totalPages}</span>
          <div className="flex gap-2">
            <Button
              variant="outline"
              size="sm"
              className="min-h-11"
              disabled={page <= 1}
              onClick={() => setPage((p) => p - 1)}
            >
              Anterior
            </Button>
            <Button
              variant="outline"
              size="sm"
              className="min-h-11"
              disabled={page >= totalPages}
              onClick={() => setPage((p) => p + 1)}
            >
              Siguiente
            </Button>
          </div>
        </div>
      )}
    </div>
  )
}
