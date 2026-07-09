import type { Metadata } from "next";
import { Inter } from "next/font/google";
import "./globals.css";
import Providers from "./providers";

const inter = Inter({
  subsets: ["latin"],
  display: "swap",
  weight: ["400", "500", "600", "700", "800"],
});

export const metadata: Metadata = {
  title: "PAU InterConnect",
  description: "AI-powered internship matching for students and employers",
};

import GlobalErrorBoundary from "@/components/ErrorBoundary";
import DevToolbar from "@/components/DevToolbar";

// Remove the DevToolbar component from this layout to disable the dev helper entirely.

export default function RootLayout({
  children,
}: Readonly<{
  children: React.ReactNode;
}>) {
  return (
    <html lang="en">
      <body className={inter.className}>
        <GlobalErrorBoundary>
          <Providers>{children}</Providers>
          <DevToolbar />
        </GlobalErrorBoundary>
      </body>
    </html>
  );
}
