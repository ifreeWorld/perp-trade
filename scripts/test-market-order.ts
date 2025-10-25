/**
 * 测试 Lighter 市价单创建
 *
 * 用途：测试 createMarketOrder 方法的功能
 *
 * 使用方法：
 * pnpm tsx scripts/test-market-order.ts
 */

import { config, validateConfig } from '../src/config/index.js';
import { LighterClient } from '../src/connectors/lighter-client.js';
import log from '../src/utils/logger.js';

async function testMarketOrder() {
  let client: LighterClient | null = null;

  try {
    log.info('='.repeat(80));
    log.info('🧪 测试 Lighter 市价单创建');
    log.info('='.repeat(80));
    log.info(`环境: ${config.network}`);
    log.info(`币种: ${config.symbol}`);
    log.info(`API URL: ${config.lighter.apiUrl}`);
    log.info('='.repeat(80));

    // 验证配置
    // validateConfig();

    // 创建客户端
    log.info('\n📡 正在初始化 Lighter 客户端...');
    client = new LighterClient(
      config.lighter.apiUrl,
      config.lighter.wsUrl,
      config.lighter.privateKey,
      config.lighter.accountIndex,
      config.lighter.apiKeyIndex,
      config.symbol
    );

    // 初始化
    await client.initialize();
    log.info('✅ 客户端初始化成功');

    // 1. 获取当前持仓
    log.info('\n📊 步骤 1: 获取当前持仓...');
    const initialPosition = await client.getPosition();
    log.info(`当前持仓: ${initialPosition.toFixed(4)} ${config.symbol}`);

    const details = await client.getPositionDetails();
    if (details) {
      log.info(`├─ 市场ID: ${details.marketId}`);
      log.info(`├─ 平均入场价: $${details.avgEntryPrice}`);
      log.info(`└─ 未实现盈亏: $${details.unrealizedPnl}`);
    }

    // 2. 测试参数配置
    const testSize = '0.001'; // 小额测试，避免风险
    log.info('\n⚙️  步骤 2: 测试配置');
    log.info(`测试订单大小: ${testSize} ${config.symbol}`);

    // 询问用户确认
    log.info('\n⚠️  警告: 即将执行真实交易！');
    log.info('─'.repeat(80));
    log.info(`将执行以下测试:`);
    log.info(`  1. 买入 ${testSize} ${config.symbol} (市价单)`);
    log.info(`  2. 卖出 ${testSize} ${config.symbol} (市价单)`);
    log.info('─'.repeat(80));

    // 等待 3 秒，给用户时间取消
    log.info('\n⏳ 3 秒后开始执行测试... (按 Ctrl+C 取消)');
    await new Promise((resolve) => setTimeout(resolve, 3000));

    // 3. 测试市价买单
    log.info('\n🟢 步骤 3: 测试市价买单...');
    log.info(`订单类型: BUY (买入)`);
    log.info(`订单大小: ${testSize} ${config.symbol}`);

    const buyResult = await client.createMarketOrder(false, testSize);

    log.info('✅ 市价买单创建成功！');
    log.info(`├─ 交易哈希: ${buyResult.txHash}`);
    log.info(`└─ 交易详情: ${JSON.stringify(buyResult.tx, null, 2)}`);

    // 等待订单执行
    log.info('\n⏳ 等待 5 秒，让订单执行...');
    await new Promise((resolve) => setTimeout(resolve, 5000));

    // 检查持仓变化
    const positionAfterBuy = await client.getPosition();
    const buyChange = positionAfterBuy - initialPosition;
    log.info(
      `持仓变化: ${buyChange > 0 ? '+' : ''}${buyChange.toFixed(4)} ${config.symbol}`
    );
    log.info(`当前持仓: ${positionAfterBuy.toFixed(4)} ${config.symbol}`);

    // 4. 测试市价卖单
    log.info('\n🔴 步骤 4: 测试市价卖单...');
    log.info(`订单类型: SELL (卖出)`);
    log.info(`订单大小: ${testSize} ${config.symbol}`);

    const sellResult = await client.createMarketOrder(true, testSize);

    log.info('✅ 市价卖单创建成功！');
    log.info(`├─ 交易哈希: ${sellResult.txHash}`);
    log.info(`└─ 交易详情: ${JSON.stringify(sellResult.tx, null, 2)}`);

    // 等待订单执行
    log.info('\n⏳ 等待 5 秒，让订单执行...');
    await new Promise((resolve) => setTimeout(resolve, 5000));

    // 检查最终持仓
    const finalPosition = await client.getPosition();
    const sellChange = finalPosition - positionAfterBuy;
    log.info(
      `持仓变化: ${sellChange > 0 ? '+' : ''}${sellChange.toFixed(4)} ${config.symbol}`
    );
    log.info(`最终持仓: ${finalPosition.toFixed(4)} ${config.symbol}`);

    // 5. 总结
    log.info('\n' + '='.repeat(80));
    log.info('📋 测试总结');
    log.info('='.repeat(80));
    log.info(`初始持仓: ${initialPosition.toFixed(4)} ${config.symbol}`);
    log.info(
      `买入后持仓: ${positionAfterBuy.toFixed(4)} ${config.symbol} (${buyChange > 0 ? '+' : ''}${buyChange.toFixed(4)})`
    );
    log.info(
      `最终持仓: ${finalPosition.toFixed(4)} ${config.symbol} (${sellChange > 0 ? '+' : ''}${sellChange.toFixed(4)})`
    );
    log.info(
      `净持仓变化: ${(finalPosition - initialPosition).toFixed(4)} ${config.symbol}`
    );
    log.info('='.repeat(80));

    // 获取最终详细信息
    const finalDetails = await client.getPositionDetails();
    if (finalDetails) {
      log.info('\n📈 最终持仓详情:');
      log.info(`├─ 市场ID: ${finalDetails.marketId}`);
      log.info(`├─ 持仓大小: ${finalDetails.position}`);
      log.info(`├─ 平均入场价: $${finalDetails.avgEntryPrice}`);
      log.info(`└─ 未实现盈亏: $${finalDetails.unrealizedPnl}`);
    }

    log.info('\n✅ 所有测试完成！');
    log.info('='.repeat(80));

    // 关闭客户端
    if (client) {
      client.close();
    }

    process.exit(0);
  } catch (error: any) {
    log.error('\n❌ 测试失败', error);
    log.error(`错误信息: ${error.message}`);
    if (error.stack) {
      log.error(`错误堆栈:\n${error.stack}`);
    }

    // 关闭客户端
    if (client) {
      client.close();
    }

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
testMarketOrder();
