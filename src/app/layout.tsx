import type { Metadata } from 'next'
import { Inter } from 'next/font/google'
import './globals.css'

const inter = Inter({ subsets: ['latin'] })

export const metadata: Metadata = {
    title: 'BOT Tân Dậu - Hỗ Trợ Chéo',
    description: 'Facebook Messenger Bot kết nối mua bán cho cộng đồng Tân Dậu - Hỗ Trợ Chéo',
}

export default function RootLayout({
    children,
}: {
    children: React.ReactNode
}) {
    return (
        <html lang="vi">
            <body className={inter.className}>{children}</body>
        </html>
    )
}
