/**
 * 测试 getLastRoundPnL() 方法
 *
 * 直接调用 client 的盈亏计算方法
 *
 * 使用方法：
 * NODE_ENV=mainnet pnpm tsx scripts/test-last-round-pnl.ts
 */

import { ParadexClient } from '../src/connectors/paradex-client.js';
import { LighterClient } from '../src/connectors/lighter-client.js';
import { config } from '../src/config/index.js';
import log from '../src/utils/logger.js';

async function testLastRoundPnL() {
  let paradexClient: ParadexClient | null = null;
  let lighterClient: LighterClient | null = null;

  try {
    log.info('='.repeat(80));
    log.info('🧪 测试 getLastRoundPnL() 方法');
    log.info('='.repeat(80));
    log.info(`环境: ${config.network}`);
    log.info(`币种: ${config.symbol}`);
    log.info('='.repeat(80));

    // 初始化 Paradex 客户端
    log.info('\n📡 正在初始化 Paradex 客户端...');
    paradexClient = new ParadexClient(
      config.paradex.apiUrl,
      config.paradex.starknetPrivateKey,
      config.symbol,
      config.paradex.starknetAddress,
      config.paradex.starknetPublicKey,
      config.paradex.ethereumAddress,
      config.network
    );
    await paradexClient.initialize();

    // 初始化 Lighter 客户端
    log.info('正在初始化 Lighter 客户端...');
    lighterClient = new LighterClient(
      config.lighter.apiUrl,
      config.lighter.wsUrl,
      config.lighter.privateKey,
      config.lighter.accountIndex,
      config.lighter.apiKeyIndex,
      config.symbol
    );
    await lighterClient.initialize();

    // ===== 测试 Paradex =====
    log.info('\n' + '='.repeat(80));
    log.info('📊 测试 Paradex.getLastRoundPnL()');
    log.info('='.repeat(80));

    log.info('\n调用 getLastRoundPnL()...');
    const paradexPnL = await paradexClient.getLastRoundPnL();

    log.info('\n结果:');
    log.info(
      `  ✅ Paradex 最近一轮盈亏: ${paradexPnL >= 0 ? '+' : ''}$${paradexPnL.toFixed(4)}`
    );

    // ===== 测试 Lighter =====
    log.info('\n' + '='.repeat(80));
    log.info('📊 测试 Lighter.getLastRoundPnL()');
    log.info('='.repeat(80));

    log.info('\n调用 getLastRoundPnL()...');
    const lighterPnL = await lighterClient.getLastRoundPnL();

    log.info('\n结果:');
    log.info(
      `  ✅ Lighter 最近一轮盈亏: ${lighterPnL >= 0 ? '+' : ''}$${lighterPnL.toFixed(4)}`
    );

    // ===== 总结 =====
    log.info('\n' + '='.repeat(80));
    log.info('📋 总结');
    log.info('='.repeat(80));

    const totalPnL = paradexPnL + lighterPnL;

    log.info('\n最近一轮盈亏统计:');
    log.info(`  Paradex: ${paradexPnL >= 0 ? '+' : ''}$${paradexPnL.toFixed(4)}`);
    log.info(`  Lighter: ${lighterPnL >= 0 ? '+' : ''}$${lighterPnL.toFixed(4)}`);
    log.info(`  总计: ${totalPnL >= 0 ? '+' : ''}$${totalPnL.toFixed(4)}`);

    if (paradexPnL === 0 && lighterPnL === 0) {
      log.warn('\n⚠️  盈亏都是0，可能原因:');
      log.warn('  1. 订单历史不足（少于2个订单）');
      log.warn('  2. 订单分组失败（无法识别开平仓）');
      log.warn('  3. 价格字段提取失败');
      log.warn('\n建议查看上面的 debug 日志，了解分组和计算详情');
    } else if (lighterPnL === 0 && paradexPnL !== 0) {
      log.warn('\n⚠️  Lighter 盈亏为0，但 Paradex 有值');
      log.warn('  可能 Lighter 订单格式或分组逻辑有问题');
      log.warn('  检查上面的订单数据格式');
    }

    // log.info('\n='.repeat(80));

    if (paradexClient) paradexClient.close();
    if (lighterClient) lighterClient.close();

    process.exit(0);
  } catch (error: any) {
    log.error('\n❌ 测试失败', error);
    log.error(`错误信息: ${error.message}`);
    if (error.stack) {
      log.error(`错误堆栈:\n${error.stack}`);
    }

    if (paradexClient) paradexClient.close();
    if (lighterClient) lighterClient.close();

    process.exit(1);
  }
}

// 处理未捕获的异常
process.on('unhandledRejection', (reason, promise) => {
  log.error('未处理的 Promise 拒绝:', reason);
  process.exit(1);
});

process.on('SIGINT', () => {
  log.info('\n\n⚠️  用户中断测试');
  process.exit(0);
});

// 执行测试
testLastRoundPnL();
