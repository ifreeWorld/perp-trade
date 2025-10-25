/**
 * 主网配置
 */

import { TradingConfig } from '../types/index.js';
import * as constants from './constants.js';

export const mainnetConfig: TradingConfig = {
  network: 'mainnet',

  // 统一的币种配置
  symbol: process.env.SYMBOL || 'ETH',

  paradex: {
    apiUrl: constants.PARADEX_MAINNET_API,
    wsUrl: constants.PARADEX_MAINNET_WS,
    starknetAddress: process.env.PARADEX_MAINNET_ACCOUNT_ADDRESS || '',
    starknetPublicKey: process.env.PARADEX_MAINNET_PUBLIC_KEY || '',
    starknetPrivateKey: process.env.PARADEX_MAINNET_PRIVATE_KEY || '',
    ethereumAddress: process.env.PARADEX_MAINNET_L1_ADDRESS || '',
  },

  lighter: {
    apiUrl: constants.LIGHTER_MAINNET_API,
    wsUrl: constants.LIGHTER_MAINNET_WS,
    privateKey: process.env.LIGHTER_MAINNET_PRIVATE_KEY || '',
    accountIndex: parseInt(process.env.LIGHTER_MAINNET_ACCOUNT_INDEX || '0'),
    apiKeyIndex: parseInt(process.env.LIGHTER_MAINNET_API_KEY_INDEX || '1'),
  },

  strategy: {
    orderSize: parseFloat(
      process.env.ORDER_SIZE || constants.DEFAULT_ORDER_SIZE.toString()
    ),
    holdTimeMin: constants.DEFAULT_HOLD_TIME_MIN,
    holdTimeMax: constants.DEFAULT_HOLD_TIME_MAX,
    intervalTimeMin: constants.DEFAULT_INTERVAL_TIME_MIN,
    intervalTimeMax: constants.DEFAULT_INTERVAL_TIME_MAX,
    orderType:
      (process.env.ORDER_TYPE as 'market' | 'limit') ||
      (constants.DEFAULT_ORDER_TYPE as 'market'),
    fillTimeoutMs: constants.DEFAULT_FILL_TIMEOUT,
    fillCheckIntervalMs: constants.DEFAULT_FILL_CHECK_INTERVAL,
    maxRetries: constants.DEFAULT_MAX_RETRIES,
  },

  risk: {
    maxNetPosition: parseFloat(
      process.env.MAX_NET_POSITION || constants.DEFAULT_MAX_NET_POSITION.toString()
    ),
    maxPositionDeviation: constants.DEFAULT_MAX_POSITION_DEVIATION,
    priceSlippageTolerance: constants.DEFAULT_PRICE_SLIPPAGE_TOLERANCE,
  },

  monitoring: {
    intervalSeconds: constants.DEFAULT_MONITOR_INTERVAL,
  },
};
