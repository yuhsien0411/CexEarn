export interface ApiResponse {
  success: boolean;
  data: Product[];
  error?: string;
}

export interface Product {
  id: string;
  exchange: string;
  exchangeLogo: string;
  name: string;
  apy: number;
  apyHistory: {
    '1d': number;
    '3d': number;
    '5d': number;
    '1w': number;
    '2w': number;
    '3w': number;
    '1m': number;
  };
  minAmount: string;
  maxAmount?: string;
  currency: 'USDT' | 'USDC' | 'DAI';
  lockPeriod: string;
  link: string;
  updatedAt: string;
  isFlexible: boolean;
  status: 'Available' | 'NotAvailable';
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