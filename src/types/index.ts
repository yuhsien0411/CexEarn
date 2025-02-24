export interface ApiResponse {
  success: boolean;
  data?: Product[];
  error?: string;
}

export interface Product {
  id: string;
  exchange: string;
  exchangeLogo: string;
  currency: string;
  apy: number;
  apyHistory: {
    '1d': number[];
    '1w': number[];
    '1m': number[];
  };
  minAmount: number;
  maxAmount: number | null;
  updateTime: number;
}

export interface BybitProductResponse {
  retCode: number;
  retMsg: string;
  result: {
    list: {
      category: 'FlexibleSaving';
      estimateApr: string;
      coin: string;
      minStakeAmount: string;
      maxStakeAmount: string;
      precision: string;
      productId: string;
      status: 'Available' | 'NotAvailable';
    }[];
  };
}

// Binance API 響應介面
export interface BinanceHistoryItem {
  asset: string;
  apy: number;
  timestamp: number;
}

// Bybit API 響應介面
export interface BybitHistoryItem {
  coin: string;
  apr: string;
  timestamp: number;
}

// OKX API 響應介面
export interface OKXHistoryItem {
  ccy: string;
  apy: string;
  timestamp: number;
}

// Bitget API 響應介面
export interface BitgetHistoryItem {
  currency: string;
  apy: number;
  timestamp: number;
}

// 交易所產品數據介面
export interface BinanceProduct {
  asset: string;
  apy: number;
  minPurchaseAmount: number;
  maxPurchaseAmount: number | null;
}

export interface BybitProduct {
  coin: string;
  estimateApr: string;
  minStakeAmount: string;
  maxStakeAmount: string | null;
  history: BybitHistoryItem[];
}

export interface OKXProduct {
  ccy: string;
  apy: string;
  minAmt: string;
  maxAmt: string | null;
  apyHistory: OKXHistoryItem[];
}

export interface BitgetProduct {
  currency: string;
  apy: string;
  minAmount: string;
  maxAmount: string | null;
  apyHistory: BitgetHistoryItem[];
} 