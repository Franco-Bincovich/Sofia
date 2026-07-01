"use client"

import { useState, useEffect } from "react"
import Link from "next/link"
import { usePathname } from "next/navigation"
import {
  Activity,
  FolderKanban,
  LayoutDashboard,
  Users,
  GitBranch,
  Briefcase,
  UserPlus,
  UserMinus,
  Umbrella,
  CalendarX2,
  DollarSign,
  TrendingUp,
  BarChart3,
  GraduationCap,
  ClipboardCheck,
  Package,
  Target,
  ScrollText,
  CalendarClock,
  Menu,
  X,
  Settings,
  Building2,
  Moon,
  Sun,
  ChevronsUpDown,
} from "lucide-react"
import { useTheme } from "next-themes"

import { cn } from "@/lib/utils"
import { Button } from "@/components/ui/button"
import { Separator } from "@/components/ui/separator"
import { UserMenu } from "@/components/layout/UserMenu"
import { fetchEmpresas } from "@/services/empresas"
import { getEmpresaActivaId, setEmpresaActivaId } from "@/services/empresaStore"
import { getRol, puede, type Seccion } from "@/services/permisos"
import type { Empresa } from "@/types/empresa"
import type { UserRol } from "@/types/auth"

// seccion: null = ítem siempre visible (no gateado por rol). Resto = se filtra por puede(rol, seccion, "read").
const NAV_ITEMS: ReadonlyArray<{
  label: string
  href: string
  icon: React.ElementType
  seccion: Seccion | null
}> = [
  { label: "Dashboard", href: "/dashboard", icon: LayoutDashboard, seccion: null },
  { label: "Procesos", href: "/procesos", icon: Activity, seccion: "procesos" },
  { label: "Proyectos", href: "/proyectos", icon: FolderKanban, seccion: "proyectos" },
  { label: "Empresas", href: "/empresas", icon: Building2, seccion: "empresa" },
  { label: "Empleados", href: "/empleados", icon: Users, seccion: "empleados" },
  { label: "Organigrama", href: "/organigrama", icon: GitBranch, seccion: "organigrama" },
  { label: "Vacantes", href: "/vacantes", icon: Briefcase, seccion: "vacantes" },
  { label: "Vacaciones", href: "/vacaciones", icon: Umbrella, seccion: "vacaciones" },
  { label: "Ausencias", href: "/ausencias", icon: CalendarX2, seccion: "ausencias" },
  { label: "Onboarding", href: "/onboarding", icon: UserPlus, seccion: "onboarding" },
  { label: "Offboarding", href: "/offboarding", icon: UserMinus, seccion: "offboarding" },
  { label: "Costos", href: "/costos", icon: DollarSign, seccion: "costos" },
  { label: "Sucesión", href: "/sucesion", icon: TrendingUp, seccion: "sucesion" },
  // { label: "Assessment", href: "/assessment", icon: ClipboardList }, // HIDDEN — reactivar cuando se habilite el módulo
  { label: "Capacitaciones", href: "/capacitaciones", icon: GraduationCap, seccion: "capacitaciones" },
  { label: "Evaluaciones", href: "/evaluaciones", icon: ClipboardCheck, seccion: "evaluaciones" },
  { label: "Inventario", href: "/inventario", icon: Package, seccion: "inventario" },
  { label: "Objetivos", href: "/objetivos", icon: Target, seccion: "objetivos" },
  { label: "Reportes", href: "/reportes", icon: BarChart3, seccion: "reportes" },
  { label: "Auditoría", href: "/auditoria", icon: ScrollText, seccion: "auditoria" },
  { label: "Períodos", href: "/periodos", icon: CalendarClock, seccion: "periodos" },
  { label: "Configuración", href: "/configuracion", icon: Settings, seccion: null },
]

interface NavItemProps {
  href: string
  label: string
  icon: React.ElementType
  isActive: boolean
  onClick?: () => void
}

function NavItem({ href, label, icon: Icon, isActive, onClick }: NavItemProps) {
  return (
    <Link
      href={href}
      onClick={onClick}
      className={cn(
        "flex min-h-11 items-center gap-3 rounded-lg px-3 text-sm font-medium transition-colors",
        "focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-ring",
        isActive
          ? "bg-primary text-primary-foreground"
          : "text-sidebar-foreground hover:bg-sidebar-accent hover:text-sidebar-accent-foreground",
      )}
    >
      <Icon className="size-4 shrink-0" />
      {label}
    </Link>
  )
}

function ThemeToggle() {
  const { theme, setTheme } = useTheme()

  return (
    <Button
      variant="ghost"
      size="icon"
      className="size-9 shrink-0"
      onClick={() => setTheme(theme === "dark" ? "light" : "dark")}
      aria-label="Cambiar tema"
    >
      <Sun className="size-4 rotate-0 scale-100 transition-all dark:-rotate-90 dark:scale-0" />
      <Moon className="absolute size-4 rotate-90 scale-0 transition-all dark:rotate-0 dark:scale-100" />
    </Button>
  )
}

/**
 * Selector de empresa activa. Persiste en localStorage vía empresaStore.
 * Al cambiar, recarga la página para que todos los listados usen la nueva empresa.
 */
function EmpresaSelector() {
  const [empresas, setEmpresas] = useState<Empresa[]>([])
  const [current, setCurrent]   = useState<string>("todas")

  useEffect(() => {
    setCurrent(getEmpresaActivaId() ?? "todas")
    fetchEmpresas()
      .then((res) => setEmpresas(res.items.filter((e) => e.activa)))
      .catch(() => {})
  }, [])

  if (empresas.length === 0) return null

  function handleChange(e: React.ChangeEvent<HTMLSelectElement>) {
    const val = e.target.value
    setEmpresaActivaId(val === "todas" ? null : val)
    window.location.reload()
  }

  return (
    <div className="px-3 pb-2">
      <div className="relative">
        <div className="pointer-events-none absolute inset-y-0 left-2.5 flex items-center">
          <Building2 className="size-3.5 text-sidebar-foreground/60" />
        </div>
        <select
          value={current}
          onChange={handleChange}
          aria-label="Empresa activa"
          className={cn(
            "w-full appearance-none rounded-lg border border-sidebar-border",
            "bg-sidebar-accent py-1.5 pl-7 pr-7 text-xs font-medium",
            "text-sidebar-foreground transition-colors",
            "hover:bg-sidebar-accent/80 focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-ring",
            "cursor-pointer",
          )}
        >
          <option value="todas">Todas las empresas</option>
          {empresas.map((e) => (
            <option key={e.id} value={e.id}>{e.nombre}</option>
          ))}
        </select>
        <div className="pointer-events-none absolute inset-y-0 right-2 flex items-center">
          <ChevronsUpDown className="size-3 text-sidebar-foreground/60" />
        </div>
      </div>
      {current !== "todas" && (
        <p className="text-xs text-muted-foreground mt-1 truncate px-1">
          {empresas.find((e) => e.id === current)?.nombre}
        </p>
      )}
    </div>
  )
}

export function Sidebar() {
  const [mobileOpen, setMobileOpen] = useState(false)
  const [rol, setRol] = useState<UserRol | null>(null)
  const pathname = usePathname()

  // El rol se lee tras montar (localStorage) para no romper la hidratación SSR.
  useEffect(() => {
    setRol(getRol())
  }, [])

  const visibleItems = NAV_ITEMS.filter(
    (item) => item.seccion === null || (rol !== null && puede(rol, item.seccion, "read")),
  )

  const closeMobile = () => setMobileOpen(false)

  return (
    <>
      {/* Hamburger button — visible only on mobile */}
      <button
        className="fixed left-4 top-4 z-50 flex min-h-11 min-w-11 items-center justify-center rounded-lg bg-sidebar text-sidebar-foreground shadow-sm ring-1 ring-sidebar-border transition-colors hover:bg-sidebar-accent lg:hidden"
        onClick={() => setMobileOpen(true)}
        aria-label="Abrir menú"
      >
        <Menu className="size-5" />
      </button>

      {/* Mobile overlay */}
      {mobileOpen && (
        <div
          className="fixed inset-0 z-40 bg-black/50 lg:hidden"
          aria-hidden="true"
          onClick={closeMobile}
        />
      )}

      {/* Sidebar panel */}
      <aside
        className={cn(
          "fixed inset-y-0 left-0 z-50 flex w-64 flex-col bg-sidebar ring-1 ring-sidebar-border transition-transform duration-200",
          "lg:relative lg:z-auto lg:translate-x-0",
          mobileOpen ? "translate-x-0" : "-translate-x-full",
        )}
      >
        {/* Header: logo + close */}
        <div className="flex h-14 items-center justify-between px-4">
          <Link
            href="/dashboard"
            className="flex items-center gap-2 text-sm font-semibold text-sidebar-foreground"
            onClick={closeMobile}
          >
            <Building2 className="size-5 text-primary" />
            <span>HR Karstec</span>
          </Link>
          <div className="flex items-center gap-1">
            <ThemeToggle />
            <button
              className="flex min-h-11 min-w-11 items-center justify-center rounded-lg text-sidebar-foreground transition-colors hover:bg-sidebar-accent lg:hidden"
              onClick={closeMobile}
              aria-label="Cerrar menú"
            >
              <X className="size-4" />
            </button>
          </div>
        </div>

        <Separator />

        {/* Selector de empresa activa */}
        <div className="px-0 pt-2">
          <EmpresaSelector />
        </div>

        <Separator />

        {/* Navigation */}
        <nav className="flex-1 overflow-y-auto px-3 py-4">
          <ul className="space-y-1" role="list">
            {visibleItems.map((item) => (
              <li key={item.href}>
                <NavItem
                  href={item.href}
                  label={item.label}
                  icon={item.icon}
                  isActive={pathname === item.href || pathname.startsWith(`${item.href}/`)}
                  onClick={closeMobile}
                />
              </li>
            ))}
          </ul>
        </nav>

        <Separator />

        {/* User menu */}
        <div className="p-3">
          <UserMenu />
        </div>
      </aside>
    </>
  )
}
