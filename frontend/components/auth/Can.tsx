import { getRol, puede, type Accion, type Seccion } from "@/services/permisos"

interface CanProps {
  seccion: Seccion
  accion?: Accion
  children: React.ReactNode
}

/**
 * Renderiza children solo si el rol actual puede ejecutar (seccion, accion).
 * UX: oculta lo que el rol no puede usar. NO es seguridad (el backend da 403).
 * Por defecto gatea escritura, el caso de uso de 16.6.
 */
export function Can({ seccion, accion = "write", children }: CanProps) {
  return puede(getRol(), seccion, accion) ? <>{children}</> : null
}
