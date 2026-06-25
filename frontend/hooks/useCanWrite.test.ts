// useCanWrite se ejercita como función pura: usePathname y la sesión están mockeados,
// así que no hay dispatcher de React. Llamarlo en bucle es seguro acá (no en componentes).
/* eslint-disable react-hooks/rules-of-hooks */
import { describe, expect, it, vi } from "vitest"

import { puede, seccionDeRuta } from "@/services/permisos"
import type { UserRol } from "@/types/auth"

// usePathname y la sesión se mockean para poder ejercitar el hook como función pura
// (useCanWrite solo compone usePathname + getRol + puede; ningún hook real de React).
let mockPath = "/empleados"
let mockRol: UserRol | null = "admin_rrhh"

vi.mock("next/navigation", () => ({ usePathname: () => mockPath }))
vi.mock("@/services/api", () => ({
  getSession: () => (mockRol ? { user: { rol: mockRol } } : null),
}))

import { useCanWrite } from "@/hooks/useCanWrite"

const ROLES: UserRol[] = ["admin_rrhh", "gerencia_lectura", "mandos_medios"]

describe("puede (espejo backend) — matriz de los 3 roles", () => {
  it("admin_rrhh escribe en cualquier sección", () => {
    expect(puede("admin_rrhh", "empleados", "write")).toBe(true)
    expect(puede("admin_rrhh", "costos", "write")).toBe(true)
    expect(puede("admin_rrhh", "vacaciones", "write")).toBe(true)
  })

  it("gerencia_lectura nunca escribe, siempre lee", () => {
    for (const sec of ["empleados", "vacaciones", "costos"] as const) {
      expect(puede("gerencia_lectura", sec, "write")).toBe(false)
      expect(puede("gerencia_lectura", sec, "read")).toBe(true)
    }
  })

  it("mandos_medios escribe solo en vacaciones y ausencias", () => {
    expect(puede("mandos_medios", "vacaciones", "write")).toBe(true)
    expect(puede("mandos_medios", "ausencias", "write")).toBe(true)
    expect(puede("mandos_medios", "empleados", "write")).toBe(false)
    expect(puede("mandos_medios", "objetivos", "write")).toBe(false)
  })

  it("fail-closed ante rol nulo o desconocido", () => {
    expect(puede(null, "empleados", "read")).toBe(false)
    expect(puede("otro" as UserRol, "empleados", "write")).toBe(false)
  })
})

describe("seccionDeRuta", () => {
  it("mapea el primer segmento a su sección", () => {
    expect(seccionDeRuta("/empleados")).toBe("empleados")
    expect(seccionDeRuta("/empresas/123")).toBe("empresa")
    expect(seccionDeRuta("/inventario")).toBe("inventario")
  })

  it("devuelve null en rutas no gateadas", () => {
    expect(seccionDeRuta("/configuracion")).toBeNull()
    expect(seccionDeRuta("/dashboard")).toBeNull()
    expect(seccionDeRuta("/")).toBeNull()
  })
})

describe("useCanWrite", () => {
  it("sección explícita: respeta la matriz por rol", () => {
    for (const rol of ROLES) {
      mockRol = rol
      expect(useCanWrite("empleados")).toBe(puede(rol, "empleados", "write"))
      expect(useCanWrite("vacaciones")).toBe(puede(rol, "vacaciones", "write"))
    }
  })

  it("sin argumento deriva la sección del pathname", () => {
    mockPath = "/inventario"
    mockRol = "admin_rrhh"
    expect(useCanWrite()).toBe(true)
    mockRol = "gerencia_lectura"
    expect(useCanWrite()).toBe(false)
  })

  it("ruta no gateada → true para cualquier rol", () => {
    mockPath = "/configuracion"
    for (const rol of ROLES) {
      mockRol = rol
      expect(useCanWrite()).toBe(true)
    }
  })

  it("rol nulo → no puede escribir en sección gateada", () => {
    mockRol = null
    expect(useCanWrite("empleados")).toBe(false)
  })
})
