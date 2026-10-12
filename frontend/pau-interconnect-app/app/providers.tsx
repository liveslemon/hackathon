"use client";

import { ReactNode } from "react";
import { Toaster } from "sonner";
import { AuthProvider } from "@/context/AuthContext";
import { ThemeProvider } from "@/components/ThemeProvider";

export default function Providers({ children }: { children: ReactNode }) {
  return (
    // Light by default: most pages aren't styled for dark mode yet, so only users
    // who pick dark in settings get it.
    <ThemeProvider defaultTheme="light" enableSystem={false}>
      <AuthProvider>
        {children}
        <Toaster position="bottom-left" richColors closeButton />
      </AuthProvider>
    </ThemeProvider>
  );
}
