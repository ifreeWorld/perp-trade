/**
 * 常量定义
 */

// Paradex API URLs
export const PARADEX_TESTNET_API = 'https://api.testnet.paradex.trade/v1';
export const PARADEX_TESTNET_WS = 'wss://ws.api.testnet.paradex.trade/v1';
export const PARADEX_MAINNET_API = 'https://api.prod.paradex.trade/v1';
export const PARADEX_MAINNET_WS = 'wss://ws.api.prod.paradex.trade/v1';

// Lighter API URLs
export const LIGHTER_TESTNET_API = 'https://testnet.zklighter.elliot.ai';
export const LIGHTER_TESTNET_WS = 'wss://testnet.zklighter.elliot.ai/ws';
export const LIGHTER_MAINNET_API = 'https://mainnet.zklighter.elliot.ai';
export const LIGHTER_MAINNET_WS = 'wss://mainnet.zklighter.elliot.ai/ws';

// 策略默认参数
export const DEFAULT_ORDER_SIZE = 0.01;
export const DEFAULT_HOLD_TIME_MIN = 60; // 秒
export const DEFAULT_HOLD_TIME_MAX = 120; // 秒
export const DEFAULT_INTERVAL_TIME_MIN = 10; // 秒
export const DEFAULT_INTERVAL_TIME_MAX = 20; // 秒
export const DEFAULT_ORDER_TYPE = 'market';
export const DEFAULT_FILL_TIMEOUT = 5000; // 毫秒
export const DEFAULT_FILL_CHECK_INTERVAL = 500; // 毫秒
export const DEFAULT_MAX_RETRIES = 3;

// 风控默认参数
export const DEFAULT_MAX_NET_POSITION = 0.1;
export const DEFAULT_MAX_POSITION_DEVIATION = 0.05;
export const DEFAULT_PRICE_SLIPPAGE_TOLERANCE = 0.002; // 0.2%

// 监控默认参数
export const DEFAULT_MONITOR_INTERVAL = 5 * 60; // 5分钟
