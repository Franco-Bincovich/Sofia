import { usePathname } from "next/navigation"

import { getRol, puede, seccionDeRuta, type Seccion } from "@/services/permisos"

/**
 * UX: ¿el rol actual puede escribir en esta sección? Solo para ocultar entry points
 * de escritura (no es control de seguridad — el backend responde 403).
 *
 * Sin argumento deriva la sección del pathname; las rutas no gateadas devuelven true
 * (no se ocultan acciones). Con `seccion` explícita la usa tal cual (para componentes
 * que no conocen su ruta, p. ej. el tab de áreas dentro de /empresas/[id]).
 */
export function useCanWrite(seccion?: Seccion): boolean {
  const pathname = usePathname()
  const sec = seccion ?? seccionDeRuta(pathname)
  return sec ? puede(getRol(), sec, "write") : true
}
