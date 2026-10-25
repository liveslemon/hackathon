"use client";

import { ReactNode } from "react";
import { usePathname } from "next/navigation";
import { Toaster } from "sonner";
import { AuthProvider } from "@/context/AuthContext";
import { ThemeProvider } from "@/components/ThemeProvider";

// The landing page keeps its original light-only design.
const LIGHT_ONLY_PATHS = new Set(["/"]);

export default function Providers({ children }: { children: ReactNode }) {
  const pathname = usePathname();
  const forcedTheme = LIGHT_ONLY_PATHS.has(pathname ?? "") ? "light" : undefined;

  return (
    // Default to system theme with live OS matching
    <ThemeProvider defaultTheme="system" enableSystem={true} forcedTheme={forcedTheme}>
      <AuthProvider>
        {children}
        <Toaster
          position="bottom-right"
          theme="system"
          richColors
          closeButton
          toastOptions={{
            style: {
              borderRadius: "16px",
              fontFamily: "var(--font-sans)",
            },
          }}
        />
      </AuthProvider>
    </ThemeProvider>
  );
}
