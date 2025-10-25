/**
 * 测试 Paradex 连接
 */

import { config, validateConfig } from '../src/config/index.js';
import { ParadexClient } from '../src/connectors/paradex-client.js';
import log from '../src/utils/logger.js';

async function testParadexConnection() {
  try {
    log.info('='.repeat(60));
    log.info('测试 Paradex 连接');
    log.info(`环境: ${config.network}`);
    log.info(`币种: ${config.symbol}`);
    log.info('='.repeat(60));

    // 验证配置
    validateConfig();

    // 创建客户端
    const client = new ParadexClient(
      config.paradex.apiUrl,
      config.paradex.starknetPrivateKey,
      config.symbol,
      config.paradex.starknetAddress,
      config.paradex.starknetPublicKey,
      config.paradex.ethereumAddress,
      config.network
    );

    // 初始化
    await client.initialize();

    // 获取市场信息
    log.info('\n获取市场信息...');
    const markets = await client.getAvailableMarkets();
    log.info(`可用市场数量: ${markets.length}`);

    // 获取持仓
    log.info('\n获取持仓...');
    const position = await client.getPosition();
    log.info(`当前持仓: ${position.toFixed(4)} ${config.symbol}`);

    // 获取市场价格
    log.info('\n获取市场价格...');
    const price = await client.getMarketPrice();
    log.info(`买价: ${price.bidPrice}`);
    log.info(`卖价: ${price.askPrice}`);
    log.info(`中间价: ${price.lastPrice}`);

    log.info('\n✅ Paradex 连接测试成功！');
    log.info('='.repeat(60));

    process.exit(0);
  } catch (error: any) {
    log.error('Paradex 连接测试失败', error);
    process.exit(1);
  }
}

testParadexConnection();
