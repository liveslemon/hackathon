import { IBM_Plex_Mono, Instrument_Serif, Schibsted_Grotesk } from "next/font/google";

export const landingSans = Schibsted_Grotesk({
  subsets: ["latin"],
  weight: ["400", "500", "600", "700"],
  variable: "--font-landing-sans",
  display: "swap",
});

export const landingSerif = Instrument_Serif({
  subsets: ["latin"],
  weight: "400",
  style: ["normal", "italic"],
  variable: "--font-landing-serif",
  display: "swap",
});

export const landingMono = IBM_Plex_Mono({
  subsets: ["latin"],
  weight: ["400", "500", "600"],
  variable: "--font-landing-mono",
  display: "swap",
});
