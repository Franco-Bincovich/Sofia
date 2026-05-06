export const COLORS = {
  primary: "#1A56DB",
  background: {
    light: "#F8FAFC",
    dark: "#0F172A",
  },
  surface: {
    light: "#FFFFFF",
    dark: "#1E293B",
  },
} as const

export const TYPOGRAPHY = {
  fontFamily: "Inter, system-ui, -apple-system, sans-serif",
  fontSizes: {
    xs: "0.75rem",
    sm: "0.875rem",
    base: "1rem",
    lg: "1.125rem",
    xl: "1.25rem",
    "2xl": "1.5rem",
    "3xl": "1.875rem",
  },
  fontWeights: {
    normal: 400,
    medium: 500,
    semibold: 600,
    bold: 700,
  },
} as const

export const RADIUS = {
  md: "8px",
  lg: "12px",
} as const

export const SPACING = {
  sidebar: "16rem",
  sidebarCollapsed: "0rem",
  headerHeight: "3.5rem",
} as const

export const BREAKPOINTS = {
  mobile: 768,
  tablet: 1024,
  desktop: 1280,
} as const
