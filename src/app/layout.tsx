import type { Metadata } from 'next'
import { Toaster } from '@/components/ui/sonner'
import './globals.css'

export const metadata: Metadata = {
  title: 'ידידים — סיכום שבועי',
  description: 'מערכת ניהול אירועי מתנדבים שבועיים',
  icons: {
    icon: '/logo.jpg',
    apple: '/logo.jpg',
  },
  manifest: '/manifest.json',
}

export default function RootLayout({ children }: { children: React.ReactNode }) {
  return (
    <html lang="he" dir="rtl" suppressHydrationWarning>
      <body className="antialiased bg-background text-foreground">
        {children}
        <footer className="text-center text-xs text-gray-400 py-3 mt-4 border-t border-gray-100">
          נבנה ע&quot;י קובי פיליפ 0526255232
        </footer>
        <Toaster position="top-center" richColors />
      </body>
    </html>
  )
}
