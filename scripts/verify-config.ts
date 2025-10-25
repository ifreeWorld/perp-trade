/**
 * 验证配置文件
 */

// 确保在导入配置前环境变量已设置
if (!process.env.NODE_ENV) {
  process.env.NODE_ENV = 'testnet';
  console.log('⚠️ NODE_ENV 未设置，默认使用 testnet');
}

import { config, validateConfig } from '../src/config/index.js';
import log from '../src/utils/logger.js';

function verifyConfiguration() {
  try {
    log.info('='.repeat(60));
    log.info('验证配置');
    log.info('='.repeat(60));

    // 验证配置
    validateConfig();

    // 显示配置信息
    log.info('\n网络环境:');
    log.info(`  - 环境: ${config.network}`);
    log.info(`  - 币种: ${config.symbol}`);

    log.info('\nParadex 配置:');
    log.info(`  - API URL: ${config.paradex.apiUrl}`);
    log.info(`  - WS URL: ${config.paradex.wsUrl}`);
    log.info(`  - API Key: ${config.paradex.apiKey ? '✅ 已配置' : '❌ 未配置'}`);
    log.info(`  - Private Key: ${config.paradex.privateKey ? '✅ 已配置' : '❌ 未配置'}`);

    log.info('\nLighter 配置:');
    log.info(`  - API URL: ${config.lighter.apiUrl}`);
    log.info(`  - WS URL: ${config.lighter.wsUrl}`);
    log.info(`  - Private Key: ${config.lighter.privateKey ? '✅ 已配置' : '❌ 未配置'}`);
    log.info(`  - Account Index: ${config.lighter.accountIndex}`);
    log.info(`  - API Key Index: ${config.lighter.apiKeyIndex}`);

    log.info('\n策略参数:');
    log.info(`  - 订单大小: ${config.strategy.orderSize}`);
    log.info(`  - 订单类型: ${config.strategy.orderType}`);
    log.info(
      `  - 持仓时间: ${config.strategy.holdTimeMin}-${config.strategy.holdTimeMax} 秒`
    );
    log.info(
      `  - 交易间隔: ${config.strategy.intervalTimeMin}-${config.strategy.intervalTimeMax} 秒`
    );
    log.info(`  - 成交超时: ${config.strategy.fillTimeoutMs} 毫秒`);
    log.info(`  - 成交检查间隔: ${config.strategy.fillCheckIntervalMs} 毫秒`);
    log.info(`  - 最大重试次数: ${config.strategy.maxRetries}`);

    log.info('\n风控参数:');
    log.info(`  - 最大净持仓: ${config.risk.maxNetPosition}`);
    log.info(`  - 最大持仓偏差: ${config.risk.maxPositionDeviation}`);
    log.info(`  - 价格滑点容忍度: ${config.risk.priceSlippageTolerance * 100}%`);

    log.info('\n监控配置:');
    log.info(`  - 监控间隔: ${config.monitoring.intervalSeconds} 秒`);

    log.info('\nTelegram 告警:');
    log.info(
      `  - Bot Token: ${process.env.TELEGRAM_BOT_TOKEN ? '✅ 已配置' : '❌ 未配置'}`
    );
    log.info(`  - Chat ID: ${process.env.TELEGRAM_CHAT_ID ? '✅ 已配置' : '❌ 未配置'}`);

    log.info('\n✅ 配置验证通过！');
    log.info('='.repeat(60));

    process.exit(0);
  } catch (error: any) {
    log.error('配置验证失败', error);
    process.exit(1);
  }
}

verifyConfiguration();
