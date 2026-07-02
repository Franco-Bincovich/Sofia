"use client"

import { useCallback, useEffect, useState } from "react"

import { fetchEmpleadosLideres, fetchEmpleadosTodos, type EmpleadoLider } from "@/services/usuarios"

/**
 * Carga los empleados vinculables según el rol elegido: solo líderes (es_lider=true) para
 * mandos_medios, todos los activos para admin/gerencia. Recarga automáticamente cuando cambia
 * el rol o cuando `activo` pasa a true (apertura del modal).
 */
export function useEmpleadosPorRol(activo: boolean, rol: string) {
  const [empleados, setEmpleados] = useState<EmpleadoLider[]>([])
  const [loading, setLoading] = useState(false)
  const [error, setError] = useState(false)

  const reload = useCallback(async () => {
    setLoading(true)
    setError(false)
    try {
      setEmpleados(rol === "mandos_medios" ? await fetchEmpleadosLideres() : await fetchEmpleadosTodos())
    } catch {
      setError(true)
    } finally {
      setLoading(false)
    }
  }, [rol])

  useEffect(() => {
    if (activo) void reload()
  }, [activo, reload])

  return { empleados, loading, error, reload }
}
