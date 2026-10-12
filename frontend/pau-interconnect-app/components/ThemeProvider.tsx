"use client";

import React, { createContext, useContext, useEffect, useState, useCallback } from "react";
import {
  ThemeProvider as NextThemesProvider,
  useTheme as useNextTheme,
} from "next-themes";

export type Theme = "light" | "dark" | "system";

export interface CustomThemeContextType {
  theme: string | undefined;
  resolvedTheme: string | undefined;
  setTheme: (theme: string) => void;
  toggleTheme: () => void;
  mounted: boolean;
  themes: string[];
  systemTheme?: "dark" | "light";
}

const FallbackThemeContext = createContext<CustomThemeContextType>({
  theme: "light",
  resolvedTheme: "light",
  setTheme: () => {},
  toggleTheme: () => {},
  mounted: false,
  themes: ["light", "dark", "system"],
});

export function ThemeProvider({
  children,
  ...props
}: React.ComponentProps<typeof NextThemesProvider>) {
  return (
    <NextThemesProvider
      attribute="class"
      defaultTheme="system"
      enableSystem
      disableTransitionOnChange
      {...props}
    >
      {children}
    </NextThemesProvider>
  );
}

export function useTheme(): CustomThemeContextType {
  const nextThemesContext = useNextTheme();
  const fallbackContext = useContext(FallbackThemeContext);

  const [mounted, setMounted] = useState(false);

  useEffect(() => {
    setMounted(true);
  }, []);

  const toggleTheme = useCallback(() => {
    const current =
      nextThemesContext.resolvedTheme ||
      nextThemesContext.theme ||
      fallbackContext.resolvedTheme ||
      "light";
    const next = current === "dark" ? "light" : "dark";
    if (nextThemesContext.setTheme) {
      nextThemesContext.setTheme(next);
    } else {
      fallbackContext.setTheme(next);
    }
  }, [nextThemesContext, fallbackContext]);

  // If next-themes context is available:
  if (
    nextThemesContext.theme !== undefined ||
    nextThemesContext.resolvedTheme !== undefined
  ) {
    return {
      ...nextThemesContext,
      theme: mounted ? nextThemesContext.theme : "light",
      resolvedTheme: mounted ? nextThemesContext.resolvedTheme : "light",
      toggleTheme,
      mounted,
    };
  }

  // Graceful fallback if invoked outside a next-themes provider
  return {
    ...fallbackContext,
    toggleTheme,
    mounted,
  };
}
