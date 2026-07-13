import type { Metadata } from 'next'
import './globals.css'

export const metadata: Metadata = {
  title: 'Programa Prev MDC — Meu Dentista em Casa',
  description: 'Portal de parceiros do Programa Prev MDC',
}

export default function RootLayout({ children }: { children: React.ReactNode }) {
  return (
    <html lang="pt-BR">
      <head>
        <link
          href="https://fonts.googleapis.com/css2?family=DM+Sans:wght@300;400;500;600&display=swap"
          rel="stylesheet"
        />
      </head>
      <body>{children}</body>
    </html>
  )
}
