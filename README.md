# CexEarn - 中心化交易所活期理財收益比較

這是一個用於比較各大中心化交易所（CEX）活期理財產品收益率的工具。支持即時查看 Binance（幣安）、Bybit、OKX 和 Bitget 等主流交易所的穩定幣活期理財產品的年化收益率（APY）。

## 版本記錄

### v0.1.3 (2025-02-27)
- 🐛 修復 Bitget DAI 產品利率顯示問題
- 🔄 優化請求中止邏輯
- 🛠️ 改進錯誤處理機制
- ⚡️ 提升數據加載穩定性
- 🎨 優化類型安全性

### v0.1.2 (2025-02-26)
- 🎨 優化歷史趨勢圖表顯示
- 🔄 改進數據刷新機制
- 🛠️ 簡化界面，移除最低投資額顯示
- ⚡️ 優化數據加載性能
- 🐛 修復圖表切換時的顯示問題

### v0.1.1 (2025-02-25)
- 🔄 更新 Bitget API 整合
- 🛠️ 優化數據緩存機制
- 🐛 修復歷史數據顯示問題
- ⚡️ 提升頁面載入性能
- 🎨 改進錯誤處理和重試機制

### v0.1.0 (2025-02-22)
- 🎉 初始版本發布
- ✨ 支持 USDT、USDC、DAI 三種穩定幣
- 📊 顯示各交易所即時收益率
- 📈 歷史趨勢圖表（24H/1W/1M）
- 🔄 自動數據更新
- 💅 響應式設計

## 功能特點

- 多交易所數據整合：同時追蹤 Binance、Bybit、OKX、Bitget 的收益率
- 實時數據更新：每 5 分鐘自動更新一次數據
- 歷史趨勢分析：支持 24 小時、1 週、1 個月的趨勢圖表
- 智能數據刷新：僅在切換時間週期時更新相關數據
- 優化的用戶界面：簡潔清晰的數據展示
- 響應式設計：完美支持桌面端和移動端

## 技術棧

- Next.js 15.1.7
- React 19.0.0
- TypeScript 5
- Tailwind CSS 3.4.1
- Recharts 2.15.1

## 安裝步驟

### 前置要求

- Node.js 18+
- npm 或 yarn

1. 克隆專案：
```bash
git clone https://github.com/yuhsien0411/CexEarn.git
```

2. 安裝依賴：
```bash
npm install
```

3. 配置環境變量：
創建 `.env.local` 文件並添加以下配置：
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
2. 查看即時數據：表格顯示各交易所當前和歷史的年化收益率
3. 查看歷史趨勢：圖表展示各交易所的收益率變化趨勢
4. 篩選時間範圍：可選擇查看 24H、1W 或 1M 的歷史數據
5. 自動更新：數據每 5 分鐘自動更新一次
6. 智能刷新：切換時間週期時只更新圖表數據

## 數據來源說明

### Binance
- 產品列表：`GET /sapi/v1/simple-earn/flexible/list`
- 歷史利率：`GET /sapi/v1/simple-earn/flexible/history/rateHistory`
- 更新頻率：每 5 分鐘
- 支持功能：完整歷史數據、當前利率、產品詳情

### OKX
- 當前利率：`GET /api/v5/finance/savings/lending-rate-summary`
- 歷史利率：`GET /api/v5/finance/savings/lending-rate-history`
- 更新頻率：每 5 分鐘
- 支持功能：完整歷史數據、當前利率

### Bybit
- 產品列表：`GET /v5/earn/product`
- 查詢參數：`category=FlexibleSaving`
- 更新頻率：每 5 分鐘
- 支持功能：當前利率、產品詳情

### Bitget
- 產品列表：`GET /api/v2/earn/savings/product`
- 查詢參數：`filter=available_and_held`
- 更新頻率：每 5 分鐘
- 支持功能：當前利率、產品詳情、階梯收益

## 注意事項

- API 密鑰安全：僅使用只讀權限的 API 密鑰
- 數據更新頻率：受限於各交易所的 API 限制
- 數據準確性：收益率數據僅供參考，實際收益可能有所不同
- 緩存機制：使用 2 分鐘的數據緩存以優化性能

## 開發計劃

### v0.2.0 (計劃中)
- [ ] 添加 KuCoin 交易所支持
- [ ] 實現數據持久化存儲
- [ ] 添加用戶自定義提醒功能
- [ ] 支持更多穩定幣種類
- [ ] 添加收益率比較分析

### v0.3.0 (計劃中)
- [ ] 添加收益率變化提醒
- [ ] 支持自定義數據更新頻率
- [ ] 添加歷史數據導出功能
- [ ] 優化移動端體驗
- [ ] 添加暗色主題支持

## 貢獻指南

歡迎提交 Pull Request 或創建 Issue 來幫助改進這個項目。在提交之前，請確保：

1. 代碼符合項目的編碼規範
2. 添加適當的測試用例
3. 更新相關文檔

## 授權協議

MIT License 

## 聯繫方式

如有問題或建議，請通過以下方式聯繫：

- GitHub Issues
- Email: yuhsien0411@gmail.com 