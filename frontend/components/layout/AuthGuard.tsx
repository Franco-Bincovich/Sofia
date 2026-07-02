"use client"

import { useEffect } from "react"
import { usePathname, useRouter } from "next/navigation"

import { clearSession, getSession } from "@/services/api"
import { primeraRutaPermitida, puede, seccionDeRuta } from "@/services/permisos"

/**
 * Guard de cliente para el dashboard. Solo UX — el backend es la autoridad (403).
 * Sin sesión → /login. Con contraseña temporal pendiente (`must_change_password`) →
 * /cambiar-password (bloquea todo el dashboard hasta cambiarla). Con sesión pero sin
 * permiso de lectura sobre la sección de la ruta actual → primera ruta que el rol sí
 * puede leer (dashboard para admin/gerencia). Si el rol no puede leer ninguna sección →
 * /login con la sesión limpiada (fail-closed). Rutas no gateadas (dashboard, config) pasan.
 */
export function AuthGuard({ children }: { children: React.ReactNode }) {
  const router = useRouter()
  const pathname = usePathname()

  useEffect(() => {
    const session = getSession()
    if (!session) {
      router.replace("/login")
      return
    }
    // Cambio de contraseña forzado: tiene prioridad sobre el gating por sección.
    if (session.user.must_change_password) {
      router.replace("/cambiar-password")
      return
    }
    const seccion = seccionDeRuta(pathname)
    if (seccion && !puede(session.user.rol, seccion, "read")) {
      const destino = primeraRutaPermitida(session.user.rol)
      if (destino) {
        router.replace(destino)
      } else {
        clearSession()
        router.replace("/login")
      }
    }
  }, [router, pathname])

  return <>{children}</>
}
