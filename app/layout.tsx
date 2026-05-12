import './globals.css'
import type { Metadata } from 'next'

export const metadata: Metadata = {
  title: 'Arch Linux Mirror Dashboard',
  description: 'Manage your custom Arch Linux repository',
}

export default function RootLayout({
  children,
}: {
  children: React.ReactNode
}) {
  return (
    <html lang="en">
      <head>
        <link href="https://fonts.googleapis.com/css2?family=Inter:wght@400;500;600;700&display=swap" rel="stylesheet" />
      </head>
      <body className="min-h-screen text-slate-100 font-sans antialiased selection:bg-accent selection:text-white">
        {children}
      </body>
    </html>
  )
}
