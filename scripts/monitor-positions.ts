/**
 * 监控当前持仓
 */

import { config, validateConfig } from '../src/config/index.js';
import { ParadexClient } from '../src/connectors/paradex-client.js';
import { LighterClient } from '../src/connectors/lighter-client.js';
import log from '../src/utils/logger.js';

async function monitorPositions() {
  try {
    log.info('='.repeat(60));
    log.info('持仓监控');
    log.info(`环境: ${config.network}`);
    log.info(`币种: ${config.symbol}`);
    log.info('='.repeat(60));

    // 验证配置
    validateConfig();

    // 初始化客户端
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

    const lighterClient = new LighterClient(
      config.lighter.apiUrl,
      config.lighter.wsUrl,
      config.lighter.privateKey,
      config.lighter.accountIndex,
      config.lighter.apiKeyIndex,
      config.symbol
    );
    await lighterClient.initialize();

    // 获取持仓
    log.info('\n获取持仓...');
    const [paradexPosition, lighterPosition] = await Promise.all([
      paradexClient.getPosition(),
      lighterClient.getPosition(),
    ]);

    const netPosition = paradexPosition + lighterPosition;

    log.info(`\nParadex 持仓: ${paradexPosition.toFixed(4)} ${config.symbol}`);
    log.info(`Lighter 持仓: ${lighterPosition.toFixed(4)} ${config.symbol}`);
    log.info(`净持仓: ${netPosition.toFixed(4)} ${config.symbol}`);

    // 检查是否超限
    if (Math.abs(netPosition) > config.risk.maxNetPosition) {
      log.warn(`\n⚠️ 警告: 净持仓超限！(阈值: ${config.risk.maxNetPosition})`);
    } else {
      log.info('\n✅ 净持仓正常');
    }

    log.info('='.repeat(60));

    process.exit(0);
  } catch (error: any) {
    log.error('持仓监控失败', error);
    process.exit(1);
  }
}

monitorPositions();
