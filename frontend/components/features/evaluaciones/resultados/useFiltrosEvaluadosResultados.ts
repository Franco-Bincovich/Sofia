"use client"

import { useMemo, useState } from "react"

import type { FiltroCampo } from "@/components/ui/FiltersBar"
import type { EvaluadoListadoItem } from "@/types/evaluacionReportes"

// Filtros del listado de evaluados. Datos chicos (~30 filas) → filtra en cliente para el
// display; el export reusa `filtros` como Query server-side (misma lógica que _pasa del backend).
export function useFiltrosEvaluadosResultados(todos: EvaluadoListadoItem[]) {
  const [sector, setSector] = useState("")
  const [perfil, setPerfil] = useState("")
  const [conNota, setConNota] = useState("")

  const sectores = useMemo(
    () => Array.from(new Set(todos.map((e) => e.sector).filter((s): s is string => !!s))),
    [todos],
  )

  const campos: FiltroCampo[] = [
    {
      tipo: "select", label: "Sector", value: sector, onChange: setSector,
      opciones: sectores.map((s) => ({ value: s, label: s })),
    },
    {
      tipo: "select", label: "Perfil", value: perfil, onChange: setPerfil,
      opciones: [{ value: "lider", label: "Líder" }, { value: "general", label: "General" }],
    },
    {
      tipo: "select", label: "Nota final", value: conNota, onChange: setConNota,
      opciones: [{ value: "si", label: "Con nota" }, { value: "no", label: "Sin nota" }],
    },
  ]

  const filtrados = useMemo(
    () => todos.filter((e) =>
      (!sector || e.sector === sector) &&
      (!perfil || e.perfil === perfil) &&
      (!conNota || (conNota === "si") === (e.nota_final != null))),
    [todos, sector, perfil, conNota],
  )

  return { campos, filtrados, filtros: { sector, perfil, con_nota: conNota } }
}
