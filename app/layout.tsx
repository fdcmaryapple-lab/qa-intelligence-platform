import type { Metadata } from "next";
import { Newsreader, Inter, JetBrains_Mono } from "next/font/google";
import { ThemeProvider } from "@/components/shared/theme-provider";
import "./globals.css";

// Display face: an editorial serif — evokes "report" / "document", which
// fits a product whose core outputs are requirement analyses, bug reports,
// and QA reports. Used with restraint (headings only).
const fontDisplay = Newsreader({
  subsets: ["latin"],
  variable: "--font-display",
  weight: ["500", "600", "700"],
  style: ["normal", "italic"],
});

// Body/UI face: built for dense interface text and data tables.
const fontSans = Inter({
  subsets: ["latin"],
  variable: "--font-sans",
});

// Monospace: for test IDs, code, logs, and locators — content that is
// literally code or code-adjacent throughout this product.
const fontMono = JetBrains_Mono({
  subsets: ["latin"],
  variable: "--font-mono",
  weight: ["400", "500"],
});

export const metadata: Metadata = {
  title: "QA Intelligence Platform",
  description:
    "An AI-powered quality engineering workspace for requirement analysis, test design, automation, and risk insight.",
};

export default function RootLayout({
  children,
}: Readonly<{ children: React.ReactNode }>) {
  return (
    <html lang="en" suppressHydrationWarning>
      <body
        className={`${fontDisplay.variable} ${fontSans.variable} ${fontMono.variable} font-sans antialiased`}
      >
        <ThemeProvider attribute="class" defaultTheme="system" enableSystem>
          {children}
        </ThemeProvider>
      </body>
    </html>
  );
}
