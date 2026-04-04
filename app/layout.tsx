import type { Metadata, Viewport } from 'next'
import localFont from 'next/font/local'
import './globals.css'
import ServiceWorkerRegistration from '@/components/ServiceWorkerRegistration'
import InstallBanner from '@/components/InstallBanner'
import GoogleAnalytics from './GoogleAnalytics'

const geistSans = localFont({
  src: './fonts/GeistVF.woff',
  variable: '--font-geist-sans',
  weight: '100 900',
})
const geistMono = localFont({
  src: './fonts/GeistMonoVF.woff',
  variable: '--font-geist-mono',
  weight: '100 900',
})

export const metadata: Metadata = {
  title: 'K33pr',
  description: 'Scan products. Earn cashback.',
  manifest: '/manifest.json',
}

export const viewport: Viewport = {
  themeColor: '#534AB7',
  width: 'device-width',
  initialScale: 1,
  maximumScale: 1,
}

export default function RootLayout({
  children,
}: Readonly<{
  children: React.ReactNode
}>) {
  return (
    <html lang="en">
      <head>
        <meta name="apple-mobile-web-app-capable" content="yes" />
        <meta name="apple-mobile-web-app-status-bar-style" content="black-translucent" />
        <meta name="apple-mobile-web-app-title" content="K33pr" />
        <link rel="apple-touch-icon" href="/icon-1024.png" />
        <meta name="mobile-web-app-capable" content="yes" />
      </head>
      <body
        className={`${geistSans.variable} ${geistMono.variable} antialiased`}
      >
        <GoogleAnalytics />
        {children}
        <ServiceWorkerRegistration />
        <InstallBanner />
      </body>
    </html>
  )
}
