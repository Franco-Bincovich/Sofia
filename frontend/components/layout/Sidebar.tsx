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
  Menu,
  X,
  Settings,
  LogOut,
  Building2,
  Moon,
  Sun,
  ChevronsUpDown,
} from "lucide-react"
import { useTheme } from "next-themes"

import { cn } from "@/lib/utils"
import { Button } from "@/components/ui/button"
import { Avatar, AvatarFallback } from "@/components/ui/avatar"
import { Separator } from "@/components/ui/separator"
import {
  DropdownMenu,
  DropdownMenuContent,
  DropdownMenuItem,
  DropdownMenuSeparator,
  DropdownMenuTrigger,
} from "@/components/ui/dropdown-menu"
import { fetchEmpresas } from "@/services/empresas"
import { getEmpresaActivaId, setEmpresaActivaId } from "@/services/empresaStore"
import type { Empresa } from "@/types/empresa"

const NAV_ITEMS = [
  { label: "Dashboard", href: "/dashboard", icon: LayoutDashboard },
  { label: "Procesos", href: "/procesos", icon: Activity },
  { label: "Proyectos", href: "/proyectos", icon: FolderKanban },
  { label: "Empresas", href: "/empresas", icon: Building2 },
  { label: "Empleados", href: "/empleados", icon: Users },
  { label: "Organigrama", href: "/organigrama", icon: GitBranch },
  { label: "Vacantes", href: "/vacantes", icon: Briefcase },
  { label: "Vacaciones", href: "/vacaciones", icon: Umbrella },
  { label: "Ausencias", href: "/ausencias", icon: CalendarX2 },
  { label: "Onboarding", href: "/onboarding", icon: UserPlus },
  { label: "Offboarding", href: "/offboarding", icon: UserMinus },
  { label: "Costos", href: "/costos", icon: DollarSign },
  { label: "Sucesión", href: "/sucesion", icon: TrendingUp },
  // { label: "Assessment", href: "/assessment", icon: ClipboardList }, // HIDDEN — reactivar cuando se habilite el módulo
  { label: "Capacitaciones", href: "/capacitaciones", icon: GraduationCap },
  { label: "Evaluaciones", href: "/evaluaciones", icon: ClipboardCheck },
  { label: "Inventario", href: "/inventario", icon: Package },
  { label: "Objetivos",  href: "/objetivos",  icon: Target  },
  { label: "Reportes", href: "/reportes", icon: BarChart3 },
  { label: "Configuración", href: "/configuracion", icon: Settings },
] as const

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

function UserMenu() {
  return (
    <DropdownMenu>
      <DropdownMenuTrigger
        className="flex min-h-11 w-full items-center gap-3 rounded-lg px-3 text-sm font-medium text-sidebar-foreground transition-colors hover:bg-sidebar-accent hover:text-sidebar-accent-foreground focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-ring"
      >
        <Avatar size="sm">
          <AvatarFallback>HR</AvatarFallback>
        </Avatar>
        <div className="flex min-w-0 flex-col text-left">
          <span className="truncate text-sm font-medium">Admin RRHH</span>
          <span className="truncate text-xs text-muted-foreground">admin@karstec.com</span>
        </div>
      </DropdownMenuTrigger>
      <DropdownMenuContent side="top" align="start" className="w-56">
        <DropdownMenuItem>
          <Settings className="size-4" />
          Configuración
        </DropdownMenuItem>
        <DropdownMenuSeparator />
        <DropdownMenuItem variant="destructive">
          <LogOut className="size-4" />
          Cerrar sesión
        </DropdownMenuItem>
      </DropdownMenuContent>
    </DropdownMenu>
  )
}

export function Sidebar() {
  const [mobileOpen, setMobileOpen] = useState(false)
  const pathname = usePathname()

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
            {NAV_ITEMS.map((item) => (
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
