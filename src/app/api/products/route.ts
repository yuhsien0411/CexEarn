import { NextResponse } from 'next/server';
import type { Product, BybitProductResponse } from '@/types';
import crypto from 'crypto';

// 定義支持的穩定幣列表
const SUPPORTED_STABLECOINS = ['USDT', 'USDC', 'DAI'] as const;
type SupportedStablecoin = typeof SUPPORTED_STABLECOINS[number];

// 定義幣安 API 響應類型
interface BinanceFlexibleProductResponse {
  rows: {
    asset: string;
    latestAnnualPercentageRate: string;
    tierAnnualPercentageRate?: {
      [key: string]: number;
    };
    airDropPercentageRate?: string;
    canPurchase: boolean;
    canRedeem: boolean;
    isSoldOut: boolean;
    hot: boolean;
    minPurchaseAmount: string;
    productId: string;
    subscriptionStartTime: string;
    status: string;
  }[];
  total: number;
}

// 定義幣安利率歷史 API 響應類型
interface BinanceRateHistoryResponse {
  rows: {
    productId: string;
    asset: string;
    annualPercentageRate: string;
    time: number;
  }[];
  total: string;
}

// 定義 OKX API 響應類型
interface OKXProductResponse {
  code: string;
  data: {
    ccy: string;
    avgRate: string;  // 平均利率
    estRate: string;  // 預估利率
    avgAmt: string;   // 平均借貸量
  }[];
  msg: string;
}

// 定義 Bitget API 響應類型
interface BitgetProductResponse {
  code: string;
  data: {
    productId: string;
    coin: string;
    periodType: 'flexible' | 'fixed';
    apyType: 'single' | 'ladder';
    advanceRedeem: 'Yes' | 'No';
    settleMethod: 'daily' | 'maturity';
    apyList: {
      rateLevel: string;
      minStepVal: string;
      maxStepVal: string;
      currentApy: string;
    }[];
    status: 'not_started' | 'in_progress' | 'paused' | 'completed' | 'sold_out';
    productLevel: 'beginner' | 'normal' | 'VIP';
  }[];
  msg: string;
}

// 生成幣安 API 簽名
function generateBinanceSignature(queryString: string, apiSecret: string): string {
  return crypto
    .createHmac('sha256', apiSecret)
    .update(queryString)
    .digest('hex');
}

// 獲取幣安利率歷史數據
async function fetchBinanceRateHistory(productId: string, apiKey: string, apiSecret: string): Promise<Product['apyHistory']> {
  try {
    const now = Date.now();
    const oneMonthAgo = now - 30 * 24 * 60 * 60 * 1000;
    
    const queryParams = {
      productId,
      aprPeriod: 'DAY',
      startTime: oneMonthAgo.toString(),
      endTime: now.toString(),
      size: '100',
      timestamp: now.toString()
    };

    // 按字母順序排序參數
    const queryString = Object.entries(queryParams)
      .sort(([a], [b]) => a.localeCompare(b))
      .map(([key, value]) => `${key}=${value}`)
      .join('&');
    
    const signature = generateBinanceSignature(queryString, apiSecret);
    
    const response = await fetch(
      `https://api.binance.com/sapi/v1/simple-earn/flexible/history/rateHistory?${queryString}&signature=${signature}`,
      {
        method: 'GET',
        headers: {
          'Content-Type': 'application/json',
          'X-MBX-APIKEY': apiKey,
        }
      }
    );

    const data: BinanceRateHistoryResponse = await response.json();
    
    if (!data.rows || !Array.isArray(data.rows)) {
      console.error('幣安利率歷史數據格式錯誤:', data);
      throw new Error('無效的數據格式');
    }

    // 按時間排序並轉換利率
    const sortedRates = data.rows
      .sort((a, b) => a.time - b.time) // 從舊到新排序
      .map(rate => ({
        time: rate.time,
        rate: parseFloat(rate.annualPercentageRate) * 100 // 轉換為百分比
      }));

    if (sortedRates.length === 0) {
      throw new Error('沒有歷史數據');
    }

    // 計算不同時間段的平均利率
    const calculateAverageRate = (days: number) => {
      const targetTime = now - days * 24 * 60 * 60 * 1000;
      const relevantRates = sortedRates.filter(r => r.time >= targetTime);
      if (relevantRates.length === 0) {
        return sortedRates[sortedRates.length - 1].rate; // 如果沒有數據，使用最新的利率
      }
      const sum = relevantRates.reduce((acc, curr) => acc + curr.rate, 0);
      return +(sum / relevantRates.length).toFixed(2);
    };

    const history = {
      '1d': calculateAverageRate(1),
      '3d': calculateAverageRate(3),
      '5d': calculateAverageRate(5),
      '1w': calculateAverageRate(7),
      '2w': calculateAverageRate(14),
      '3w': calculateAverageRate(21),
      '1m': calculateAverageRate(30)
    };

    console.log('歷史數據:', history);
    return history;
  } catch (error) {
    console.error('獲取幣安利率歷史數據失敗:', error);
    return {
      '1d': 0,
      '3d': 0,
      '5d': 0,
      '1w': 0,
      '2w': 0,
      '3w': 0,
      '1m': 0,
    };
  }
}

async function fetchBybitProducts(): Promise<Product[]> {
  try {
    // 獲取所有支持的穩定幣數據
    const productPromises = SUPPORTED_STABLECOINS.map(async (coin) => {
      const response = await fetch(`https://api.bybit.com/v5/earn/product?category=FlexibleSaving&coin=${coin}`, {
        method: 'GET',
        headers: {
          'Content-Type': 'application/json',
        }
      });

      const data: BybitProductResponse = await response.json();
      return { data, originalCoin: coin };
    });

    const results = await Promise.all(productPromises);
    
    // 處理所有響應
    const products = results.flatMap(({ data, originalCoin }) => {
      if (data.retCode !== 0) {
        console.warn(`獲取產品數據失敗: ${data.retMsg}`);
        return [];
      }

      return data.result.list
        .filter((item: BybitProductResponse['result']['list'][0]) => 
          (item.status === 'Available' || item.status === 'NotAvailable')
        )
        .map((item: BybitProductResponse['result']['list'][0]) => {
          const currentApy = parseFloat(item.estimateApr.replace('%', ''));
          return {
            id: `bybit-${originalCoin.toLowerCase()}-${item.productId}`,
            exchange: 'Bybit',
            exchangeLogo: '/logos/bybit.svg',
            name: `${originalCoin} 活期理財`,
            apy: currentApy,
            apyHistory: {
              '1d': currentApy,
              '3d': currentApy,
              '5d': currentApy,
              '1w': currentApy,
              '2w': currentApy,
              '3w': currentApy,
              '1m': currentApy,
            },
            minAmount: item.minStakeAmount,
            maxAmount: item.maxStakeAmount,
            currency: originalCoin as SupportedStablecoin,
            lockPeriod: '活期',
            link: `https://www.bybit.com/earn/flexible/${item.coin.toLowerCase()}`,
            updatedAt: new Date().toISOString(),
            isFlexible: true,
            status: item.status as 'Available' | 'NotAvailable'
          };
        });
    });

    return products;
  } catch (error) {
    console.error('Error fetching Bybit products:', error);
    return [];
  }
}

async function fetchBinanceProducts(): Promise<Product[]> {
  try {
    const products: Product[] = [];
    const apiKey = process.env.BINANCE_API_KEY;
    const apiSecret = process.env.BINANCE_API_SECRET;

    if (!apiKey || !apiSecret) {
      console.error('幣安 API 密鑰未設置');
      return [];
    }
    
    // 獲取所有支持的穩定幣數據
    for (const coin of SUPPORTED_STABLECOINS) {
      try {
        const timestamp = Date.now();
        const queryString = `asset=${coin}&timestamp=${timestamp}`;
        const signature = generateBinanceSignature(queryString, apiSecret);
        
        const response = await fetch(
          `https://api.binance.com/sapi/v1/simple-earn/flexible/list?${queryString}&signature=${signature}`,
          {
            method: 'GET',
            headers: {
              'Content-Type': 'application/json',
              'X-MBX-APIKEY': apiKey,
            }
          }
        );

        const data: BinanceFlexibleProductResponse = await response.json();
        
        // 處理每個產品
        for (const item of data.rows) {
          if (item.canPurchase && !item.isSoldOut) {
            const currentApy = parseFloat(item.latestAnnualPercentageRate);
            // 獲取歷史利率數據
            const apyHistory = await fetchBinanceRateHistory(item.productId, apiKey, apiSecret);
            
            products.push({
              id: `binance-${coin.toLowerCase()}-${item.productId}`,
              exchange: 'Binance',
              exchangeLogo: '/logos/binance.svg',
              name: `${coin} 活期理財`,
              apy: currentApy,
              apyHistory,
              minAmount: item.minPurchaseAmount,
              currency: coin as SupportedStablecoin,
              lockPeriod: '活期',
              link: 'https://www.binance.com/zh-TC/simple-earn',
              updatedAt: new Date().toISOString(),
              isFlexible: true,
              status: item.canPurchase ? 'Available' : 'NotAvailable'
            });
          }
        }
      } catch (error) {
        console.error(`獲取幣安 ${coin} 數據失敗:`, error);
      }
    }
    
    return products;
  } catch (error) {
    console.error('獲取幣安產品數據失敗:', error);
    return [];
  }
}

// 更新 OKX 產品獲取函數
async function fetchOKXProducts(): Promise<Product[]> {
  try {
    const products: Product[] = [];
    
    // 獲取所有支持的穩定幣數據
    for (const coin of SUPPORTED_STABLECOINS) {
      try {
        const response = await fetch(
          `https://www.okx.com/api/v5/finance/savings/lending-rate-summary?ccy=${coin}`,
          {
            method: 'GET',
            headers: {
              'Content-Type': 'application/json',
            }
          }
        );

        const data: OKXProductResponse = await response.json();
        
        if (data.code === '0' && data.data.length > 0) {
          for (const item of data.data) {
            const currentApy = parseFloat(item.avgRate) * 100; // 轉換為百分比
            const estimatedApy = parseFloat(item.estRate) * 100;
            
            products.push({
              id: `okx-${coin.toLowerCase()}-${item.ccy}`,
              exchange: 'OKX',
              exchangeLogo: '/logos/okx.svg',
              name: `${coin} 活期理財`,
              apy: estimatedApy, // 使用預估利率
              apyHistory: {
                '1d': currentApy,
                '3d': currentApy,
                '5d': currentApy,
                '1w': currentApy,
                '2w': currentApy,
                '3w': currentApy,
                '1m': currentApy,
              },
              minAmount: '1', // OKX API 沒有提供最小金額，設置默認值
              currency: coin as SupportedStablecoin,
              lockPeriod: '活期',
              link: 'https://www.okx.com/earn',
              updatedAt: new Date().toISOString(),
              isFlexible: true,
              status: 'Available' // 假設如果有利率數據就是可用的
            });
          }
        }
      } catch (error) {
        console.error(`獲取 OKX ${coin} 數據失敗:`, error);
      }
    }
    
    return products;
  } catch (error) {
    console.error('獲取 OKX 產品數據失敗:', error);
    return [];
  }
}

// 生成 Bitget API 簽名
function generateBitgetSignature(timestamp: string, method: string, requestPath: string, body: string = '', secretKey: string): string {
  const message = timestamp + method + requestPath + body;
  return crypto
    .createHmac('sha256', secretKey)
    .update(message)
    .digest('base64');
}

// 更新 Bitget 產品獲取函數
async function fetchBitgetProducts(): Promise<Product[]> {
  try {
    const products: Product[] = [];
    const apiKey = process.env.BITGET_API_KEY;
    const apiSecret = process.env.BITGET_API_SECRET;
    const passphrase = process.env.BITGET_PASSPHRASE;

    if (!apiKey || !apiSecret || !passphrase) {
      console.error('Bitget API 密鑰未設置');
      return [];
    }
    
    // 獲取所有支持的穩定幣數據
    for (const coin of SUPPORTED_STABLECOINS) {
      try {
        const timestamp = Date.now().toString();
        const method = 'GET';
        const requestPath = '/api/v2/earn/savings/product';
        const queryString = `?coin=${coin}&filter=available`;
        
        const signature = generateBitgetSignature(
          timestamp,
          method,
          requestPath + queryString,
          '',
          apiSecret
        );
        
        const response = await fetch(
          `https://api.bitget.com${requestPath}${queryString}`,
          {
            method: 'GET',
            headers: {
              'Content-Type': 'application/json',
              'locale': 'zh-CN',
              'ACCESS-KEY': apiKey,
              'ACCESS-SIGN': signature,
              'ACCESS-TIMESTAMP': timestamp,
              'ACCESS-PASSPHRASE': passphrase
            }
          }
        );

        const data: BitgetProductResponse = await response.json();
        console.log(`Bitget ${coin} 響應:`, data);
        
        if (data.code === '00000' && data.data && data.data.length > 0) {
          for (const item of data.data) {
            // 只處理活期產品
            if (item.periodType !== 'flexible') continue;
            
            // 找到 500 以上等級的利率
            const targetApyInfo = item.apyList?.find(apy => {
              const minVal = parseFloat(apy.minStepVal);
              return minVal >= 500;
            });
            
            if (!targetApyInfo) continue;
            
            const currentApy = parseFloat(targetApyInfo.currentApy);
            
            products.push({
              id: `bitget-${coin.toLowerCase()}-${item.productId}`,
              exchange: 'Bitget',
              exchangeLogo: '/logos/bitget.svg',
              name: `${coin} 活期理財 (≥500)`,
              apy: currentApy,
              apyHistory: {
                '1d': currentApy,
                '3d': currentApy,
                '5d': currentApy,
                '1w': currentApy,
                '2w': currentApy,
                '3w': currentApy,
                '1m': currentApy,
              },
              minAmount: '500',
              maxAmount: targetApyInfo.maxStepVal,
              currency: coin as SupportedStablecoin,
              lockPeriod: '活期',
              link: 'https://www.bitget.com/zh-TW/earn/flexible',
              updatedAt: new Date().toISOString(),
              isFlexible: true,
              status: item.status === 'in_progress' ? 'Available' : 'NotAvailable'
            });
          }
        }
      } catch (error) {
        console.error(`獲取 Bitget ${coin} 數據失敗:`, error);
      }
    }
    
    console.log('Bitget 產品列表:', products);
    return products;
  } catch (error) {
    console.error('獲取 Bitget 產品數據失敗:', error);
    return [];
  }
}

// 修改 GET 函數以包含 Bitget 產品
export async function GET() {
  try {
    // 獲取所有交易所的實時數據
    const [bybitProducts, binanceProducts, okxProducts, bitgetProducts] = await Promise.all([
      fetchBybitProducts(),
      fetchBinanceProducts(),
      fetchOKXProducts(),
      fetchBitgetProducts()
    ]);
    
    // 合併所有交易所的數據
    const allProducts = [...bybitProducts, ...binanceProducts, ...okxProducts, ...bitgetProducts];
    
    // 按年化收益率排序
    const sortedProducts = allProducts.sort((a, b) => b.apy - a.apy);

    return new NextResponse(JSON.stringify({
      success: true,
      data: sortedProducts,
    }), {
      status: 200,
      headers: {
        'Content-Type': 'application/json',
      },
    });
  } catch (error) {
    console.error('API 錯誤:', error);
    return new NextResponse(JSON.stringify({
      success: false,
      error: '無法獲取產品數據',
    }), {
      status: 500,
      headers: {
        'Content-Type': 'application/json',
      },
    });
  }
}