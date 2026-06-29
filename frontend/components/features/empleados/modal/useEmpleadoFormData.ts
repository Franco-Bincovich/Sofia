"use client"

import { useEffect, useState } from "react"

import { fetchRolesConocidos } from "@/services/empleados"
import { fetchAreas } from "@/services/areas"
import { fetchEmpresas } from "@/services/empresas"
import type { Area } from "@/types/area"
import type { Empresa } from "@/types/empresa"

/**
 * Datos de SOPORTE del modal (no son estado del form, que vive en el orquestador):
 * empresas activas, áreas y el pool de roles para autocompletar. Replica los fetch
 * que vivían inline en EmpleadoModal, con las mismas dependencias y comportamiento.
 */
export function useEmpleadoFormData(open: boolean, isEdit: boolean, empresaId: string) {
  const [empresas, setEmpresas] = useState<Empresa[]>([])
  const [empresasLoading, setEmpresasLoading] = useState(false)
  const [areas, setAreas] = useState<Area[]>([])
  const [areasLoading, setAreasLoading] = useState(false)
  const [rolesSugeridos, setRolesSugeridos] = useState<string[]>([])

  // Pool compartido de roles para autocompletar (se recarga al abrir el modal)
  useEffect(() => {
    if (!open) return
    fetchRolesConocidos().then(setRolesSugeridos).catch(() => setRolesSugeridos([]))
  }, [open])

  // Empresas activas: solo en modo crear; vacío al cerrar o en edición
  useEffect(() => {
    if (!open || isEdit) {
      setEmpresas([])
      return
    }
    setEmpresasLoading(true)
    fetchEmpresas()
      .then((res) => setEmpresas(res.items.filter((e) => e.activa)))
      .catch(() => setEmpresas([]))
      .finally(() => setEmpresasLoading(false))
  }, [open, isEdit])

  // Áreas: todas en edición; filtradas por empresa elegida en creación
  useEffect(() => {
    if (!open) {
      setAreas([])
      return
    }
    if (isEdit) {
      setAreasLoading(true)
      fetchAreas()
        .then(setAreas)
        .catch(() => setAreas([]))
        .finally(() => setAreasLoading(false))
      return
    }
    if (!empresaId) {
      setAreas([])
      return
    }
    setAreasLoading(true)
    fetchAreas(empresaId)
      .then(setAreas)
      .catch(() => setAreas([]))
      .finally(() => setAreasLoading(false))
  }, [open, empresaId, isEdit])

  return { empresas, empresasLoading, areas, areasLoading, rolesSugeridos }
}
