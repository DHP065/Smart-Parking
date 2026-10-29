import type { Metadata } from 'next';
import { Inter } from 'next/font/google';
import './globals.css';
import { AuthProvider } from '@/lib/auth-context';
import { Toaster } from 'sonner';

const inter = Inter({ subsets: ['latin'], variable: '--font-inter' });

export const metadata: Metadata = {
  title: 'SmartPark — Intelligent Parking Management',
  description: 'Find and reserve parking spots in real-time with SmartPark.',
  keywords: 'parking, smart parking, reservation, parking management',
  authors: [{ name: 'SmartPark' }],
  openGraph: {
    title: 'SmartPark',
    description: 'Find and reserve parking spots in real-time.',
    type: 'website'
  }
};

export default function RootLayout({
  children
}: {
  children: React.ReactNode;
}) {
  return (
    <html lang="en" className="dark" suppressHydrationWarning>
      <head>
        <link href="https://fonts.googleapis.com/css2?family=Material+Symbols+Outlined:wght,FILL@100..700,0..1&amp;display=swap" rel="stylesheet" />
      </head>
      <body className={`${inter.variable} font-sans antialiased bg-background text-on-background min-h-screen`}>
        <AuthProvider>
          {children}
          <Toaster
            position="top-right"
            richColors
            closeButton
            toastOptions={{
              duration: 4000
            }}
          />
        </AuthProvider>
      </body>
    </html>
  );
}
