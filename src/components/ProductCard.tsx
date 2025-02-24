import { FC } from 'react';
import Image from 'next/image';

interface ProductCardProps {
  exchange: string;
  logo: string;
  product: string;
  apy: number;
  minAmount: string;
  maxAmount?: string;
  currency: string;
  lockPeriod: string;
  link?: string;
  status: 'Available' | 'NotAvailable';
}

const ProductCard: FC<ProductCardProps> = ({
  exchange,
  logo,
  product,
  apy,
  minAmount,
  maxAmount,
  currency,
  lockPeriod,
  link,
  status,
}) => {
  return (
    <div className={`bg-white rounded-xl shadow-lg p-6 hover:shadow-xl transition-shadow ${
      status === 'NotAvailable' ? 'opacity-60' : ''
    }`}>
      <div className="flex items-center justify-between mb-4">
        <div className="flex items-center">
          <div className="relative w-8 h-8 mr-3">
            <Image
              src={logo}
              alt={exchange}
              width={32}
              height={32}
              className="rounded-full"
            />
          </div>
          <h3 className="text-xl font-semibold text-gray-900">{exchange}</h3>
        </div>
        <span className={`text-sm px-2 py-1 rounded font-medium ${
          status === 'Available' 
            ? 'bg-green-100 text-green-800'
            : 'bg-gray-100 text-gray-800'
        }`}>
          {status === 'Available' ? '可申購' : '暫停申購'}
        </span>
      </div>
      
      <div className="space-y-4">
        <div>
          <p className="text-gray-700 font-medium mb-1">產品名稱</p>
          <p className="text-lg font-medium text-gray-900">{product}</p>
        </div>
        
        <div>
          <p className="text-gray-700 font-medium mb-1">年化收益率</p>
          <p className="text-3xl font-bold text-green-600">
            {apy.toFixed(2)}%
          </p>
        </div>
        
        <div className="space-y-4 bg-gray-50 p-4 rounded-lg">
          <div>
            <p className="text-gray-700 font-medium mb-2">投資額度</p>
            <div className="space-y-1">
              <div className="flex justify-between items-center">
                <span className="text-gray-600">最低投資</span>
                <span className="text-gray-900 font-medium">{minAmount} {currency}</span>
              </div>
              {maxAmount && (
                <div className="flex justify-between items-center">
                  <span className="text-gray-600">最高投資</span>
                  <span className="text-gray-900 font-medium">{maxAmount} {currency}</span>
                </div>
              )}
            </div>
          </div>
          <div>
            <p className="text-gray-700 font-medium mb-2">鎖定期</p>
            <p className="text-gray-900 font-medium">{lockPeriod}</p>
          </div>
        </div>
        
        <a
          href={link}
          target="_blank"
          rel="noopener noreferrer"
          className={`block w-full py-2.5 rounded-lg text-center transition-colors font-medium ${
            status === 'Available'
              ? 'bg-blue-600 text-white hover:bg-blue-700'
              : 'bg-gray-400 text-white cursor-not-allowed'
          }`}
          onClick={e => {
            if (status !== 'Available') {
              e.preventDefault();
            }
          }}
        >
          {status === 'Available' ? '前往投資' : '暫停申購'}
        </a>
      </div>
    </div>
  );
};

export default ProductCard;