# CexEarn

一個用於追蹤和管理加密貨幣收益的應用程序。

## 功能特點

- 追蹤多個加密貨幣交易所的收益
- 即時價格更新
- 收益統計和分析

## 技術棧

- Next.js 14
- TypeScript
- Tailwind CSS
- Recharts（圖表庫）

## 安裝步驟

### 前置要求

- Node.js
- npm 或 yarn

1. 克隆專案：
```bash
git clone https://github.com/yuhsien0411/CexEarn.git
cd cexearn
```

2. 安裝依賴：
```bash
npm install
```

3. 配置環境變量：
創建 `.env` 文件並添加以下配置：
```env
# Binance API 配置
BINANCE_API_KEY=your_binance_api_key
BINANCE_API_SECRET=your_binance_api_secret

# Bitget API 配置
BITGET_API_KEY=your_bitget_api_key
BITGET_API_SECRET=your_bitget_api_secret
BITGET_PASSPHRASE=your_bitget_passphrase
```

4. 啟動開發服務器：
```bash
npm run dev
```

5. 訪問 [http://localhost:3000](http://localhost:3000) 查看應用

## 使用說明

1. 選擇穩定幣：在頁面頂部選擇要查看的穩定幣（USDT、USDC 或 DAI）
2. 查看即時數據：表格顯示各交易所當前的年化收益率
3. 查看歷史趨勢：圖表展示各交易所的收益率變化趨勢
4. 篩選時間範圍：可選擇查看 24H、1W 或 1M 的歷史數據
5. 產品詳情：點擊「前往投資」可跳轉至相應交易所的投資頁面

## 注意事項

- API 密鑰僅用於讀取數據，不支持交易功能
- 建議使用只讀權限的 API 密鑰
- 數據更新頻率受限於各交易所的 API 限制
- 收益率數據僅供參考，實際收益可能因市場情況而變化

## 貢獻指南

歡迎提交 Pull Request 或創建 Issue 來幫助改進這個項目。

## 授權協議

MIT License 