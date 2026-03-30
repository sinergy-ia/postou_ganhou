import type { Metadata } from "next";
import { Inter, Outfit } from "next/font/google";
import "./globals.css";
import QueryProvider from "@/providers/QueryProvider";

const inter = Inter({
  variable: "--font-inter",
  subsets: ["latin"],
});

const outfit = Outfit({
  variable: "--font-outfit",
  subsets: ["latin"],
});

export const metadata: Metadata = {
  title: "Marque & Ganhe - Plataforma de Recompensas",
  description: "Poste, ganhe descontos e descubra lugares incríveis na plataforma de recompensas sociais.",
  icons: {
    icon: [
      { url: "/favicon.ico", sizes: "any" },
      { url: "/icon.svg", type: "image/svg+xml" },
    ],
    apple: "/apple-icon.png",
  },
};

export default function RootLayout({
  children,
}: Readonly<{
  children: React.ReactNode;
}>) {
  return (
    <html lang="pt-BR">
      <body
        className={`${inter.variable} ${outfit.variable} antialiased font-sans text-slate-800 bg-slate-50`}
      >
        <QueryProvider>
          {children}
        </QueryProvider>
      </body>
    </html>
  );
}
