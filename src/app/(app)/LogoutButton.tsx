// Arquivo: src/app/LogoutButton.tsx
"use client"

import { supabase } from "@/lib/supabaseClient"
import { useRouter } from "next/navigation"

export default function LogoutButton() {
    const router = useRouter()

    const handleLogout = async () => {
        await supabase.auth.signOut()
        router.push('/login') // Redireciona para a página de login
        router.refresh()
    }

    return (
        <button
            onClick={handleLogout}
            className="rounded bg-red-500 px-4 py-2 text-white hover:bg-red-600"
        >
            Sair
        </button>
    )
}