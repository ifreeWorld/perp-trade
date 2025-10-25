/**
 * 对冲刷量交易系统 - 主程序入口
 *
 * 功能：
 * - 初始化 Paradex 和 Lighter 客户端
 * - 启动对冲策略
 * - 启动监控模块
 * - 处理优雅退出
 */

import { config, validateConfig } from './config/index.js';
import { ParadexClient } from './connectors/paradex-client.js';
import { LighterClient } from './connectors/lighter-client.js';
import { HedgeStrategy } from './strategies/hedge-strategy.js';
import { PositionMonitor } from './monitors/position-monitor.js';
import { HealthMonitor } from './monitors/health-monitor.js';
import log from './utils/logger.js';

// 存储实例，用于优雅退出
let strategy: HedgeStrategy | null = null;
let positionMonitor: PositionMonitor | null = null;
let healthMonitor: HealthMonitor | null = null;

async function main() {
  try {
    log.info('='.repeat(60));
    log.info(`🚀 启动对冲交易系统`);
    log.info(`环境: ${config.network}`);
    log.info(`币种: ${config.symbol}`);
    log.info(`订单类型: ${config.strategy.orderType}`);
    log.info(`订单大小: ${config.strategy.orderSize}`);
    log.info('='.repeat(60));

    // 1. 验证配置
    log.info('验证配置...');
    validateConfig();
    log.info('✅ 配置验证通过');

    // 2. 初始化 Paradex 客户端（使用 Starknet 账户系统）
    log.info('初始化 Paradex 客户端...');
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

    // 3. 初始化 Lighter 客户端（使用社区 SDK）
    log.info('初始化 Lighter 客户端...');
    const lighterClient = new LighterClient(
      config.lighter.apiUrl,
      config.lighter.wsUrl,
      config.lighter.privateKey,
      config.lighter.accountIndex,
      config.lighter.apiKeyIndex,
      config.symbol
    );
    await lighterClient.initialize();

    // 4. 创建对冲策略
    log.info('创建对冲策略...');
    strategy = new HedgeStrategy(paradexClient, lighterClient, config);

    // 5. 创建监控模块
    log.info('创建监控模块...');
    positionMonitor = new PositionMonitor(paradexClient, lighterClient, config);
    healthMonitor = new HealthMonitor(paradexClient, lighterClient);

    // 6. 启动监控（后台运行）
    log.info('启动监控模块...');
    // 不等待监控完成，让它们在后台运行
    positionMonitor.start().catch((error) => {
      log.error('持仓监控异常', error);
    });
    healthMonitor.start().catch((error) => {
      log.error('健康监控异常', error);
    });

    // 7. 发送启动通知
    const { alertSystemStart } = await import('./utils/telegram-alert.js');
    await alertSystemStart(config.symbol, config.strategy.orderSize);

    // 8. 启动策略（主循环）
    log.info('启动对冲策略...');
    log.info('='.repeat(60));
    await strategy.run();
  } catch (error: any) {
    log.error('系统启动失败', error);
    process.exit(1);
  }
}

/**
 * 优雅退出处理
 */
async function gracefulShutdown(signal: string) {
  log.info(`\n接收到 ${signal} 信号，正在关闭系统...`);

  try {
    // 停止监控
    if (positionMonitor) {
      log.info('停止持仓监控...');
      positionMonitor.stop();
    }

    if (healthMonitor) {
      log.info('停止健康监控...');
      healthMonitor.stop();
    }

    // 停止策略（会自动打印盈亏总结）
    if (strategy) {
      log.info('停止对冲策略...');
      strategy.stop();
    }

    log.info('✅ 系统已安全关闭');
    process.exit(0);
  } catch (error: any) {
    log.error('关闭系统时出错', error);
    process.exit(1);
  }
}

// 注册信号处理
process.on('SIGINT', () => gracefulShutdown('SIGINT'));
process.on('SIGTERM', () => gracefulShutdown('SIGTERM'));

// 处理未捕获的异常
process.on('uncaughtException', (error) => {
  log.error('未捕获的异常', error);
  process.exit(1);
});

process.on('unhandledRejection', (reason, promise) => {
  log.error('未处理的 Promise 拒绝', { reason, promise });
  process.exit(1);
});

// 启动程序
main();
