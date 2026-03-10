"use client";

import { LocalizationProvider } from "@mui/x-date-pickers";
import { AdapterDateFns } from "@mui/x-date-pickers/AdapterDateFns";
import { ReactNode } from "react";
import ThemeRegistry from "./components/ThemeRegistry";

export default function Providers({ children }: { children: ReactNode }) {
  return (
    <ThemeRegistry>
      <LocalizationProvider dateAdapter={AdapterDateFns}>
        {children}
      </LocalizationProvider>
    </ThemeRegistry>
  );
}