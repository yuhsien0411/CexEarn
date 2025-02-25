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

// 添加延遲函數
const delay = (ms: number) => new Promise(resolve => setTimeout(resolve, ms));

// 獲取幣安產品數據
async function fetchBinanceProducts(): Promise<Product[]> {
  try {
    // 為每個支持的穩定幣獲取數據
    const productPromises = SUPPORTED_STABLECOINS.map(async (coin) => {
      const timestamp = Date.now();
      const queryString = `asset=${coin}&current=1&size=100&timestamp=${timestamp}`;
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
        console.error(`獲取幣安 ${coin} 數據失敗:`, await response.text());
        return null;
      }

      const data = await response.json() as BinanceFlexibleResponse;
      const product = data.rows?.[0];
      
      if (!product) {
        console.log(`幣安未找到 ${coin} 的活期產品`);
        return null;
      }

      // 獲取歷史數據
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
        return {
          product,
          history: []
        };
      }

      const historyData = await historyResponse.json() as BinanceHistoryResponse;
      return {
        product,
        history: historyData.rows.sort((a, b) => b.time - a.time)
      };
    });

    const results = await Promise.all(productPromises);

    return results
      .filter((result): result is { product: BinanceFlexibleProduct; history: BinanceHistoryProduct[] } => result !== null)
      .map(({ product, history }) => {
        // 將 APY 乘以 100 並格式化為兩位小數
        const formatApy = (apy: number) => Number((apy * 100 * 100).toFixed(2)) / 100;
        const currentApy = formatApy(parseFloat(product.latestAnnualPercentageRate));

        // 如果有歷史數據就使用，否則用當前值填充
        const getHistoryOrFallback = (count: number) => {
          if (history.length >= count) {
            return history
              .slice(0, count)
              .map(h => formatApy(parseFloat(h.annualPercentageRate)));
          }
          return Array(count).fill(currentApy);
        };

        return {
          id: `binance-${product.asset.toLowerCase()}-flexible`,
          exchange: 'Binance',
          exchangeLogo: '/logos/binance.svg',
          currency: product.asset as SupportedStablecoin,
          apy: currentApy,
          apyHistory: {
            '1d': getHistoryOrFallback(12),
            '1w': getHistoryOrFallback(28),
            '1m': getHistoryOrFallback(120)
          },
          updateTime: Date.now()
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
        updateTime: timestamp
      };
    });
  } catch (error) {
    console.error('獲取 Bybit 產品數據失敗:', error);
    return [];
  }
}

interface OKXHistoryEntry {
  rate: number;
  timestamp: number;
}

interface OKXHistoryResult {
  coin: string;
  history: OKXHistoryEntry[];
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
    const histories: OKXHistoryResult[] = [];
    for (const coin of SUPPORTED_STABLECOINS) {
      try {
        // 添加延遲以避免觸發限流
        await delay(500);

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
          histories.push({ coin, history: [] });
          continue;
        }

        const historyData = await historyResponse.json() as OKXResponse;
        if (historyData.code !== '0') {
          if (historyData.msg?.includes('not supported')) {
            console.log(`OKX 不支持 ${coin} 的歷史數據`);
            histories.push({ coin, history: [] });
            continue;
          }
          if (historyData.code === '50011') { // Too Many Requests
            console.log(`OKX API 限流，使用當前利率代替歷史數據 (${coin})`);
            histories.push({ coin, history: [] });
            continue;
          }
          console.error(`獲取 OKX 歷史數據失敗 (${coin}):`, historyData.msg);
          histories.push({ coin, history: [] });
          continue;
        }

        const historyItems = historyData.data as OKXLendingRateItem[];
        histories.push({
          coin,
          history: historyItems
            .sort((a, b) => parseInt(b.ts) - parseInt(a.ts))
            .map((h) => ({
              rate: parseFloat(h.rate),
              timestamp: parseInt(h.ts)
            }))
        });
      } catch (error) {
        console.error(`處理 OKX ${coin} 歷史數據時出錯:`, error);
        histories.push({ coin, history: [] });
      }
    }

    return SUPPORTED_STABLECOINS.map(coin => {
      const product = products.find((p) => p.ccy === coin);
      const historyResult = histories.find(h => h.coin === coin);
      const history = historyResult?.history || [];
      
      // 如果產品不存在或利率為 0，返回空產品
      if (!product || parseFloat(product.estRate) === 0) {
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
          updateTime: Date.now()
        };
      }

      // 將 APY 乘以 100 並格式化為兩位小數
      const formatApy = (apy: number) => Number((apy * 100 * 100).toFixed(2)) / 100;
      const currentApy = formatApy(parseFloat(product.estRate));

      // 根據時間範圍獲取歷史數據或使用當前值填充
      const getHistoryOrFallback = (count: number) => {
        if (history.length >= count) {
          return history.slice(0, count).map(h => formatApy(h.rate));
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
          '1d': getHistoryOrFallback(12),
          '1w': getHistoryOrFallback(28),
          '1m': getHistoryOrFallback(120)
        },
        updateTime: Date.now()
      };
    }).filter(product => product.apy > 0); // 只返回有效的產品
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

    console.log('開始獲取 Bitget 產品數據...');

    // 為每個穩定幣獲取產品
    const productPromises = SUPPORTED_STABLECOINS.map(async (coin) => {
      try {
        // 生成簽名
        const path = '/api/v2/earn/savings/product';
        const queryString = `filter=available&coin=${coin}`;
        const signStr = timestamp + 'GET' + path + '?' + queryString;
        const signature = crypto
          .createHmac('sha256', apiSecret)
          .update(signStr)
          .digest('base64');

        const url = `https://api.bitget.com${path}?${queryString}`;
        console.log(`請求 Bitget API (${coin}):`, {
          url,
          timestamp,
          headers: {
            'ACCESS-KEY': '***',
            'ACCESS-TIMESTAMP': timestamp,
            'Content-Type': 'application/json',
            'locale': 'en-US'
          }
        });

        // 獲取產品列表
        const productResponse = await fetch(url, {
          headers: {
            'ACCESS-KEY': apiKey,
            'ACCESS-SIGN': signature,
            'ACCESS-TIMESTAMP': timestamp,
            'ACCESS-PASSPHRASE': passphrase,
            'Content-Type': 'application/json',
            'locale': 'en-US'
          }
        });

        if (!productResponse.ok) {
          const errorText = await productResponse.text();
          console.error(`Bitget ${coin} API 響應錯誤:`, {
            status: productResponse.status,
            statusText: productResponse.statusText,
            error: errorText
          });
          return { coin, products: [] };
        }

        const productData = await productResponse.json() as BitgetResponse;
        console.log(`Bitget ${coin} API 響應:`, {
          code: productData.code,
          msg: productData.msg,
          dataLength: productData.data?.length || 0
        });
        
        if (productData.code !== '00000') {
          console.error(`Bitget ${coin} API 業務錯誤:`, productData.msg);
          return { coin, products: [] };
        }

        // 打印完整的產品數據
        console.log(`Bitget ${coin} 產品數據:`, JSON.stringify(productData.data, null, 2));

        return { coin, products: productData.data || [] };
      } catch (error) {
        console.error(`獲取 Bitget ${coin} 產品數據時出錯:`, error);
        return { coin, products: [] };
      }
    });

    const results = await Promise.all(productPromises);
    const allProducts = results.flatMap(result => result.products);

    console.log('Bitget 所有產品數據:', {
      totalProducts: allProducts.length,
      products: allProducts.map(p => ({
        coin: p.coin,
        periodType: p.periodType,
        status: p.status,
        apyList: p.apyList
      }))
    });

    return SUPPORTED_STABLECOINS.map(coin => {
      // 找到對應幣種的所有產品
      const matchingProducts = allProducts.filter((p: BitgetProduct) => {
        const isMatch = p.coin.toUpperCase() === coin && 
                       p.periodType.toLowerCase() === 'flexible' && 
                       p.status === 'in_progress';
        console.log(`Bitget 產品匹配檢查 (${coin}):`, {
          productId: p.productId,
          coin: p.coin,
          periodType: p.periodType,
          status: p.status,
          isMatch
        });
        return isMatch;
      });

      console.log(`Bitget ${coin} 匹配到的產品數量:`, matchingProducts.length);

      if (matchingProducts.length === 0) {
        console.log(`Bitget: 未找到 ${coin} 的活期產品`);
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
          updateTime: Date.now()
        };
      }

      // 從所有匹配的產品中找到最高利率的產品
      const product = matchingProducts.reduce((best, current) => {
        // 選擇產品中的最佳利率
        const getBestApy = (p: BitgetProduct) => {
          if (!p.apyList || p.apyList.length === 0) return 0;
          // 如果只有一個等級，使用該等級的利率
          // 如果有多個等級，使用第二個等級的利率（跳過平台獎勵）
          return p.apyList.length === 1 
            ? parseFloat(p.apyList[0]?.currentApy || '0')
            : parseFloat(p.apyList[1]?.currentApy || '0');
        };
        
        const bestApy = getBestApy(best);
        const currentApy = getBestApy(current);
        return currentApy > bestApy ? current : best;
      }, matchingProducts[0]);

      console.log(`Bitget ${coin} 選中的最佳產品:`, {
        productId: product.productId,
        apyList: product.apyList,
        selectedApy: product.apyList.length === 1 
          ? product.apyList[0]?.currentApy 
          : product.apyList[1]?.currentApy
      });

      // 使用最佳利率
      const selectedApy = product.apyList.length === 1
        ? parseFloat(product.apyList[0]?.currentApy || '0')
        : parseFloat(product.apyList[1]?.currentApy || '0');
      const minAmount = Math.max(500, parseFloat(product.apyList[1]?.minStepVal || '500'));
      const maxAmount = parseFloat(product.apyList[1]?.maxStepVal || '50000000');

      return {
        id: `bitget-${coin.toLowerCase()}-flexible`,
        exchange: 'Bitget',
        exchangeLogo: '/logos/bitget.svg',
        currency: coin as SupportedStablecoin,
        apy: selectedApy,
        apyHistory: {
          '1d': Array(12).fill(selectedApy),
          '1w': Array(28).fill(selectedApy),
          '1m': Array(120).fill(selectedApy)
        },
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
    .filter(product => {
      // 檢查產品是否匹配選擇的幣種並且有效
      const isMatchingCoin = product.currency === coin;
      const isValidApy = product.apy > 0;
      console.log(`${product.exchange} ${product.currency} APY: ${product.apy}`);
      return isMatchingCoin && isValidApy;
    })
    .sort((a, b) => b.apy - a.apy);

    // 設置緩存
    if (products.length > 0) {  // 只緩存有效的產品數據
      setCacheData(cacheKey, products);
    }

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