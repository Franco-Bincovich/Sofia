"use client"

import { useEffect } from "react"
import { usePathname, useRouter } from "next/navigation"

import { clearSession, getSession } from "@/services/api"
import { primeraRutaPermitida, puede, seccionDeRuta } from "@/services/permisos"

/**
 * Guard de cliente para el dashboard. Solo UX — el backend es la autoridad (403).
 * Sin sesión → /login. Con sesión pero sin permiso de lectura sobre la sección de la
 * ruta actual → primera ruta que el rol sí puede leer (dashboard para admin/gerencia).
 * Si el rol no puede leer ninguna sección → /login con la sesión limpiada (fail-closed).
 * Las rutas no gateadas (dashboard, configuración) pasan siempre.
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
