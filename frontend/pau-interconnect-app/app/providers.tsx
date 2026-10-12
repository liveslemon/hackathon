"use client";

import { ReactNode } from "react";
import { Toaster } from "sonner";
import { AuthProvider } from "@/context/AuthContext";
import { ThemeProvider } from "@/components/ThemeProvider";

export default function Providers({ children }: { children: ReactNode }) {
  return (
    // Default to system theme with live OS matching
    <ThemeProvider defaultTheme="system" enableSystem={true}>
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
