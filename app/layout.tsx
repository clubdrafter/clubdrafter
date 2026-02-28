import type { Metadata, Viewport } from 'next'
import { Inter } from 'next/font/google'
import './globals.css'
import { Toaster } from '@/components/shared/Toaster'

const inter = Inter({ subsets: ['latin'], variable: '--font-inter' })

export const metadata: Metadata = {
  title: 'Clubdrafter — Fantasy IPL Auction',
  description: 'Build your ultimate IPL fantasy team through a live auction with friends.',
  keywords: ['fantasy cricket', 'IPL auction', 'fantasy sports', 'clubdrafter'],
  authors: [{ name: 'Clubdrafter' }],
}

export const viewport: Viewport = {
  themeColor: '#0f1117',
  width: 'device-width',
  initialScale: 1,
}

export default function RootLayout({ children }: { children: React.ReactNode }) {
  return (
    <html lang="en" className={inter.variable}>
      <body className="antialiased">
        {children}
        <Toaster />
      </body>
    </html>
  )
}
