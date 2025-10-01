import type { Metadata } from 'next'
import { Inter, Poppins } from 'next/font/google'
import './globals.css'
import { Toaster } from 'react-hot-toast'
import { Providers } from './providers'

const inter = Inter({
    subsets: ['latin'],
    variable: '--font-inter',
    display: 'swap',
})

const poppins = Poppins({
    subsets: ['latin'],
    weight: ['400', '500', '600', '700', '800'],
    variable: '--font-poppins',
    display: 'swap',
})

export const metadata: Metadata = {
    title: 'BOT TÂN DẬU 1981 - Kết Nối Mua Bán',
    description: 'Platform kết nối mua bán dành riêng cho thành viên sinh năm 1981. Chỉ 1,000đ/ngày, trial 3 ngày miễn phí.',
    keywords: 'Tân Dậu 1981, mua bán, kết nối, cộng đồng, marketplace',
    authors: [{ name: 'BOT TÂN DẬU 1981' }],
    creator: 'BOT TÂN DẬU 1981',
    publisher: 'BOT TÂN DẬU 1981',
    formatDetection: {
        email: false,
        address: false,
        telephone: false,
    },
    metadataBase: new URL('https://bot-tan-dau-1981.vercel.app'),
    openGraph: {
        title: 'BOT TÂN DẬU 1981 - Kết Nối Mua Bán',
        description: 'Platform kết nối mua bán dành riêng cho thành viên sinh năm 1981',
        url: 'https://bot-tan-dau-1981.vercel.app',
        siteName: 'BOT TÂN DẬU 1981',
        images: [
            {
                url: '/og-image.jpg',
                width: 1200,
                height: 630,
                alt: 'BOT TÂN DẬU 1981',
            },
        ],
        locale: 'vi_VN',
        type: 'website',
    },
    twitter: {
        card: 'summary_large_image',
        title: 'BOT TÂN DẬU 1981 - Kết Nối Mua Bán',
        description: 'Platform kết nối mua bán dành riêng cho thành viên sinh năm 1981',
        images: ['/og-image.jpg'],
    },
    robots: {
        index: true,
        follow: true,
        googleBot: {
            index: true,
            follow: true,
            'max-video-preview': -1,
            'max-image-preview': 'large',
            'max-snippet': -1,
        },
    },
    verification: {
        google: 'your-google-verification-code',
    },
}

export default function RootLayout({
    children,
}: {
    children: React.ReactNode
}) {
    return (
        <html lang="vi" className={`${inter.variable} ${poppins.variable}`}>
            <head>
                <link rel="icon" href="/favicon.ico" />
                <link rel="apple-touch-icon" sizes="180x180" href="/apple-touch-icon.png" />
                <link rel="icon" type="image/png" sizes="32x32" href="/favicon-32x32.png" />
                <link rel="icon" type="image/png" sizes="16x16" href="/favicon-16x16.png" />
                <link rel="manifest" href="/site.webmanifest" />
                <meta name="theme-color" content="#2563eb" />
                <meta name="viewport" content="width=device-width, initial-scale=1, maximum-scale=1, user-scalable=no" />
            </head>
            <body className={`${inter.className} antialiased`}>
                <Providers>
                    {children}
                    <Toaster
                        position="top-right"
                        toastOptions={{
                            duration: 4000,
                            style: {
                                background: '#363636',
                                color: '#fff',
                            },
                            success: {
                                duration: 3000,
                                iconTheme: {
                                    primary: '#10b981',
                                    secondary: '#fff',
                                },
                            },
                            error: {
                                duration: 5000,
                                iconTheme: {
                                    primary: '#ef4444',
                                    secondary: '#fff',
                                },
                            },
                        }}
                    />
                </Providers>
            </body>
        </html>
    )
}
