import { createContext, useContext, useEffect, useMemo, useState } from "react";
import { useApp } from "./AppContext";

export const THEMES = [
  {
    id: "light", name: "Light", description: "White & indigo", accent: "#6366F1", dark: false,
    vars: {
      "--bg": "#F6F7FB", "--surface": "#FFFFFF", "--surface-2": "#F2F4FA", "--surface-3": "#E9ECF6",
      "--border": "#E5E8F0", "--border-strong": "#D4D9E6", "--text": "#171A26", "--muted": "#646A7E",
      "--faint": "#9298A8", "--sidebar": "#FFFFFF", "--sidebar-text": "#222636", "--sidebar-muted": "#7A8093",
      "--sidebar-hover": "#F3F4FA", "--shadow": "0 1px 2px rgba(23,26,38,.04), 0 8px 24px -18px rgba(23,26,38,.20)",
      "--grid": "#EDF0F7",
    },
  },
  {
    id: "dark", name: "Dark", description: "Charcoal & indigo", accent: "#818CF8", dark: true,
    vars: {
      "--bg": "#0E1016", "--surface": "#161923", "--surface-2": "#1D212D", "--surface-3": "#252A38",
      "--border": "#282E3D", "--border-strong": "#394052", "--text": "#F2F4FA", "--muted": "#9AA2B6",
      "--faint": "#727B90", "--sidebar": "#12151D", "--sidebar-text": "#EDF0F8", "--sidebar-muted": "#8A92A7",
      "--sidebar-hover": "#1D2230", "--shadow": "0 1px 2px rgba(0,0,0,.30), 0 16px 32px -24px rgba(0,0,0,.8)",
      "--grid": "#252B39",
    },
  },
  {
    id: "emerald", name: "Emerald", description: "Green & fresh", accent: "#059669", dark: false,
    vars: {
      "--bg": "#F3F9F6", "--surface": "#FFFFFF", "--surface-2": "#ECF6F1", "--surface-3": "#E0F0E8",
      "--border": "#DBEAE2", "--border-strong": "#C4DED1", "--text": "#10241B", "--muted": "#5A7266",
      "--faint": "#869B90", "--sidebar": "#FFFFFF", "--sidebar-text": "#163025", "--sidebar-muted": "#6C8478",
      "--sidebar-hover": "#EFF7F3", "--shadow": "0 1px 2px rgba(16,36,27,.04), 0 8px 24px -18px rgba(16,36,27,.22)",
      "--grid": "#E5F1EA",
    },
  },
  {
    id: "lavender", name: "Lavender", description: "Purple & soft", accent: "#8B5CF6", dark: false,
    vars: {
      "--bg": "#F8F6FD", "--surface": "#FFFFFF", "--surface-2": "#F3EFFC", "--surface-3": "#EAE3F9",
      "--border": "#E7E1F4", "--border-strong": "#D6CBEE", "--text": "#201A2E", "--muted": "#6D6386",
      "--faint": "#948AAC", "--sidebar": "#FFFFFF", "--sidebar-text": "#2A2139", "--sidebar-muted": "#7F7497",
      "--sidebar-hover": "#F4F0FC", "--shadow": "0 1px 2px rgba(32,26,46,.04), 0 8px 24px -18px rgba(32,26,46,.22)",
      "--grid": "#EFEAFB",
    },
  },
  {
    id: "sunset", name: "Sunset", description: "Orange & warm", accent: "#EA7317", dark: false,
    vars: {
      "--bg": "#FFF8F2", "--surface": "#FFFFFF", "--surface-2": "#FDF2E8", "--surface-3": "#FBE7D7",
      "--border": "#F3E4D6", "--border-strong": "#E9D2BE", "--text": "#2B1B10", "--muted": "#82654F",
      "--faint": "#A88E79", "--sidebar": "#FFFFFF", "--sidebar-text": "#332114", "--sidebar-muted": "#937761",
      "--sidebar-hover": "#FEF4EB", "--shadow": "0 1px 2px rgba(43,27,16,.05), 0 8px 24px -18px rgba(43,27,16,.22)",
      "--grid": "#F8ECE0",
    },
  },
  {
    id: "ocean", name: "Ocean", description: "Blue & calm", accent: "#0284C7", dark: false,
    vars: {
      "--bg": "#F1F8FC", "--surface": "#FFFFFF", "--surface-2": "#EAF4FA", "--surface-3": "#DDECF6",
      "--border": "#DCEAF3", "--border-strong": "#C1DCEB", "--text": "#0C2533", "--muted": "#54707F",
      "--faint": "#8299A6", "--sidebar": "#FFFFFF", "--sidebar-text": "#12303F", "--sidebar-muted": "#68818E",
      "--sidebar-hover": "#EFF7FC", "--shadow": "0 1px 2px rgba(12,37,51,.04), 0 8px 24px -18px rgba(12,37,51,.22)",
      "--grid": "#E4F0F8",
    },
  },
  {
    id: "rose", name: "Rose", description: "Pink & elegant", accent: "#E11D48", dark: false,
    vars: {
      "--bg": "#FDF5F7", "--surface": "#FFFFFF", "--surface-2": "#FBEEF2", "--surface-3": "#F8E1E8",
      "--border": "#F2E1E7", "--border-strong": "#E8C9D4", "--text": "#2B1720", "--muted": "#7E5E6B",
      "--faint": "#A48793", "--sidebar": "#FFFFFF", "--sidebar-text": "#331C25", "--sidebar-muted": "#8E6C79",
      "--sidebar-hover": "#FDF1F4", "--shadow": "0 1px 2px rgba(43,23,32,.04), 0 8px 24px -18px rgba(43,23,32,.22)",
      "--grid": "#F7E9EE",
    },
  },
  {
    id: "midnight-gold", name: "Midnight Gold", description: "Dark & gold", accent: "#D4A93A", dark: true,
    vars: {
      "--bg": "#0E0D0A", "--surface": "#171511", "--surface-2": "#1F1C16", "--surface-3": "#28241C",
      "--border": "#302B21", "--border-strong": "#443D2D", "--text": "#F6F1E5", "--muted": "#A79C86",
      "--faint": "#7E745F", "--sidebar": "#12100C", "--sidebar-text": "#F5EFE1", "--sidebar-muted": "#9B907A",
      "--sidebar-hover": "#201D16", "--shadow": "0 1px 2px rgba(0,0,0,.35), 0 16px 32px -24px rgba(0,0,0,.85)",
      "--grid": "#26221A",
    },
  },
];

const BASE_TOKENS = {
  "--success": "#059669", "--success-soft": "rgba(5,150,105,.12)",
  "--warning": "#D97706", "--warning-soft": "rgba(217,119,6,.13)",
  "--danger": "#DC2626", "--danger-soft": "rgba(220,38,38,.11)",
  "--info": "#0284C7", "--info-soft": "rgba(2,132,199,.12)",
};

const DARK_TOKENS = {
  "--success": "#34D399", "--success-soft": "rgba(52,211,153,.14)",
  "--warning": "#FBBF24", "--warning-soft": "rgba(251,191,36,.14)",
  "--danger": "#F87171", "--danger-soft": "rgba(248,113,113,.14)",
  "--info": "#60A5FA", "--info-soft": "rgba(96,165,250,.14)",
};

function hexToRgba(hex, alpha = 1) {
  const value = String(hex || "#6366F1").replace("#", "");
  const full = value.length === 3 ? value.split("").map((c) => c + c).join("") : value;
  const int = parseInt(full, 16);
  if (Number.isNaN(int)) return `rgba(99,102,241,${alpha})`;
  const r = (int >> 16) & 255;
  const g = (int >> 8) & 255;
  const b = int & 255;
  return `rgba(${r},${g},${b},${alpha})`;
}

function isLight(hex) {
  const value = String(hex).replace("#", "");
  const full = value.length === 3 ? value.split("").map((c) => c + c).join("") : value;
  const int = parseInt(full, 16);
  if (Number.isNaN(int)) return false;
  const r = (int >> 16) & 255;
  const g = (int >> 8) & 255;
  const b = int & 255;
  return (r * 299 + g * 587 + b * 114) / 1000 > 165;
}

const ThemeContext = createContext(null);

export function ThemeProvider({ children }) {
  const { data } = useApp();
  const settings = data.settings || {};
  const selected = settings.theme || "light";
  const [systemDark, setSystemDark] = useState(() => {
    if (typeof window === "undefined" || !window.matchMedia) return false;
    return window.matchMedia("(prefers-color-scheme: dark)").matches;
  });

  useEffect(() => {
    if (typeof window === "undefined" || !window.matchMedia) return;
    const query = window.matchMedia("(prefers-color-scheme: dark)");
    const handler = (e) => setSystemDark(e.matches);
    query.addEventListener?.("change", handler);
    return () => query.removeEventListener?.("change", handler);
  }, []);

  const themeId = selected === "system" ? (systemDark ? "dark" : "light") : selected;
  const theme = THEMES.find((t) => t.id === themeId) || THEMES[0];
  const accent = settings.accentColor || theme.accent;

  useEffect(() => {
    const root = document.documentElement;
    const tokens = {
      ...theme.vars,
      ...(theme.dark ? DARK_TOKENS : BASE_TOKENS),
      "--accent": accent,
      "--accent-hover": hexToRgba(accent, 0.86),
      "--accent-soft": hexToRgba(accent, theme.dark ? 0.18 : 0.1),
      "--accent-ring": hexToRgba(accent, 0.32),
      "--accent-contrast": isLight(accent) ? "#1A1A1A" : "#FFFFFF",
    };
    Object.entries(tokens).forEach(([key, value]) => root.style.setProperty(key, value));
    root.setAttribute("data-theme", theme.id);
    root.style.colorScheme = theme.dark ? "dark" : "light";
    const meta = document.querySelector('meta[name="theme-color"]');
    if (meta) meta.setAttribute("content", theme.vars["--bg"]);
  }, [theme, accent]);

  const value = useMemo(
    () => ({
      themes: THEMES, theme: themeId, themeMeta: theme, selectedTheme: selected,
      isDark: theme.dark, accentColor: accent, setSystemDark,
    }),
    [themeId, theme, selected, accent]
  );

  return <ThemeContext.Provider value={value}>{children}</ThemeContext.Provider>;
}

export function useTheme() {
  const ctx = useContext(ThemeContext);
  if (!ctx) throw new Error("useTheme must be used inside ThemeProvider");
  return ctx;
}

export { hexToRgba, isLight };
