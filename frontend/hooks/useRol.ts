import { useEffect, useState } from "react"

import { getRol } from "@/services/permisos"
import type { UserRol } from "@/types/auth"

/**
 * Rol del usuario, resuelto DESPUÉS de montar. getRol() lee de localStorage (inexistente
 * en SSR), así que llamarlo en el render causa hydration mismatch. Este hook devuelve null
 * en el server y en el primer render del client — ambos coinciden — y el rol real tras el
 * mount. Mismo patrón que Sidebar/AuthGuard. `null` = "todavía no montó" (mostrar loading).
 */
export function useRol(): UserRol | null {
  const [rol, setRol] = useState<UserRol | null>(null)
  useEffect(() => { setRol(getRol()) }, [])
  return rol
}
