'use client';

import { FC, useEffect, useState, useMemo } from 'react';
import Image from 'next/image';
import { Product, ApiResponse } from '@/types';
import {
  LineChart,
  Line,
  XAxis,
  YAxis,
  CartesianGrid,
  Tooltip,
  Legend,
  ResponsiveContainer
} from 'recharts';

const STABLECOINS = ['USDT', 'USDC', 'DAI'] as const;

// 定義時間週期
const TIME_PERIODS = [
  { label: '1M', key: '1m' },
  { label: '1W', key: '1w' },
  { label: '24H', key: '1d' },
  { label: '最新', key: 'latest' },
] as const;

// 獲取時間間隔（毫秒）
const getTimeInterval = (period: '1d' | '1w' | '1m') => {
  switch (period) {
    case '1d': return 2 * 60 * 60 * 1000; // 2小時
    case '1w': return 6 * 60 * 60 * 1000; // 6小時
    case '1m': return 6 * 60 * 60 * 1000; // 6小時
  }
};

const Home: FC = () => {
  const [products, setProducts] = useState<Product[]>([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);
  const [selectedCoin, setSelectedCoin] = useState<string>(STABLECOINS[0]);
  const [selectedPeriod, setSelectedPeriod] = useState<'1d' | '1w' | '1m'>('1d');
  const [retryCount, setRetryCount] = useState(0);
  const maxRetries = 3;

  useEffect(() => {
    let isSubscribed = true;
    const controller = new AbortController();

    const fetchProducts = async (attempt = 0) => {
      try {
        if (attempt === 0) setLoading(true);
        setError(null);
        
        const response = await fetch(
          `/api/products?period=${selectedPeriod}&coin=${selectedCoin}`,
          { 
            signal: controller.signal,
            headers: {
              'Cache-Control': 'no-cache',
              'Pragma': 'no-cache'
            }
          }
        );
        
        if (!response.ok) {
          throw new Error('伺服器響應錯誤');
        }

        const data = await response.json() as ApiResponse;
        
        if (!data.success) {
          throw new Error(data.error || '無法獲取數據');
        }
        
        if (isSubscribed) {
          setProducts(data.data || []);
          setRetryCount(0);
        }
      } catch (err) {
        console.error('獲取數據失敗:', err);
        
        if (!isSubscribed) return;

        if (attempt < maxRetries) {
          // 重試延遲時間遞增
          const delay = Math.min(1000 * Math.pow(2, attempt), 8000);
          setTimeout(() => fetchProducts(attempt + 1), delay);
          setRetryCount(attempt + 1);
        } else {
          setError(err instanceof Error ? err.message : '無法載入數據，請稍後再試');
        }
      } finally {
        if (isSubscribed && attempt === 0) {
          setLoading(false);
        }
      }
    };

    fetchProducts();
    
    // 設置自動更新間隔（每5分鐘）
    const intervalId = setInterval(() => fetchProducts(), 5 * 60 * 1000);
    
    return () => {
      isSubscribed = false;
      controller.abort();
      clearInterval(intervalId);
    };
  }, [selectedPeriod, selectedCoin]);

  // 修改圖表數據處理邏輯
  const chartData = useMemo(() => {
    if (!products.length) return [];

    const dataPoints = products[0].apyHistory[selectedPeriod].length;
    const result = [];

    for (let i = 0; i < dataPoints; i++) {
      const timePoint = new Date(
        products[0].updateTime - (dataPoints - 1 - i) * getTimeInterval(selectedPeriod)
      );

      const point: { 
        time: string;
        [key: string]: string | number; 
      } = {
        time: timePoint.toLocaleString('zh-TW', {
          month: 'numeric',
          day: 'numeric',
          hour: 'numeric',
          minute: 'numeric'
        })
      };

      // 添加每個交易所的數據點
      products.forEach(product => {
        point[product.exchange] = product.apyHistory[selectedPeriod][i];
      });

      result.push(point);
    }

    return result;
  }, [products, selectedPeriod]);

  // 更新交易所顏色映射
  const exchangeColors: Record<string, string> = {
    'Binance': '#F3BA2F',  // 幣安金黃色
    'Bybit': '#1DA2B4',    // 拜比特藍綠色
    'OKX': '#2FB88E',      // OKX綠色
    'Bitget': '#FF4C39'    // Bitget紅色
  };

  // 獲取交易所顏色
  const getExchangeColor = (exchange: string) => {
    return exchangeColors[exchange] || '#64748B'; // 如果沒有預設顏色，返回灰色
  };

  // 添加重試提示
  const renderError = () => (
    <div className="text-center py-12">
      <p className="text-red-600 mb-2">{error}</p>
      {retryCount > 0 && retryCount < maxRetries && (
        <p className="text-gray-600">
          正在重試 ({retryCount}/{maxRetries})...
        </p>
      )}
    </div>
  );

  return (
    <main className="min-h-screen bg-gray-50">
      <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 py-8">
        {/* 頁面標題和說明 */}
        <div className="mb-8">
          <h1 className="text-3xl font-bold text-gray-900 mb-2">活期理財利率比較</h1>
          <p className="text-gray-600">比較主流中心化交易所的活期理財年化收益率</p>
          <div className="mt-4 text-sm text-gray-500">
            <p>* 數據來源：各交易所官方 API</p>
            <p>* 更新頻率：每 5 分鐘</p>
            <p>* Bybit 和 Bitget 暫無歷史數據，使用當前利率代替</p>
          </div>
        </div>

        {/* 幣種選擇器 */}
        <div className="bg-white rounded-lg shadow-sm p-4 mb-8">
          <div className="flex flex-wrap gap-4">
            {STABLECOINS.map((coin) => (
              <button
                key={coin}
                onClick={() => setSelectedCoin(coin)}
                className={`flex items-center gap-2 px-4 py-2 rounded-lg transition-all ${
                  selectedCoin === coin
                    ? 'bg-blue-50 text-blue-600 ring-2 ring-blue-600/20'
                    : 'bg-gray-50 text-gray-700 hover:bg-gray-100'
                }`}
              >
                <Image
                  src={`/logos/${coin.toLowerCase()}.svg`}
                  alt={coin}
                  width={20}
                  height={20}
                  className="rounded-full"
                />
                <span className="font-medium">{coin}</span>
              </button>
            ))}
          </div>
        </div>
        
        {loading ? (
          <div className="text-center py-12">
            <div className="animate-spin rounded-full h-12 w-12 border-b-2 border-gray-900 mx-auto"></div>
            <p className="mt-4 text-gray-600">載入中...</p>
          </div>
        ) : error ? (
          renderError()
        ) : products.length === 0 ? (
          <div className="text-center py-12">
            <p className="text-gray-600">目前沒有 {selectedCoin} 的活期理財產品</p>
          </div>
        ) : (
          <>
            {/* 數據表格 */}
            <div className="bg-white rounded-lg shadow-sm overflow-hidden mb-8">
              <div className="overflow-x-auto">
                <table className="min-w-full divide-y divide-gray-200">
                  <thead>
                    <tr>
                      <th className="px-6 py-3 bg-gray-50 text-left text-xs font-medium text-gray-500 uppercase tracking-wider w-48">
                        交易所
                      </th>
                      {TIME_PERIODS.map(period => (
                        <th key={period.key} className="px-6 py-3 bg-gray-50 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">
                          {period.label}
                        </th>
                      ))}
                      <th className="px-6 py-3 bg-gray-50 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">
                        最低投資額
                      </th>
                    </tr>
                  </thead>
                  <tbody className="bg-white divide-y divide-gray-200">
                    {products.map((product) => (
                      <tr key={product.id} className="hover:bg-gray-50">
                        <td className="px-6 py-4 whitespace-nowrap">
                          <div className="flex items-center">
                            <div className="flex-shrink-0 h-8 w-8 relative">
                              <Image
                                src={product.exchangeLogo}
                                alt={product.exchange}
                                width={32}
                                height={32}
                                className="rounded-full"
                              />
                            </div>
                            <div className="ml-4">
                              <div className="text-sm font-medium text-gray-900">
                                {product.exchange}
                              </div>
                            </div>
                          </div>
                        </td>
                        {TIME_PERIODS.map(period => (
                          <td key={period.key} className="px-6 py-4 whitespace-nowrap">
                            <div className={`text-sm ${
                              period.key === 'latest' 
                                ? 'font-semibold text-green-600' 
                                : 'text-gray-900'
                            }`}>
                              {period.key === 'latest' 
                                ? product.apy.toFixed(2)
                                : product.apyHistory[period.key][product.apyHistory[period.key].length - 1].toFixed(2)
                              }%
                            </div>
                          </td>
                        ))}
                        <td className="px-6 py-4 whitespace-nowrap">
                          <div className="text-sm text-gray-900">
                            {product.minAmount} {product.currency}
                          </div>
                        </td>
                      </tr>
                    ))}
                  </tbody>
                </table>
              </div>
            </div>

            {/* 圖表 */}
            <div className="bg-white rounded-lg shadow-sm p-6">
              <div className="flex justify-between items-center mb-6">
                <h2 className="text-xl font-bold text-gray-900">歷史趨勢</h2>
                <div className="inline-flex rounded-lg border border-gray-200 bg-white p-1">
                  {[
                    { label: '24H', value: '1d' },
                    { label: '1W', value: '1w' },
                    { label: '1M', value: '1m' }
                  ].map((period) => (
                    <button
                      key={period.value}
                      onClick={() => setSelectedPeriod(period.value as '1d' | '1w' | '1m')}
                      className={`px-4 py-2 rounded-md text-sm font-medium transition-all ${
                        selectedPeriod === period.value
                          ? 'bg-gray-100 text-gray-900'
                          : 'text-gray-600 hover:bg-gray-50'
                      }`}
                    >
                      {period.label}
                    </button>
                  ))}
                </div>
              </div>
              <div className="h-[400px]">
                <ResponsiveContainer width="100%" height="100%">
                  <LineChart data={chartData} margin={{ top: 10, right: 30, left: 10, bottom: 65 }}>
                    <CartesianGrid strokeDasharray="3 3" stroke="#E5E7EB" />
                    <XAxis 
                      dataKey="time" 
                      interval={selectedPeriod === '1d' ? 1 : selectedPeriod === '1w' ? 3 : 11}
                      angle={-45}
                      textAnchor="end"
                      height={60}
                      tick={{ fill: '#6B7280', fontSize: 12 }}
                      tickLine={{ stroke: '#E5E7EB' }}
                      axisLine={{ stroke: '#E5E7EB' }}
                    />
                    <YAxis 
                      domain={['dataMin - 0.5', 'dataMax + 0.5']}
                      tickFormatter={(value) => `${value.toFixed(2)}%`}
                      tick={{ fill: '#6B7280', fontSize: 12 }}
                      tickLine={{ stroke: '#E5E7EB' }}
                      axisLine={{ stroke: '#E5E7EB' }}
                    />
                    <Tooltip 
                      contentStyle={{
                        backgroundColor: 'rgba(255, 255, 255, 0.95)',
                        border: '1px solid #E5E7EB',
                        borderRadius: '8px',
                        boxShadow: '0 4px 6px rgba(0, 0, 0, 0.1)',
                      }}
                      formatter={(value: number) => [
                        `${value.toFixed(2)}%`, 
                        '年化收益率'
                      ]}
                      labelFormatter={(label) => `時間: ${label}`}
                    />
                    <Legend 
                      verticalAlign="top"
                      height={36}
                      iconType="circle"
                      iconSize={8}
                    />
                    {products.map((product) => (
                      <Line
                        key={product.id}
                        type="monotone"
                        dataKey={product.exchange}
                        name={product.exchange}
                        stroke={getExchangeColor(product.exchange)}
                        strokeWidth={2}
                        dot={false}
                        activeDot={{ 
                          r: 6,
                          stroke: '#fff',
                          strokeWidth: 2
                        }}
                      />
                    ))}
                  </LineChart>
                </ResponsiveContainer>
              </div>
            </div>
          </>
        )}
      </div>
    </main>
  );
};

export default Home;
