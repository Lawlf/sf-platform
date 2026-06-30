export const color = {
  brand: {
    50: "#fef4e7",
    100: "#fce0c0",
    200: "#f9c98e",
    300: "#f6b259",
    400: "#f4a13a",
    500: "#f28e25",
    600: "#ef7a1a",
    700: "#d96813",
    800: "#ba5717",
    900: "#8d4112",
  },
  semantic: {
    positive: "#16a34a",
    negative: "#dc2626",
    warning: "#ca8a04",
    info: "#2563eb",
  },
  charcoal: {
    900: "#1f1d1c",
    800: "#2a2725",
    700: "#3a3633",
  },
  offWhite: "#fdf8f3",
  warm50: "#fff8ee",
} as const;

export const radius = {
  glass: "1rem",
  card: "1.25rem",
} as const;

export const shadow = {
  glass: "0 8px 32px 0 rgba(31, 29, 28, 0.12)",
  glassStrong: "0 16px 40px rgba(31, 29, 28, 0.06)",
  brand: "0 6px 18px rgba(239, 122, 26, 0.35)",
} as const;

export const gradient = {
  brand: "linear-gradient(135deg, #f28e25, #ef7a1a)",
  brandReversed: "linear-gradient(135deg, #ef7a1a, #f28e25)",
  brandDeep: "linear-gradient(135deg, #f28e25, #d96813)",
  brandSoft: "linear-gradient(135deg, #ef7a1a 0%, #f28e25 60%, #f4a13a 100%)",
  positive: "linear-gradient(135deg, #16a34a, #22c55e)",
  negative: "linear-gradient(135deg, #dc2626, #ef4444)",
} as const;

export const spacing = {
  compact: "3px",
  cozy: "3.5px",
  comfortable: "4px",
} as const;

export const fontSans =
  'var(--font-inter), ui-sans-serif, system-ui, -apple-system, "Segoe UI", Roboto, "Helvetica Neue", Arial, sans-serif' as const;
