// Arquivo: src/components/ThemeProvider.tsx (Corrigido)
'use client'

// Importamos o componente e os tipos da mesma fonte principal
import { ThemeProvider as NextThemesProvider, type ThemeProviderProps } from 'next-themes'

export function ThemeProvider({ children, ...props }: ThemeProviderProps) {
  return <NextThemesProvider {...props}>{children}</NextThemesProvider>
}