/**
 * 配置管理模块
 * 根据环境变量自动加载对应的配置
 */

// ⚠️ 第一步：加载环境变量（必须在其他导入之前）
import { ENV } from './load-env.js';

// ⚠️ 第二步：导入配置（此时环境变量已加载）
import { testnetConfig } from './testnet.config.js';
import { mainnetConfig } from './mainnet.config.js';
import { TradingConfig } from '../types/index.js';

// 导出配置
export const config: TradingConfig = ENV === 'mainnet' ? mainnetConfig : testnetConfig;

// 验证配置
export function validateConfig(): void {
  const errors: string[] = [];

  // 验证 Paradex 配置
  if (!config.paradex.starknetPrivateKey) {
    errors.push(`缺少 PARADEX_${ENV.toUpperCase()}_PRIVATE_KEY`);
  }
  if (!config.paradex.starknetAddress) {
    errors.push(`缺少 PARADEX_${ENV.toUpperCase()}_ACCOUNT_ADDRESS`);
  }
  // 公钥可选，会从私钥自动计算
  if (!config.paradex.ethereumAddress) {
    errors.push(`缺少 PARADEX_${ENV.toUpperCase()}_L1_ADDRESS`);
  }

  // 验证 Lighter 配置
  if (!config.lighter.privateKey) {
    errors.push(`缺少 LIGHTER_${ENV.toUpperCase()}_PRIVATE_KEY`);
  }
  if (
    typeof config.lighter.accountIndex !== 'number' ||
    isNaN(config.lighter.accountIndex)
  ) {
    errors.push(`缺少或无效的 LIGHTER_${ENV.toUpperCase()}_ACCOUNT_INDEX`);
  }

  // 验证策略参数
  if (config.strategy.orderSize <= 0) {
    errors.push('ORDER_SIZE 必须大于 0');
  }
  if (!['market', 'limit'].includes(config.strategy.orderType)) {
    errors.push('ORDER_TYPE 必须是 market 或 limit');
  }

  // 验证风控参数
  if (config.risk.maxNetPosition <= 0) {
    errors.push('MAX_NET_POSITION 必须大于 0');
  }

  if (errors.length > 0) {
    throw new Error(`配置验证失败:\n${errors.join('\n')}`);
  }
}

export default config;
