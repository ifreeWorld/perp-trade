/**
 * 测试网配置
 */

import { TradingConfig } from '../types/index.js';
import * as constants from './constants.js';

export const testnetConfig: TradingConfig = {
  network: 'testnet',

  // 统一的币种配置
  symbol: process.env.SYMBOL || 'ETH',

  paradex: {
    apiUrl: constants.PARADEX_TESTNET_API,
    wsUrl: constants.PARADEX_TESTNET_WS,
    starknetAddress: process.env.PARADEX_TESTNET_ACCOUNT_ADDRESS || '',
    starknetPublicKey: process.env.PARADEX_TESTNET_PUBLIC_KEY || '',
    starknetPrivateKey: process.env.PARADEX_TESTNET_PRIVATE_KEY || '',
    ethereumAddress: process.env.PARADEX_TESTNET_L1_ADDRESS || '',
  },

  lighter: {
    apiUrl: constants.LIGHTER_TESTNET_API,
    wsUrl: constants.LIGHTER_TESTNET_WS,
    privateKey: process.env.LIGHTER_TESTNET_PRIVATE_KEY || '',
    accountIndex: parseInt(process.env.LIGHTER_TESTNET_ACCOUNT_INDEX || '0'),
    apiKeyIndex: parseInt(process.env.LIGHTER_TESTNET_API_KEY_INDEX || '1'),
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
