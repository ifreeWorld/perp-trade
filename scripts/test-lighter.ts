/**
 * 测试 Lighter 连接
 */

import { config, validateConfig } from '../src/config/index.js';
import { LighterClient } from '../src/connectors/lighter-client.js';
import log from '../src/utils/logger.js';

async function testLighterConnection() {
  try {
    log.info('='.repeat(60));
    log.info('测试 Lighter 连接');
    log.info(`环境: ${config.network}`);
    log.info(`币种: ${config.symbol}`);
    log.info('='.repeat(60));

    // 验证配置
    validateConfig();

    // 创建客户端
    const client = new LighterClient(
      config.lighter.apiUrl,
      config.lighter.wsUrl,
      config.lighter.privateKey,
      config.lighter.accountIndex,
      config.lighter.apiKeyIndex,
      config.symbol
    );

    // 初始化
    await client.initialize();

    // 获取持仓
    log.info('\n获取持仓...');
    const position = await client.getPosition();
    log.info(`当前持仓: ${position.toFixed(4)} ${config.symbol}`);

    // 获取详细持仓信息
    log.info('\n获取详细持仓信息...');
    const details = await client.getPositionDetails();
    if (details) {
      log.info(`市场ID: ${details.marketId}`);
      log.info(`符号: ${details.symbol}`);
      log.info(`持仓: ${details.position}`);
      log.info(`平均入场价: ${details.avgEntryPrice}`);
      log.info(`未实现盈亏: ${details.unrealizedPnl}`);
    } else {
      log.info('无持仓');
    }

    log.info('\n✅ Lighter 连接测试成功！');
    log.info('='.repeat(60));

    process.exit(0);
  } catch (error: any) {
    log.error('Lighter 连接测试失败', error);
    process.exit(1);
  }
}

testLighterConnection();

