import type { Metadata } from 'next'
import { Inter } from 'next/font/google'
import './globals.css'

const inter = Inter({ subsets: ['latin'] })

export const metadata: Metadata = {
    title: 'BOT TÂN DẬU 1981',
    description: 'Facebook Messenger Bot kết nối mua bán cho cộng đồng Tân Dậu 1981',
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
