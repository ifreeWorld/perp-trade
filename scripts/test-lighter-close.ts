/**
 * 测试 Lighter 平仓逻辑
 *
 * 用途：测试持仓查询和平仓方向是否正确
 *
 * 使用方法：
 * NODE_ENV=mainnet pnpm tsx scripts/test-lighter-close.ts
 */

import { LighterClient } from '../src/connectors/lighter-client.js';
import { config } from '../src/config/index.js';
import log from '../src/utils/logger.js';

async function testLighterClose() {
  let client: LighterClient | null = null;

  try {
    log.info('='.repeat(80));
    log.info('🧪 测试 Lighter 平仓逻辑');
    log.info('='.repeat(80));
    log.info(`环境: ${config.network}`);
    log.info(`币种: ${config.symbol}`);
    log.info(`API URL: ${config.lighter.apiUrl}`);
    log.info(`Account Index: ${config.lighter.accountIndex}`);
    log.info('='.repeat(80));

    // 创建客户端
    log.info('\n📡 正在创建 Lighter 客户端...');
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

    // 测试 1: 获取当前持仓
    log.info('\n' + '-'.repeat(80));
    log.info('📊 测试 1: 获取当前持仓');
    log.info('-'.repeat(80));

    const positionValue = await client.getPosition();
    const positionDetails = await client.getPositionDetails();

    log.info(`持仓值: ${positionValue.toFixed(4)} ${config.symbol}`);

    if (positionDetails) {
      log.info('\n详细持仓信息:');
      log.info(`  Market ID: ${positionDetails.marketId}`);
      log.info(`  Symbol: ${positionDetails.symbol}`);
      log.info(`  Position (原始): ${positionDetails.position}`);
      log.info(`  Avg Entry Price: ${positionDetails.avgEntryPrice}`);
      log.info(`  Unrealized PnL: ${positionDetails.unrealizedPnl}`);
      log.info(`  Liquidation Price: ${positionDetails.liquidationPrice}`);
    }

    // 分析持仓方向
    if (positionValue > 0) {
      log.info(`\n✅ 检测到多仓 (LONG): ${positionValue} ${config.symbol}`);
    } else if (positionValue < 0) {
      log.info(`\n✅ 检测到空仓 (SHORT): ${Math.abs(positionValue)} ${config.symbol}`);
    } else {
      log.info('\n⚠️  当前无持仓');
      log.info('请先建立持仓再测试平仓逻辑');
      process.exit(0);
    }

    // 测试 2: 计算平仓方向
    log.info('\n' + '-'.repeat(80));
    log.info('📊 测试 2: 计算平仓方向');
    log.info('-'.repeat(80));

    const isAsk = positionValue > 0;
    const closeDirection = isAsk ? 'SELL' : 'BUY';
    const closeSize = Math.abs(positionValue);

    log.info(`当前持仓值: ${positionValue.toFixed(4)}`);
    log.info(`持仓方向: ${positionValue > 0 ? 'LONG (多仓)' : 'SHORT (空仓)'}`);
    log.info(`平仓方向: ${closeDirection}`);
    log.info(`平仓数量: ${closeSize.toFixed(4)} ${config.symbol}`);
    log.info(`isAsk 参数: ${isAsk}`);

    // 验证逻辑
    log.info('\n逻辑验证:');
    if (positionValue > 0) {
      log.info(`  ✅ 多仓 → isAsk = true → SELL (卖出平仓)`);
      log.info(`  ${isAsk === true ? '✅' : '❌'} isAsk 值正确`);
    } else if (positionValue < 0) {
      log.info(`  ✅ 空仓 → isAsk = false → BUY (买入平仓)`);
      log.info(`  ${isAsk === false ? '✅' : '❌'} isAsk 值正确`);
    }

    // 测试 3: 检查 API 返回数据
    log.info('\n' + '-'.repeat(80));
    log.info('📊 测试 3: 检查 API 原始数据');
    log.info('-'.repeat(80));

    const { ApiClient, AccountApi } = await import('lighter-ts-sdk');
    const apiClient = new ApiClient({ host: config.lighter.apiUrl });
    const accountApi = new AccountApi(apiClient);

    const response: any = await accountApi.getAccount({
      by: 'index',
      value: config.lighter.accountIndex.toString(),
    });

    const account = response.accounts?.[0];
    if (!account) {
      log.error('❌ 未找到账户数据');
      process.exit(1);
    }

    const positions = account.positions || [];
    const position = positions.find((p: any) => p.symbol === config.symbol);

    if (position) {
      log.info('API 原始数据:');
      log.info(`  market_id: ${position.market_id}`);
      log.info(`  symbol: ${position.symbol}`);
      log.info(`  sign: ${position.sign} (1=long, -1=short)`);
      log.info(`  position: ${position.position}`);
      log.info(`  avg_entry_price: ${position.avg_entry_price}`);

      // 计算持仓值
      const size = parseFloat(position.position || '0');
      const sign = position.sign || 1;
      const calculatedValue = size * sign;

      log.info(`\n计算过程:`);
      log.info(`  size = parseFloat("${position.position}") = ${size}`);
      log.info(`  sign = ${sign}`);
      log.info(`  持仓值 = size × sign = ${size} × ${sign} = ${calculatedValue}`);
      log.info(`  getPosition() 返回值: ${positionValue}`);
      log.info(
        `  ${Math.abs(calculatedValue - positionValue) < 0.0001 ? '✅' : '❌'} 计算一致`
      );

      // 验证平仓方向
      log.info(`\n平仓方向验证:`);
      if (sign === 1) {
        log.info(`  当前：多仓 (sign=1)`);
        log.info(`  应该：SELL 平仓 (isAsk=true)`);
        log.info(`  实际：${isAsk ? 'SELL' : 'BUY'} (isAsk=${isAsk})`);
        log.info(`  ${isAsk === true ? '✅' : '❌'} 方向正确`);
      } else if (sign === -1) {
        log.info(`  当前：空仓 (sign=-1)`);
        log.info(`  应该：BUY 平仓 (isAsk=false)`);
        log.info(`  实际：${isAsk ? 'SELL' : 'BUY'} (isAsk=${isAsk})`);
        log.info(`  ${isAsk === false ? '✅' : '❌'} 方向正确`);
      }
    } else {
      log.warn(`⚠️  未在 API 数据中找到 ${config.symbol} 的持仓`);
    }

    // 测试 4: 模拟平仓参数
    log.info('\n' + '-'.repeat(80));
    log.info('📊 测试 4: 平仓参数预览');
    log.info('-'.repeat(80));

    log.info('平仓参数:');
    log.info(`  方法: createMarketOrder(isAsk, size)`);
    log.info(`  isAsk: ${isAsk}`);
    log.info(`  size: "${closeSize.toFixed(4)}"`);
    log.info(
      `  含义: ${isAsk ? 'SELL' : 'BUY'} ${closeSize.toFixed(4)} ${config.symbol}`
    );

    // 检查逻辑是否正确
    const logicCorrect =
      (positionValue > 0 && isAsk === true) || (positionValue < 0 && isAsk === false);

    if (!logicCorrect) {
      log.error('\n❌ 平仓逻辑有误，中止执行！');
      log.error(`  持仓值: ${positionValue}`);
      log.error(`  isAsk: ${isAsk}`);
      log.error(`  预期: ${positionValue > 0 ? 'isAsk=true' : 'isAsk=false'}`);
      process.exit(1);
    }

    log.info('\n✅ 平仓逻辑验证通过');

    // 测试 5: 执行真实平仓
    log.info('\n' + '-'.repeat(80));
    log.info('📊 测试 5: 执行真实平仓');
    log.info('-'.repeat(80));

    log.warn('\n⚠️  警告: 即将执行真实平仓操作！');
    log.warn('─'.repeat(80));
    log.warn(
      `持仓: ${positionValue > 0 ? 'LONG' : 'SHORT'} ${closeSize.toFixed(4)} ${config.symbol}`
    );
    log.warn(`平仓方向: ${closeDirection}`);
    log.warn(`平仓数量: ${closeSize.toFixed(4)} ${config.symbol}`);
    log.warn('─'.repeat(80));

    log.info('\n🔄 正在执行平仓...');

    try {
      // ⚠️ 平仓时必须设置 reduceOnly = true
      const result = await client.createMarketOrder(isAsk, closeSize.toString(), true);

      log.info('✅ 平仓订单提交成功！');
      log.info(`  TxHash: ${result.txHash}`);

      // 等待订单成交
      log.info('\n⏳ 等待 5 秒，让订单成交...');
      await new Promise((resolve) => setTimeout(resolve, 5000));

      // 验证平仓结果
      log.info('\n📊 验证平仓结果...');
      const positionAfter = await client.getPosition();

      log.info(`平仓前持仓: ${positionValue.toFixed(4)} ${config.symbol}`);
      log.info(`平仓后持仓: ${positionAfter.toFixed(4)} ${config.symbol}`);
      log.info(
        `持仓变化: ${(positionAfter - positionValue).toFixed(4)} ${config.symbol}`
      );

      if (Math.abs(positionAfter) < 0.001) {
        log.info('✅ 平仓成功！持仓已清零');
      } else {
        log.warn(`⚠️  平仓后仍有残留持仓: ${positionAfter.toFixed(4)} ${config.symbol}`);
        log.warn('可能需要再次执行平仓');
      }
    } catch (error: any) {
      log.error('\n❌ 平仓执行失败', error);
      log.error(`错误信息: ${error.message}`);
      throw error;
    }

    // 总结
    log.info('\n' + '='.repeat(80));
    log.info('📋 平仓总结');
    log.info('='.repeat(80));
    log.info(`✅ 平仓前持仓: ${positionValue.toFixed(4)} ${config.symbol}`);
    log.info(`✅ 平仓方向: ${closeDirection}`);
    log.info(`✅ 平仓数量: ${closeSize.toFixed(4)}`);

    const finalPosition = await client.getPosition();
    log.info(`✅ 最终持仓: ${finalPosition.toFixed(4)} ${config.symbol}`);
    log.info('='.repeat(80));

    await apiClient.close();
    if (client) {
      client.close();
    }

    process.exit(0);
  } catch (error: any) {
    log.error('\n❌ 测试失败', error);
    log.error(`错误类型: ${error.constructor.name}`);
    log.error(`错误信息: ${error.message}`);

    if (error.response) {
      log.error(`HTTP 状态码: ${error.response.status}`);
      log.error(`响应数据: ${JSON.stringify(error.response.data, null, 2)}`);
    }

    if (error.stack) {
      log.error(`错误堆栈:\n${error.stack}`);
    }

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
testLighterClose();
