// Arquivo: src/components/Header.tsx (Corrigido)
'use client' // Adicione esta linha

import { ThemeSwitcher } from "./ThemeSwitcher";

export default function Header({ title }: { title: string }) {
    return (
        <header className="flex w-full items-center justify-between rounded-lg bg-gray-100 p-4 dark:bg-gray-800">
            <div>
                <h2 className="text-xl font-semibold">{title}</h2>
            </div>
            <div>
                <ThemeSwitcher />
            </div>
        </header>
    )
}