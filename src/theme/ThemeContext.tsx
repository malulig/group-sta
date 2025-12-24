import React, { createContext, useContext, useMemo, useState } from "react";
import { useColorScheme } from "react-native";

export type ThemeMode = "system" | "light" | "dark";

type ThemeContextValue = {
  mode: ThemeMode;
  isDark: boolean;
  toggleTheme: () => void;
};

const ThemeContext = createContext<ThemeContextValue | undefined>(undefined);

export function ThemeProvider({ children }: { children: React.ReactNode }) {
  const systemScheme = useColorScheme();
  const [mode, setMode] = useState<ThemeMode>("system");

  const isDark = mode === "system" ? systemScheme === "dark" : mode === "dark";

  const toggleTheme = () => {
    setMode((prev) => {
      if (prev === "system") return systemScheme === "dark" ? "light" : "dark";
      if (prev === "light") return "dark";
      return "system";
    });
  };

  const value = useMemo(() => ({ mode, isDark, toggleTheme }), [mode, isDark]);
  return <ThemeContext.Provider value={value}>{children}</ThemeContext.Provider>;
}

export function useThemeMode() {
  const ctx = useContext(ThemeContext);
  if (!ctx) {
    throw new Error("useThemeMode must be used within ThemeProvider");
  }
  return ctx;
}
