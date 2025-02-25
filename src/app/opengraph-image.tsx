import { ImageResponse } from 'next/og'

// 路由段配置
export const runtime = 'edge'

// 圖片元數據
export const alt = 'CexEarn - 中心化交易所活期理財收益比較'
export const size = {
  width: 1200,
  height: 630,
}
export const contentType = 'image/png'

// 圖片生成
export default async function Image() {
  return new ImageResponse(
    (
      <div
        style={{
          height: '100%',
          width: '100%',
          display: 'flex',
          flexDirection: 'column',
          alignItems: 'center',
          justifyContent: 'center',
          background: 'linear-gradient(to bottom right, #EFF6FF, #DBEAFE)',
          padding: 48,
        }}
      >
        <div
          style={{
            display: 'flex',
            alignItems: 'center',
            justifyContent: 'center',
            marginBottom: 48,
          }}
        >
          <div
            style={{
              fontSize: 64,
              background: 'linear-gradient(to bottom right, #3B82F6, #1D4ED8)',
              width: 96,
              height: 96,
              display: 'flex',
              alignItems: 'center',
              justifyContent: 'center',
              borderRadius: '50%',
              color: 'white',
              fontWeight: 700,
              marginRight: 24,
            }}
          >
            C
          </div>
          <div
            style={{
              fontSize: 64,
              fontWeight: 700,
              background: 'linear-gradient(to bottom right, #1E40AF, #1E3A8A)',
              backgroundClip: 'text',
              color: 'transparent',
            }}
          >
            CexEarn
          </div>
        </div>
        <div
          style={{
            fontSize: 36,
            fontWeight: 500,
            color: '#1E40AF',
            textAlign: 'center',
            marginBottom: 24,
          }}
        >
          中心化交易所活期理財收益比較
        </div>
        <div
          style={{
            display: 'flex',
            alignItems: 'center',
            justifyContent: 'center',
            gap: 24,
          }}
        >
          {['USDT', 'USDC', 'DAI'].map((coin) => (
            <div
              key={coin}
              style={{
                background: 'white',
                padding: '12px 24px',
                borderRadius: 12,
                fontSize: 24,
                fontWeight: 600,
                color: '#1E40AF',
                boxShadow: '0 4px 6px -1px rgba(0, 0, 0, 0.1)',
              }}
            >
              {coin}
            </div>
          ))}
        </div>
      </div>
    ),
    {
      ...size,
    }
  )
} 