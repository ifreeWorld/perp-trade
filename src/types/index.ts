/**
 * 交易系统类型定义
 */

// ==================== 网络类型 ====================
export type Network = 'testnet' | 'mainnet';

// ==================== 订单类型 ====================
export type OrderSide = 'buy' | 'sell';
export type OrderType = 'market' | 'limit';

// ==================== Paradex 持仓 ====================
export interface ParadexPosition {
  market: string;
  side: 'LONG' | 'SHORT';
  size: string; // SDK 返回字符串，不是 number
  notional: string;
  avgEntryPrice: string;
  unrealizedPnl: string;
}

// ==================== Lighter 持仓 ====================
export interface LighterPosition {
  marketId: number;
  symbol: string;
  position: string;
  avgEntryPrice: string;
  unrealizedPnl: string;
  liquidationPrice: string;
}

// ==================== 持仓信息 ====================
export interface PositionInfo {
  paradexPosition: number;
  lighterPosition: number;
  netPosition: number;
}

// ==================== 成交状态 ====================
export interface FillStatus {
  bothFilled: boolean;
  paradexFilled: boolean;
  lighterFilled: boolean;
}

// ==================== 市场价格 ====================
export interface MarketPrice {
  bidPrice: number;
  askPrice: number;
  lastPrice: number;
}

// ==================== 交易记录 ====================
export interface TradeRecord {
  timestamp: string;
  symbol: string;

  // 订单信息
  paradexSide: 'BUY' | 'SELL';
  lighterSide: 'BUY' | 'SELL';
  size: number;
  orderType: 'MARKET' | 'LIMIT';

  // 成交信息
  fillTimeMs: number;
  paradexFilled: boolean;
  lighterFilled: boolean;
  partialFillHandled: boolean;

  // 价格信息
  paradexEntryPrice: number;
  paradexExitPrice: number;
  lighterEntryPrice: number;
  lighterExitPrice: number;
  avgSlippage: number;

  // 持仓信息
  netPositionBefore: number;
  netPositionAfter: number;
  correctionRequired: boolean;

  // 收益信息
  realizedPnl: number;
  holdDuration: number;

  // 异常信息
  errors: string[];
  retryCount: number;
}

// ==================== 配置类型 ====================
export interface TradingConfig {
  // 网络环境
  network: Network;

  // 交易币种
  symbol: string;

  // Paradex 配置
  paradex: {
    apiUrl: string;
    wsUrl: string;
    starknetAddress: string; // Starknet 账户地址
    starknetPublicKey: string; // Starknet 公钥
    starknetPrivateKey: string; // Starknet 私钥
    ethereumAddress: string; // 以太坊地址
  };

  // Lighter 配置
  lighter: {
    apiUrl: string;
    wsUrl: string;
    privateKey: string;
    accountIndex: number;
    apiKeyIndex: number;
  };

  // 策略参数
  strategy: {
    orderSize: number;
    holdTimeMin: number;
    holdTimeMax: number;
    intervalTimeMin: number;
    intervalTimeMax: number;
    orderType: OrderType;
    fillTimeoutMs: number;
    fillCheckIntervalMs: number;
    maxRetries: number;
  };

  // 风控参数
  risk: {
    maxNetPosition: number;
    maxPositionDeviation: number;
    priceSlippageTolerance: number;
  };

  // 监控配置
  monitoring: {
    intervalSeconds: number;
  };
}
