// Arquivo: src/app/layout.tsx (Corrigido)
import type { Metadata } from "next";
import { Inter } from "next/font/google";
import "./globals.css";
import { ThemeProvider } from "@/components/ThemeProvider";

const inter = Inter({ subsets: ["latin"] });

export const metadata: Metadata = {
  title: "Bugueinaula",
  description: "Sua plataforma de estudos online",
};

export default function RootLayout({
  children,
}: Readonly<{
  children: React.ReactNode;
}>) {
  return (
    // Garanta que não há espaços ou quebras de linha entre <html> e <body>
    <html lang="pt-BR" suppressHydrationWarning>
      <body className={inter.className}>
        <ThemeProvider
          attribute="class"
          defaultTheme="system"
          enableSystem
          disableTransitionOnChange // Propriedade adicionada para evitar piscadas de tema
        >
          {children}
        </ThemeProvider>
      </body>
    </html>
  );
}