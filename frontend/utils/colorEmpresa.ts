/**
 * Paleta de colores por empresa.
 * Se asigna por índice de orden alfabético de la empresa en la lista provista por el backend.
 * 100% frontend — no requiere cambios al backend.
 */
export interface EmpresaColor {
  bg: string
  text: string
  dot: string
}

const PALETA: EmpresaColor[] = [
  { bg: "#E1F5EE", text: "#0F6E56", dot: "#1D9E75" },  // teal
  { bg: "#E6F1FB", text: "#0C447C", dot: "#378ADD" },  // blue
  { bg: "#EEEDFE", text: "#3C3489", dot: "#7F77DD" },  // purple
  { bg: "#FEF3E2", text: "#854F0B", dot: "#EF9F27" },  // amber
  { bg: "#FDE8E8", text: "#8B1D1D", dot: "#E05252" },  // red
  { bg: "#E8F5E9", text: "#1B5E20", dot: "#4CAF50" },  // green
  { bg: "#F3E5F5", text: "#4A148C", dot: "#9C27B0" },  // deep purple
  { bg: "#E8EAF6", text: "#1A237E", dot: "#3F51B5" },  // indigo
]

/** Color para el tag "N proy." (empleado en más de un proyecto). */
export const MULTI_PROY = { bg: "#FAEEDA", text: "#854F0B" }

export function colorByEmpresa(empresaId: string, empresasOrdenadas: string[]): EmpresaColor {
  const idx = empresasOrdenadas.indexOf(empresaId)
  return PALETA[(idx < 0 ? 0 : idx) % PALETA.length]
}

export function initials(nombre: string, apellido: string): string {
  return `${nombre[0] ?? ""}${apellido[0] ?? ""}`.toUpperCase()
}

/** CSS del árbol jerárquico con conectores en T. Usar en un <style> tag dentro del componente. */
export const ORG_TREE_CSS = `
.org-tree>ul{padding-top:0}
.org-tree ul{position:relative;padding-top:26px;display:flex;justify-content:center}
.org-tree li{list-style:none;position:relative;padding:26px 12px 0;display:flex;flex-direction:column;align-items:center}
.org-tree li::before,.org-tree li::after{content:'';position:absolute;top:0;right:50%;border-top:1.5px solid var(--border);width:50%;height:26px}
.org-tree li::after{right:auto;left:50%;border-left:1.5px solid var(--border)}
.org-tree li:only-child::before,.org-tree li:only-child::after{display:none}
.org-tree li:first-child::before,.org-tree li:last-child::after{border:0 none}
.org-tree li:last-child::before{border-right:1.5px solid var(--border);border-radius:0 6px 0 0}
.org-tree li:first-child::after{border-radius:6px 0 0 0}
.org-tree ul ul::before{content:'';position:absolute;top:0;left:50%;border-left:1.5px solid var(--border);width:0;height:26px}
`
