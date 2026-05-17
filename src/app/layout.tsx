import type { Metadata } from 'next'
import { Toaster } from '@/components/ui/sonner'
import './globals.css'

export const metadata: Metadata = {
  title: 'ידידים — סיכום שבועי',
  description: 'מערכת ניהול אירועי מתנדבים שבועיים',
  icons: {
    icon: '/logo_new.png',
    apple: '/logo_new.png',
  },
  manifest: '/manifest.json',
}

export default function RootLayout({ children }: { children: React.ReactNode }) {
  return (
    <html lang="he" dir="rtl" suppressHydrationWarning>
      <body className="antialiased bg-background text-foreground">
        {children}
        <Toaster position="top-center" richColors />
      </body>
    </html>
  )
}
