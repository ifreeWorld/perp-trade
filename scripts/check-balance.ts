/**
 * 检查账户余额
 */

import { config, validateConfig } from '../src/config/index.js';
import { ParadexClient } from '../src/connectors/paradex-client.js';
import { LighterClient } from '../src/connectors/lighter-client.js';
import log from '../src/utils/logger.js';

async function checkBalance() {
  try {
    log.info('='.repeat(60));
    log.info('检查账户余额');
    log.info(`环境: ${config.network}`);
    log.info('='.repeat(60));

    // 验证配置
    validateConfig();

    // 初始化 Paradex 客户端
    const paradexClient = new ParadexClient(
      config.paradex.apiUrl,
      config.paradex.starknetPrivateKey,
      config.symbol,
      config.paradex.starknetAddress,
      config.paradex.starknetPublicKey,
      config.paradex.ethereumAddress,
      config.network
    );
    await paradexClient.initialize();

    // 注意：这里需要根据实际 SDK 的 API 来实现余额查询
    // Paradex SDK 可能有 account.getBalances() 方法
    log.info('\n✅ Paradex 客户端已连接');
    log.info('（余额查询功能需要根据实际 SDK API 实现）');

    // 初始化 Lighter 客户端
    const lighterClient = new LighterClient(
      config.lighter.apiUrl,
      config.lighter.wsUrl,
      config.lighter.privateKey,
      config.lighter.accountIndex,
      config.lighter.apiKeyIndex,
      config.symbol
    );
    await lighterClient.initialize();

    log.info('\n✅ Lighter 客户端已连接');
    log.info('（余额查询功能需要根据实际 SDK API 实现）');

    log.info('\n提示: 请通过交易所网页查看详细余额信息');
    log.info('='.repeat(60));

    process.exit(0);
  } catch (error: any) {
    log.error('检查余额失败', error);
    process.exit(1);
  }
}

checkBalance();
