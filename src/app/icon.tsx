import { ImageResponse } from 'next/og'

// 路由段配置
export const runtime = 'edge'

// 圖片元數據
export const size = {
  width: 32,
  height: 32,
}
export const contentType = 'image/png'

// 圖片生成
export default function Icon() {
  return new ImageResponse(
    (
      <div
        style={{
          fontSize: 24,
          background: 'linear-gradient(to bottom right, #3B82F6, #1D4ED8)',
          width: '100%',
          height: '100%',
          display: 'flex',
          alignItems: 'center',
          justifyContent: 'center',
          borderRadius: '50%',
          color: 'white',
          fontWeight: 700,
        }}
      >
        C
      </div>
    ),
    {
      ...size,
    }
  )
} 