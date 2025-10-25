/**
 * 紧急平仓脚本
 */

import { config, validateConfig } from '../src/config/index.js';
import { ParadexClient } from '../src/connectors/paradex-client.js';
import { LighterClient } from '../src/connectors/lighter-client.js';
import log from '../src/utils/logger.js';
import { sleep } from '../src/utils/math-helper.js';

async function emergencyClose() {
  try {
    log.critical('='.repeat(60));
    log.critical('🚨 紧急平仓');
    log.critical(`环境: ${config.network}`);
    log.critical(`币种: ${config.symbol}`);
    log.critical('='.repeat(60));

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

    // 获取当前持仓
    log.info('\n获取当前持仓...');
    const [paradexPosition, lighterPosition] = await Promise.all([
      paradexClient.getPosition(),
      lighterClient.getPosition(),
    ]);

    log.info(`Paradex 持仓: ${paradexPosition.toFixed(4)}`);
    log.info(`Lighter 持仓: ${lighterPosition.toFixed(4)}`);

    // 平仓
    const tasks: Promise<any>[] = [];

    if (Math.abs(paradexPosition) >= 0.001) {
      const side: 'buy' | 'sell' = paradexPosition > 0 ? 'sell' : 'buy';
      const size = Math.abs(paradexPosition);
      log.info(`\n平仓 Paradex: ${side} ${size.toFixed(4)}`);
      tasks.push(paradexClient.createMarketOrder(side, size));
    }

    if (Math.abs(lighterPosition) >= 0.001) {
      const isAsk = lighterPosition > 0;
      const size = Math.abs(lighterPosition);
      log.info(`平仓 Lighter: ${isAsk ? 'sell' : 'buy'} ${size.toFixed(4)}`);
      tasks.push(lighterClient.createMarketOrder(isAsk, size.toString()));
    }

    if (tasks.length === 0) {
      log.info('\n无持仓，无需平仓');
      process.exit(0);
      return;
    }

    await Promise.allSettled(tasks);

    // 等待成交
    await sleep(2000);

    // 验证平仓结果
    log.info('\n验证平仓结果...');
    const [finalParadexPos, finalLighterPos] = await Promise.all([
      paradexClient.getPosition(),
      lighterClient.getPosition(),
    ]);

    log.info(`Paradex 最终持仓: ${finalParadexPos.toFixed(4)}`);
    log.info(`Lighter 最终持仓: ${finalLighterPos.toFixed(4)}`);

    if (Math.abs(finalParadexPos) < 0.001 && Math.abs(finalLighterPos) < 0.001) {
      log.info('\n✅ 紧急平仓成功！');
    } else {
      log.warn('\n⚠️ 仍有残留持仓，请手动检查');
    }

    log.critical('='.repeat(60));

    process.exit(0);
  } catch (error: any) {
    log.error('紧急平仓失败', error);
    process.exit(1);
  }
}

emergencyClose();
