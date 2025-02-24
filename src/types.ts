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

export interface ApiResponse {
  success: boolean;
  data?: Product[];
  error?: string;
}

export interface BinanceHistoryItem {
  asset: string;
  apy: number;
  timestamp: number;
}

export interface BybitHistoryItem {
  coin: string;
  apr: string;
  timestamp: number;
}

export interface OKXHistoryItem {
  ccy: string;
  apy: string;
  timestamp: number;
}

export interface BitgetHistoryItem {
  coin: string;
  apy: string;
  createTime: string;
}

export interface BitgetHistoryRecord {
  productId: string;
  coin: string;
  apy: string;
  settleTime: string;
  settleStatus: 'pending' | 'settled';
  settleAmount: string;
  settleTokenAmount: string;
}

export interface BitgetHistoryResponse {
  code: string;
  msg: string;
  requestTime: number;
  data: {
    records: BitgetHistoryRecord[];
  };
}

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
  status: 'Available' | 'NotAvailable';
}

export interface BybitResponse {
  retCode: number;
  retMsg: string;
  result: {
    list: BybitProduct[];
  };
}

export interface OKXProduct {
  ccy: string;
  apy: string;
  minAmt: string;
  maxAmt: string | null;
  apyHistory: OKXHistoryItem[];
}

export interface BitgetApyStep {
  rateLevel: string;
  minStepVal: string;
  maxStepVal: string;
  currentApy: string;
}

export interface BitgetProduct {
  productId: string;
  coin: string;
  periodType: 'flexible' | 'fixed';
  period: string;
  apyType: 'single' | 'ladder';
  advanceRedeem: 'Yes' | 'No';
  settleMethod: 'daily' | 'maturity';
  apyList: BitgetApyStep[];
  status: 'not_started' | 'in_progress' | 'paused' | 'completed' | 'sold_out';
  productLevel: 'beginner' | 'normal' | 'VIP';
}

export interface BitgetResponse {
  code: string;
  msg: string;
  requestTime: number;
  data: BitgetProduct[];
}

export interface BinanceFlexibleProduct {
  asset: string;
  latestAnnualPercentageRate: string;
  minPurchaseAmount: string;
  maxPurchaseAmount: string;
  productId: string;
  status: string;
}

export interface BinanceFlexibleResponse {
  total: number;
  rows: BinanceFlexibleProduct[];
}

export interface BinanceHistoryProduct {
  asset: string;
  annualPercentageRate: string;
  time: number;
}

export interface BinanceHistoryResponse {
  total: number;
  rows: BinanceHistoryProduct[];
}

export interface OKXLendingRateItem {
  ccy: string;
  amt: string;
  rate: string;
  ts: string;
}

export interface OKXLendingSummaryItem {
  ccy: string;
  avgAmt: string;
  avgAmtUsd: string;
  avgRate: string;
  preRate: string;
  estRate: string;
}

export interface OKXResponse {
  code: string;
  msg: string;
  data: OKXLendingRateItem[] | OKXLendingSummaryItem[];
} 