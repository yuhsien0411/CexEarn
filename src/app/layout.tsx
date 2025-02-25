import './globals.css'
import type { Metadata } from 'next'
import { Geist, Geist_Mono } from "next/font/google";

const geistSans = Geist({
  variable: "--font-geist-sans",
  subsets: ["latin"],
});

const geistMono = Geist_Mono({
  variable: "--font-geist-mono",
  subsets: ["latin"],
});

export const metadata: Metadata = {
  title: 'CexEarn - 中心化交易所活期理財收益比較',
  description: '即時比較 Binance、Bybit、OKX、Bitget 等主流交易所的穩定幣活期理財年化收益率（APY）',
  applicationName: 'CexEarn',
  authors: [{ name: 'Yu-Hsien Chang', url: 'https://github.com/yuhsien0411' }],
  keywords: ['加密貨幣', '理財', 'APY', '穩定幣', 'USDT', 'USDC', 'DAI', 'Binance', 'Bybit', 'OKX', 'Bitget'],
  creator: 'Yu-Hsien Chang',
  publisher: 'Yu-Hsien Chang',
  robots: 'index, follow',
  themeColor: '#3B82F6',
  viewport: 'width=device-width, initial-scale=1',
  manifest: '/manifest.json',
  icons: {
    icon: '/icon.png',
    shortcut: '/shortcut-icon.png',
    apple: '/apple-icon.png',
    other: {
      rel: 'apple-touch-icon-precomposed',
      url: '/apple-touch-icon-precomposed.png',
    },
  },
  openGraph: {
    type: 'website',
    locale: 'zh_TW',
    url: 'https://cexearn.vercel.app',
    title: 'CexEarn - 中心化交易所活期理財收益比較',
    description: '即時比較 Binance、Bybit、OKX、Bitget 等主流交易所的穩定幣活期理財年化收益率（APY）',
    siteName: 'CexEarn',
  },
  twitter: {
    card: 'summary_large_image',
    title: 'CexEarn - 中心化交易所活期理財收益比較',
    description: '即時比較 Binance、Bybit、OKX、Bitget 等主流交易所的穩定幣活期理財年化收益率（APY）',
    creator: '@yuhsien0411',
    images: ['https://cexearn.vercel.app/og-image.png'],
  },
}

export default function RootLayout({
  children,
}: {
  children: React.ReactNode
}) {
  return (
    <html lang="zh-TW">
      <body
        className={`${geistSans.variable} ${geistMono.variable} antialiased`}
      >
        {children}
      </body>
    </html>
  )
}
