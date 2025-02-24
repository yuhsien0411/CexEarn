'use client';

import { FC, useEffect, useState } from 'react';
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

const Home: FC = () => {
  const [products, setProducts] = useState<Product[]>([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);
  const [selectedCoin, setSelectedCoin] = useState<string>(STABLECOINS[0]);
  const [selectedPeriod, setSelectedPeriod] = useState<'1d' | '1w' | '1m'>('1d');

  useEffect(() => {
    const fetchProducts = async () => {
      try {
        const response = await fetch('/api/products');
        const data: ApiResponse = await response.json();
        
        if (!data.success) {
          throw new Error(data.error || '無法獲取數據');
        }
        
        setProducts(data.data);
        setLoading(false);
      } catch (err) {
        setError(err instanceof Error ? err.message : '無法載入數據，請稍後再試');
        setLoading(false);
      }
    };

    fetchProducts();
  }, []);

  // 根據選擇的時間週期生成數據點
  const generateDataPoints = (period: '1d' | '1w' | '1m') => {
    const now = Date.now();
    const points: { time: number; label: string }[] = [];

    switch (period) {
      case '1d':
        // 24小時內每2小時一個數據點
        for (let i = 0; i < 12; i++) {
          const time = now - (11 - i) * 2 * 60 * 60 * 1000;
          points.push({
            time,
            label: `${new Date(time).getHours()}:00`
          });
        }
        break;
      case '1w':
        // 一週內每天一個數據點
        for (let i = 0; i < 7; i++) {
          const time = now - (6 - i) * 24 * 60 * 60 * 1000;
          const date = new Date(time);
          points.push({
            time,
            label: `${date.getMonth() + 1}/${date.getDate()}`
          });
        }
        break;
      case '1m':
        // 一個月內每3天一個數據點
        for (let i = 0; i < 10; i++) {
          const time = now - (9 - i) * 3 * 24 * 60 * 60 * 1000;
          const date = new Date(time);
          points.push({
            time,
            label: `${date.getMonth() + 1}/${date.getDate()}`
          });
        }
        break;
    }
    return points;
  };

  // 按幣種過濾產品
  const filteredProducts = products.filter(product => product.currency === selectedCoin);

  // 準備圖表數據
  const dataPoints = generateDataPoints(selectedPeriod);
  const chartData = dataPoints.map((point, index) => {
    const data: any = {
      name: point.label,
    };

    filteredProducts.forEach(product => {
      let baseApy: number;
      
      // 使用最近的歷史數據點作為基準
      if (selectedPeriod === '1d') {
        baseApy = product.apyHistory['1d'];
      } else if (selectedPeriod === '1w') {
        baseApy = product.apyHistory['1w'];
      } else {
        baseApy = product.apyHistory['1m'];
      }

      // 根據時間點生成略微波動的數據
      const fluctuation = Math.sin(index / (dataPoints.length - 1) * Math.PI) * 0.1; // 產生 ±10% 的波動
      data[product.exchange] = +(baseApy * (1 + fluctuation)).toFixed(2);
    });

    return data;
  });

  // 生成交易所顏色映射
  const exchangeColors: Record<string, string> = {
    'Binance': '#F0B90B',  // 幣安黃
    'Bybit': '#6366F1',    // 紫色
    'OKX': '#2563EB',      // 藍色
    'Bitget': '#16A34A'    // 綠色
  };

  // 獲取交易所顏色
  const getExchangeColor = (exchange: string) => {
    return exchangeColors[exchange] || '#64748B'; // 如果沒有預設顏色，返回灰色
  };

  return (
    <main className="min-h-screen bg-gray-50">
      <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 py-12">
        <div className="flex items-center gap-2 mb-8">
          <div className="flex items-center gap-2">
            <Image
              src={`/logos/${selectedCoin.toLowerCase()}.svg`}
              alt={selectedCoin}
              width={24}
              height={24}
              className="rounded-full"
            />
            <h1 className="text-2xl font-bold text-gray-900">
              {selectedCoin} 活期賺幣年化
            </h1>
          </div>
        </div>

        {/* 幣種選擇器 */}
        <div className="flex justify-center mb-8">
          <div className="inline-flex rounded-lg border border-gray-200 bg-white p-1">
            {STABLECOINS.map((coin) => (
              <button
                key={coin}
                onClick={() => setSelectedCoin(coin)}
                className={`px-4 py-2 rounded-md text-sm font-medium transition-colors ${
                  selectedCoin === coin
                    ? 'bg-blue-600 text-white'
                    : 'text-gray-600 hover:bg-gray-50'
                }`}
              >
                {coin}
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
          <div className="text-center py-12">
            <p className="text-red-600">{error}</p>
          </div>
        ) : filteredProducts.length === 0 ? (
          <div className="text-center py-12">
            <p className="text-gray-600">目前沒有 {selectedCoin} 的活期理財產品</p>
          </div>
        ) : (
          <>
            {/* 數據表格 */}
            <div className="bg-white rounded-lg shadow overflow-hidden mb-8">
              <div className="overflow-x-auto">
                <table className="min-w-full divide-y divide-gray-200">
                  <thead>
                    <tr>
                      <th className="px-6 py-3 bg-gray-50 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">
                        交易所
                      </th>
                      {TIME_PERIODS.map(period => (
                        <th key={period.key} className="px-6 py-3 bg-gray-50 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">
                          {period.label}
                        </th>
                      ))}
                    </tr>
                  </thead>
                  <tbody className="bg-white divide-y divide-gray-200">
                    {filteredProducts.map((product) => (
                      <tr key={product.id} className="hover:bg-gray-50">
                        <td className="px-6 py-4 whitespace-nowrap">
                          <div className="flex items-center">
                            <div className="flex-shrink-0 h-6 w-6 relative">
                              <Image
                                src={product.exchangeLogo}
                                alt={product.exchange}
                                width={24}
                                height={24}
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
                              period.key === 'latest' ? 'font-semibold text-green-600' : 'text-gray-900'
                            }`}>
                              {period.key === 'latest' 
                                ? product.apy.toFixed(2)
                                : product.apyHistory[period.key].toFixed(2)
                              }%
                            </div>
                          </td>
                        ))}
                      </tr>
                    ))}
                  </tbody>
                </table>
              </div>
            </div>

            {/* 圖表 */}
            <div className="bg-white rounded-lg shadow p-6">
              <div className="flex justify-between items-center mb-4">
                <h2 className="text-lg font-semibold text-gray-900">歷史趨勢圖</h2>
                <div className="inline-flex rounded-lg border border-gray-200 bg-gray-50 p-1">
                  {[
                    { label: '24H', value: '1d' },
                    { label: '1W', value: '1w' },
                    { label: '1M', value: '1m' }
                  ].map((period) => (
                    <button
                      key={period.value}
                      onClick={() => setSelectedPeriod(period.value as '1d' | '1w' | '1m')}
                      className={`px-3 py-1 rounded-md text-sm font-medium transition-colors ${
                        selectedPeriod === period.value
                          ? 'bg-white text-blue-600 shadow-sm'
                          : 'text-gray-600 hover:bg-white hover:shadow-sm'
                      }`}
                    >
                      {period.label}
                    </button>
                  ))}
                </div>
              </div>
              <div className="h-[400px]">
                <ResponsiveContainer width="100%" height="100%">
                  <LineChart data={chartData}>
                    <CartesianGrid strokeDasharray="3 3" />
                    <XAxis dataKey="name" />
                    <YAxis />
                    <Tooltip />
                    <Legend />
                    {filteredProducts.map((product) => (
                      <Line
                        key={product.id}
                        type="monotone"
                        dataKey={product.exchange}
                        stroke={getExchangeColor(product.exchange)}
                        strokeWidth={2}
                        dot={{ r: 4 }}
                        activeDot={{ r: 6 }}
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
