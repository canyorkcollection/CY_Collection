import type { Metadata } from 'next'
import './globals.css'

export const metadata: Metadata = {
  title: 'Can York — Private Collection',
  description: 'A private collection of contemporary works. Ibiza.',
}

export default function RootLayout({ children }: { children: React.ReactNode }) {
  return (
    <html lang="en">
      <body>{children}</body>
    </html>
  )
}
