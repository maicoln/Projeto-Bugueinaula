// Arquivo: src/components/Sidebar.tsx
import { Home, Book, User } from 'lucide-react'
import Link from 'next/link'

export default function Sidebar() {
  const menuItems = [
    { icon: Home, text: 'Início', href: '/' },
    { icon: Book, text: 'Disciplinas', href: '/disciplinas' },
    { icon: User, text: 'Meu Perfil', href: '/perfil' },
  ]

  return (
    <aside className="flex h-screen w-64 flex-col bg-gray-100 p-4 dark:bg-gray-800">
      <h1 className="mb-8 text-2xl font-bold">Bugueinaula</h1>
      <nav>
        <ul>
          {menuItems.map((item) => (
            <li key={item.text}>
              <Link href={item.href}>
                <span className="flex items-center gap-3 rounded-md px-3 py-2 text-gray-700 hover:bg-gray-200 dark:text-gray-200 dark:hover:bg-gray-700">
                  <item.icon size={20} />
                  <span>{item.text}</span>
                </span>
              </Link>
            </li>
          ))}
        </ul>
      </nav>
    </aside>
  )
}