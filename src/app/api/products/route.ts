import { NextResponse } from 'next/server';
import type { 
  Product,
  ApiResponse,
  BinanceFlexibleProduct,
  BinanceFlexibleResponse,
  BinanceHistoryProduct,
  BinanceHistoryResponse,
  BybitProduct,
  BybitResponse,
  OKXProduct,
  OKXHistoryItem,
  BitgetProduct,
  BitgetHistoryItem,
  BitgetResponse,
  BitgetHistoryResponse,
  OKXResponse,
  OKXLendingRateItem,
  OKXLendingSummaryItem
} from '@/types';
import crypto from 'crypto';

// 定義支持的穩定幣列表
const SUPPORTED_STABLECOINS = ['USDT', 'USDC', 'DAI'] as const;
type SupportedStablecoin = typeof SUPPORTED_STABLECOINS[number];

// 簡單的記憶體緩存
const CACHE = {
  data: new Map<string, Product[]>(),
  timestamp: new Map<string, number>(),
  CACHE_DURATION: 2 * 60 * 1000, // 2分鐘緩存
};

// 檢查緩存是否有效
function isCacheValid(key: string): boolean {
  const timestamp = CACHE.timestamp.get(key);
  if (!timestamp) return false;
  return Date.now() - timestamp < CACHE.CACHE_DURATION;
}

// 獲取緩存數據
function getCachedData(key: string): Product[] | null {
  if (!isCacheValid(key)) return null;
  return CACHE.data.get(key) || null;
}

// 設置緩存數據
function setCacheData(key: string, data: Product[]) {
  CACHE.data.set(key, data);
  CACHE.timestamp.set(key, Date.now());
}

// 生成歷史數據
function generateHistoricalData(points: number, baseApy: number): number[] {
  return Array.from({ length: points }, () => baseApy);
}

// 生成幣安 API 簽名
function generateBinanceSignature(queryString: string, apiSecret: string): string {
  return crypto
    .createHmac('sha256', apiSecret)
    .update(queryString)
    .digest('hex');
}

// 獲取幣安產品數據
async function fetchBinanceProducts(): Promise<Product[]> {
  try {
    const timestamp = Date.now();
    const queryString = `current=1&size=100&timestamp=${timestamp}`;
    const signature = generateBinanceSignature(queryString, process.env.BINANCE_API_SECRET || '');

    const response = await fetch(
      `https://api.binance.com/sapi/v1/simple-earn/flexible/list?${queryString}&signature=${signature}`,
      {
        headers: {
          'X-MBX-APIKEY': process.env.BINANCE_API_KEY || ''
        }
      }
    );

    if (!response.ok) {
      const errorText = await response.text();
      throw new Error(`Binance API error: ${response.statusText}, ${errorText}`);
    }

    const data = await response.json() as BinanceFlexibleResponse;
    const products = data.rows || [];
    
    // 獲取歷史數據
    const historyPromises = SUPPORTED_STABLECOINS.map(async (coin) => {
      const product = products.find((p: BinanceFlexibleProduct) => p.asset === coin);
      if (!product?.productId) return { coin, history: [] };

      const endTime = timestamp;
      const startTime = endTime - 30 * 24 * 60 * 60 * 1000; // 30天
      const historyQueryString = `productId=${product.productId}&startTime=${startTime}&endTime=${endTime}&current=1&size=100&timestamp=${timestamp}`;
      const historySignature = generateBinanceSignature(historyQueryString, process.env.BINANCE_API_SECRET || '');
      
      const historyResponse = await fetch(
        `https://api.binance.com/sapi/v1/simple-earn/flexible/history/rateHistory?${historyQueryString}&signature=${historySignature}`,
        {
          headers: {
            'X-MBX-APIKEY': process.env.BINANCE_API_KEY || ''
          }
        }
      );

      if (!historyResponse.ok) {
        console.error(`獲取幣安歷史數據失敗 (${coin}):`, await historyResponse.text());
        return { coin, history: [] };
      }

      const historyData = await historyResponse.json() as BinanceHistoryResponse;
      return { 
        coin, 
        history: historyData.rows.sort((a, b) => b.time - a.time) 
      };
    });

    const histories = await Promise.all(historyPromises);

    return SUPPORTED_STABLECOINS.map(coin => {
      const product = products.find((p: BinanceFlexibleProduct) => p.asset === coin);
      const history = histories.find(h => h.coin === coin)?.history || [];
      const currentApy = parseFloat(product?.latestAnnualPercentageRate || '0');

      // 如果有歷史數據就使用，否則用當前值填充
      const getHistoryOrFallback = (count: number) => {
        if (history.length >= count) {
          return history.slice(0, count).map(h => parseFloat(h.annualPercentageRate));
        }
        return Array(count).fill(currentApy);
      };

      return {
        id: `binance-${coin.toLowerCase()}-flexible`,
        exchange: 'Binance',
        exchangeLogo: '/logos/binance.svg',
        currency: coin as SupportedStablecoin,
        apy: currentApy,
        apyHistory: {
          '1d': getHistoryOrFallback(12),
          '1w': getHistoryOrFallback(28),
          '1m': getHistoryOrFallback(120)
        },
        minAmount: parseFloat(product?.minPurchaseAmount || '0.1'),
        maxAmount: null,
        updateTime: timestamp
      };
    });
  } catch (error) {
    console.error('獲取幣安產品數據失敗:', error);
    return [];
  }
}

// 獲取 Bybit 產品數據
async function fetchBybitProducts(): Promise<Product[]> {
  try {
    const timestamp = Date.now();
    const response = await fetch(
      'https://api.bybit.com/v5/earn/product?category=FlexibleSaving',
      {
        headers: {
          'Content-Type': 'application/json'
        }
      }
    );

    if (!response.ok) {
      throw new Error(`Bybit API error: ${response.statusText}`);
    }

    const data = await response.json() as BybitResponse;
    
    if (data.retCode !== 0) {
      throw new Error(`Bybit API error: ${data.retMsg}`);
    }

    const products = data.result.list;

    return SUPPORTED_STABLECOINS.map(coin => {
      const product = products.find(p => p.coin === coin && p.status === 'Available');
      
      return {
        id: `bybit-${coin.toLowerCase()}-flexible`,
        exchange: 'Bybit',
        exchangeLogo: '/logos/bybit.svg',
        currency: coin as SupportedStablecoin,
        apy: parseFloat((product?.estimateApr || '0').replace('%', '')),
        apyHistory: {
          '1d': Array(12).fill(parseFloat((product?.estimateApr || '0').replace('%', ''))),
          '1w': Array(28).fill(parseFloat((product?.estimateApr || '0').replace('%', ''))),
          '1m': Array(120).fill(parseFloat((product?.estimateApr || '0').replace('%', '')))
        },
        minAmount: parseFloat(product?.minStakeAmount || '1'),
        maxAmount: product?.maxStakeAmount ? parseFloat(product.maxStakeAmount) : null,
        updateTime: timestamp
      };
    });
  } catch (error) {
    console.error('獲取 Bybit 產品數據失敗:', error);
    return [];
  }
}

// 獲取 OKX 產品數據
async function fetchOKXProducts(): Promise<Product[]> {
  try {
    // 獲取當前利率
    const response = await fetch(
      'https://www.okx.com/api/v5/finance/savings/lending-rate-summary',
      {
        headers: {
          'Content-Type': 'application/json'
        }
      }
    );

    if (!response.ok) {
      const errorText = await response.text();
      throw new Error(`OKX API error: ${response.statusText}, ${errorText}`);
    }

    const data = await response.json() as OKXResponse;
    
    if (data.code !== '0') {
      throw new Error(`OKX API error: ${data.msg}`);
    }

    const products = data.data as OKXLendingSummaryItem[];

    // 獲取歷史利率數據
    const historyPromises = SUPPORTED_STABLECOINS.map(async (coin) => {
      const now = Date.now();
      const oneMonthAgo = now - 30 * 24 * 60 * 60 * 1000;

      const historyResponse = await fetch(
        `https://www.okx.com/api/v5/finance/savings/lending-rate-history?ccy=${coin}&before=${now}&after=${oneMonthAgo}&limit=100`,
        {
          headers: {
            'Content-Type': 'application/json'
          }
        }
      );

      if (!historyResponse.ok) {
        console.error(`獲取 OKX 歷史數據失敗 (${coin}):`, await historyResponse.text());
        return { coin, history: [] };
      }

      const historyData = await historyResponse.json() as OKXResponse;
      if (historyData.code !== '0') {
        // 如果代幣不支持，靜默返回空歷史記錄
        if (historyData.msg?.includes('not supported')) {
          console.log(`OKX 不支持 ${coin} 的歷史數據`);
          return { coin, history: [] };
        }
        console.error(`獲取 OKX 歷史數據失敗 (${coin}):`, historyData.msg);
        return { coin, history: [] };
      }

      const historyItems = historyData.data as OKXLendingRateItem[];
      return {
        coin,
        history: historyItems
          .sort((a, b) => parseInt(b.ts) - parseInt(a.ts))
          .map((h) => ({
            rate: parseFloat(h.rate),
            timestamp: parseInt(h.ts)
          }))
      };
    });

    const histories = await Promise.all(historyPromises);

    return SUPPORTED_STABLECOINS.map(coin => {
      const product = products.find((p) => p.ccy === coin);
      const history = histories.find(h => h.coin === coin)?.history || [];
      
      // 如果產品不存在，返回零利率
      if (!product) {
        return {
          id: `okx-${coin.toLowerCase()}-flexible`,
          exchange: 'OKX',
          exchangeLogo: '/logos/okx.svg',
          currency: coin as SupportedStablecoin,
          apy: 0,
          apyHistory: {
            '1d': Array(12).fill(0),
            '1w': Array(28).fill(0),
            '1m': Array(120).fill(0)
          },
          minAmount: 1,
          maxAmount: null,
          updateTime: Date.now()
        };
      }

      const currentApy = parseFloat(product.estRate);

      // 根據時間範圍獲取歷史數據或使用當前值填充
      const getHistoryOrFallback = (count: number, timeRange: number) => {
        const now = Date.now();
        const targetTime = now - timeRange;
        const relevantHistory = history.filter(h => h.timestamp >= targetTime);

        if (relevantHistory.length >= count) {
          return relevantHistory.slice(0, count).map(h => h.rate);
        }
        return Array(count).fill(currentApy);
      };

      return {
        id: `okx-${coin.toLowerCase()}-flexible`,
        exchange: 'OKX',
        exchangeLogo: '/logos/okx.svg',
        currency: coin as SupportedStablecoin,
        apy: currentApy,
        apyHistory: {
          '1d': getHistoryOrFallback(12, 24 * 60 * 60 * 1000),
          '1w': getHistoryOrFallback(28, 7 * 24 * 60 * 60 * 1000),
          '1m': getHistoryOrFallback(120, 30 * 24 * 60 * 60 * 1000)
        },
        minAmount: 1,
        maxAmount: null,
        updateTime: Date.now()
      };
    });
  } catch (error) {
    console.error('獲取 OKX 產品數據失敗:', error);
    return [];
  }
}

// 獲取 Bitget 產品數據
async function fetchBitgetProducts(): Promise<Product[]> {
  try {
    const timestamp = Date.now().toString();
    const apiKey = process.env.BITGET_API_KEY;
    const apiSecret = process.env.BITGET_API_SECRET;
    const passphrase = process.env.BITGET_PASSPHRASE;

    if (!apiKey || !apiSecret || !passphrase) {
      throw new Error('Bitget API 憑證未設置');
    }

    // 生成簽名
    const path = '/api/v2/earn/savings/product';
    const queryString = 'filter=available_and_held';
    const signStr = timestamp + 'GET' + path + '?' + queryString;
    const signature = crypto
      .createHmac('sha256', apiSecret)
      .update(signStr)
      .digest('base64');

    // 獲取產品列表
    const productResponse = await fetch(
      `https://api.bitget.com${path}?${queryString}`,
      {
        headers: {
          'ACCESS-KEY': apiKey,
          'ACCESS-SIGN': signature,
          'ACCESS-TIMESTAMP': timestamp,
          'ACCESS-PASSPHRASE': passphrase,
          'Content-Type': 'application/json',
          'locale': 'en-US'
        }
      }
    );

    if (!productResponse.ok) {
      const errorText = await productResponse.text();
      throw new Error(`Bitget API error: ${productResponse.statusText}, ${errorText}`);
    }

    const productData = await productResponse.json() as BitgetResponse;
    
    if (productData.code !== '00000') {
      throw new Error(`Bitget API error: ${productData.msg}`);
    }

    const products = productData.data || [];

    return SUPPORTED_STABLECOINS.map(coin => {
      const product = products.find((p: BitgetProduct) => 
        p.coin === coin && 
        p.periodType === 'flexible'
      );

      if (!product) {
        return {
          id: `bitget-${coin.toLowerCase()}-flexible`,
          exchange: 'Bitget',
          exchangeLogo: '/logos/bitget.svg',
          currency: coin as SupportedStablecoin,
          apy: 0,
          apyHistory: {
            '1d': Array(12).fill(0),
            '1w': Array(28).fill(0),
            '1m': Array(120).fill(0)
          },
          minAmount: 100,
          maxAmount: null,
          updateTime: Date.now()
        };
      }

      // 獲取大於 500U 的階梯利率
      const targetStep = product.apyList.find(step => 
        parseFloat(step.minStepVal) >= 500 || 
        (parseFloat(step.minStepVal) < 500 && parseFloat(step.maxStepVal) > 500)
      );
      
      // 如果找不到合適的階梯，使用最高階梯
      const currentApy = targetStep 
        ? parseFloat(targetStep.currentApy)
        : Math.max(...product.apyList.map(step => parseFloat(step.currentApy)));

      // 獲取最小和最大投資額
      const minAmount = parseFloat(product.apyList[0]?.minStepVal || '100');
      const maxAmount = parseFloat(
        product.apyList[product.apyList.length - 1]?.maxStepVal || '0'
      );
      
      return {
        id: `bitget-${coin.toLowerCase()}-flexible`,
        exchange: 'Bitget',
        exchangeLogo: '/logos/bitget.svg',
        currency: coin as SupportedStablecoin,
        apy: currentApy,
        apyHistory: {
          '1d': Array(12).fill(currentApy),
          '1w': Array(28).fill(currentApy),
          '1m': Array(120).fill(currentApy)
        },
        minAmount: minAmount,
        maxAmount: maxAmount > 0 ? maxAmount : null,
        updateTime: Date.now()
      };
    });
  } catch (error) {
    console.error('獲取 Bitget 產品數據失敗:', error);
    return [];
  }
}

// 確保路由配置正確
export const dynamic = 'force-dynamic';
export const revalidate = 0;

export async function GET(request: Request) {
  try {
    const { searchParams } = new URL(request.url);
    const period = searchParams.get('period') || '1d';
    const coin = searchParams.get('coin') || 'USDT';

    // 檢查緩存
    const cacheKey = `${period}-${coin}`;
    const cachedData = getCachedData(cacheKey);
    if (cachedData) {
      return NextResponse.json({ 
        success: true, 
        data: cachedData 
      });
    }

    // 從各個交易所獲取數據
    const [binanceProducts, bybitProducts, okxProducts, bitgetProducts] = await Promise.all([
      fetchBinanceProducts(),
      fetchBybitProducts(),
      fetchOKXProducts(),
      fetchBitgetProducts()
    ]);

    // 合併所有產品數據並按幣種過濾
    const products: Product[] = [
      ...binanceProducts,
      ...bybitProducts,
      ...okxProducts,
      ...bitgetProducts
    ]
    .filter(product => product.currency === coin)
    .sort((a, b) => b.apy - a.apy);

    // 設置緩存
    setCacheData(cacheKey, products);

    return NextResponse.json({ 
      success: true, 
      data: products 
    });
  } catch (error) {
    console.error('API Error:', error);
    return NextResponse.json(
      { success: false, error: '獲取數據失敗' },
      { status: 500 }
    );
  }
}