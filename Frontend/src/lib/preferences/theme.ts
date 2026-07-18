export const THEME_MODE_OPTIONS = [
  { label: "Claro", value: "light" },
  { label: "Oscuro", value: "dark" },
  { label: "Sistema", value: "system" },
] as const;

export const THEME_MODE_VALUES = THEME_MODE_OPTIONS.map((o) => o.value);
export type ThemeMode = (typeof THEME_MODE_VALUES)[number];
export type ResolvedThemeMode = "light" | "dark";

// --- generated:themePresets:start ---

export const THEME_PRESET_OPTIONS = [
  {
    label: "Predeterminado",
    value: "default",
    primary: {
      light: "oklch(0.205 0 0)",
      dark: "oklch(0.922 0 0)",
    },
  },
  {
    label: "Brutalista",
    value: "brutalist",
    primary: {
      light: "oklch(0.6489 0.237 26.9728)",
      dark: "oklch(0.7044 0.1872 23.1858)",
    },
  },
  {
    label: "Suave",
    value: "soft-pop",
    primary: {
      light: "oklch(0.5106 0.2301 276.9656)",
      dark: "oklch(0.6801 0.1583 276.9349)",
    },
  },
  {
    label: "Mandarina",
    value: "tangerine",
    primary: {
      light: "oklch(0.64 0.17 36.44)",
      dark: "oklch(0.64 0.17 36.44)",
    },
  },
  {
    label: "Jurídico Dorado",
    value: "legal-gold",
    primary: {
      light: "oklch(0.58 0.12 90)",
      dark: "oklch(0.78 0.12 92)",
    },
  },
  {
    label: "Esmeralda",
    value: "emerald",
    primary: {
      light: "oklch(0.5 0.11 165)",
      dark: "oklch(0.72 0.12 165)",
    },
  },
  {
    label: "Borgoña",
    value: "burgundy",
    primary: {
      light: "oklch(0.46 0.15 20)",
      dark: "oklch(0.68 0.13 25)",
    },
  },
  {
    label: "Zafiro",
    value: "sapphire",
    primary: {
      light: "oklch(0.5 0.18 262)",
      dark: "oklch(0.68 0.15 262)",
    },
  },
  {
    label: "Medianoche",
    value: "midnight",
    primary: {
      light: "oklch(0.35 0.05 255)",
      dark: "oklch(0.8 0.06 230)",
    },
  },
  {
    label: "Cristal",
    value: "glass",
    primary: {
      light: "oklch(0.5 0.19 278)",
      dark: "oklch(0.72 0.14 278)",
    },
  },
] as const;

export const THEME_PRESET_VALUES = THEME_PRESET_OPTIONS.map((p) => p.value);

export type ThemePreset = (typeof THEME_PRESET_OPTIONS)[number]["value"];

// --- generated:themePresets:end ---
