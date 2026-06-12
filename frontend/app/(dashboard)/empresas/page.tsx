"use client"

import { useState, useEffect } from "react"
import Link from "next/link"
import { Building2, Pencil, Plus, Power, PowerOff } from "lucide-react"
import { toast } from "sonner"

import { PageHeader } from "@/components/layout/PageHeader"
import { EmptyState } from "@/components/ui/EmptyState"
import { ErrorState } from "@/components/ui/ErrorState"
import { Skeleton } from "@/components/ui/skeleton"
import { Button } from "@/components/ui/button"
import { Badge } from "@/components/ui/badge"
import {
  Table,
  TableBody,
  TableCell,
  TableHead,
  TableHeader,
  TableRow,
} from "@/components/ui/table"
import { EmpresaModal } from "@/components/features/empresas/EmpresaModal"
import { fetchEmpresas, toggleEmpresaActiva } from "@/services/empresas"
import type { Empresa } from "@/types/empresa"

export default function EmpresasPage() {
  const [empresas, setEmpresas] = useState<Empresa[]>([])
  const [loading, setLoading] = useState(true)
  const [error, setError] = useState(false)
  const [modalOpen, setModalOpen] = useState(false)
  const [editing, setEditing] = useState<Empresa | undefined>(undefined)
  const [togglingId, setTogglingId] = useState<string | null>(null)

  async function load() {
    setLoading(true)
    setError(false)
    try {
      const data = await fetchEmpresas()
      setEmpresas(data.items)
    } catch {
      setError(true)
    } finally {
      setLoading(false)
    }
  }

  useEffect(() => { void load() }, [])

  function openCreate() {
    setEditing(undefined)
    setModalOpen(true)
  }

  function openEdit(empresa: Empresa) {
    setEditing(empresa)
    setModalOpen(true)
  }

  async function handleToggle(empresa: Empresa) {
    setTogglingId(empresa.id)
    try {
      await toggleEmpresaActiva(empresa.id, !empresa.activa)
      void load()
    } catch {
      toast.error("No se pudo cambiar el estado de la empresa. Intentá de nuevo.")
    } finally {
      setTogglingId(null)
    }
  }

  if (loading) {
    return (
      <div>
        <PageHeader title="Empresas" description="Cargando..." />
        <div className="space-y-2">
          {Array.from({ length: 4 }).map((_, i) => (
            <Skeleton key={i} className="h-12 w-full rounded-lg" />
          ))}
        </div>
      </div>
    )
  }

  if (error) {
    return (
      <div>
        <PageHeader title="Empresas" />
        <ErrorState description="No se pudieron cargar las empresas." action={load} />
      </div>
    )
  }

  return (
    <div>
      <PageHeader
        title="Empresas"
        description={`${empresas.length} empresa${empresas.length !== 1 ? "s" : ""}`}
        action={
          <Button className="min-h-11" onClick={openCreate}>
            <Plus />
            Nueva empresa
          </Button>
        }
      />

      {empresas.length === 0 ? (
        <EmptyState
          icon={<Building2 />}
          title="Sin empresas"
          description="Todavía no hay empresas registradas. Creá la primera."
          action={
            <Button className="min-h-11" onClick={openCreate}>
              <Plus />
              Nueva empresa
            </Button>
          }
        />
      ) : (
        <Table>
          <TableHeader>
            <TableRow>
              <TableHead>Nombre</TableHead>
              <TableHead>CUIT</TableHead>
              <TableHead>Email</TableHead>
              <TableHead>Estado</TableHead>
              <TableHead className="w-28 text-right">Acciones</TableHead>
            </TableRow>
          </TableHeader>
          <TableBody>
            {empresas.map((empresa) => (
              <TableRow key={empresa.id}>
                <TableCell className="font-medium">
                  <Link
                    href={`/empresas/${empresa.id}`}
                    className="hover:underline hover:text-primary"
                  >
                    {empresa.nombre}
                  </Link>
                </TableCell>
                <TableCell className="font-mono text-sm text-muted-foreground">
                  {empresa.cuit ?? (
                    <span className="italic text-muted-foreground/60">—</span>
                  )}
                </TableCell>
                <TableCell className="text-muted-foreground">
                  {empresa.email ?? (
                    <span className="italic text-muted-foreground/60">—</span>
                  )}
                </TableCell>
                <TableCell>
                  <Badge variant={empresa.activa ? "default" : "secondary"}>
                    {empresa.activa ? "Activa" : "Inactiva"}
                  </Badge>
                </TableCell>
                <TableCell className="text-right">
                  <div className="flex justify-end gap-1">
                    <Button
                      variant="ghost"
                      size="icon"
                      className="size-9"
                      aria-label={`Editar ${empresa.nombre}`}
                      onClick={() => openEdit(empresa)}
                    >
                      <Pencil className="size-4" />
                    </Button>
                    <Button
                      variant="ghost"
                      size="icon"
                      className="size-9"
                      aria-label={empresa.activa ? `Desactivar ${empresa.nombre}` : `Activar ${empresa.nombre}`}
                      onClick={() => handleToggle(empresa)}
                      disabled={togglingId === empresa.id}
                    >
                      {empresa.activa
                        ? <PowerOff className="size-4" />
                        : <Power className="size-4" />}
                    </Button>
                  </div>
                </TableCell>
              </TableRow>
            ))}
          </TableBody>
        </Table>
      )}

      <EmpresaModal
        open={modalOpen}
        onClose={() => setModalOpen(false)}
        onSuccess={() => { setModalOpen(false); void load() }}
        empresa={editing}
      />
    </div>
  )
}
