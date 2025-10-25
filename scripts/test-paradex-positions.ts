/**
 * 测试 Paradex /positions 端点
 *
 * 用途：测试新的 /positions API 端点是否正常工作
 *
 * 使用方法：
 * NODE_ENV=mainnet pnpm tsx scripts/test-paradex-positions.ts
 */

import { ParadexClient } from '../src/connectors/paradex-client.js';
import { config } from '../src/config/index.js';
import log from '../src/utils/logger.js';

async function testParadexPositions() {
  let client: ParadexClient | null = null;

  try {
    log.info('='.repeat(80));
    log.info('🧪 测试 Paradex /positions 端点');
    log.info('='.repeat(80));
    log.info(`环境: ${config.network}`);
    log.info(`币种: ${config.symbol}`);
    log.info(`API URL: ${config.paradex.apiUrl}`);
    log.info('='.repeat(80));

    // 创建客户端
    log.info('\n📡 正在创建 Paradex 客户端...');
    client = new ParadexClient(
      config.paradex.apiUrl,
      config.paradex.starknetPrivateKey,
      config.symbol,
      config.paradex.starknetAddress,
      config.paradex.starknetPublicKey,
      config.paradex.ethereumAddress,
      config.network
    );

    // 初始化
    log.info('正在初始化（Onboarding + JWT 认证）...');
    await client.initialize();
    log.info('✅ 初始化成功');

    // 测试 1: 调用 getPositions()
    log.info('\n' + '-'.repeat(80));
    log.info('📊 测试 1: 调用 getPositions() - 使用 /positions 端点');
    log.info('-'.repeat(80));

    const positions = await client.getPositions();

    log.info(`✅ API 调用成功！`);
    log.info(`持仓数量: ${positions.length}`);

    if (positions.length === 0) {
      log.info('⚠️  当前没有任何持仓');
    } else {
      log.info(`\n找到 ${positions.length} 个持仓:\n`);

      positions.forEach((position: any, index: number) => {
        log.info(`持仓 #${index + 1}:`);
        log.info('─'.repeat(60));
        log.info(`  Market: ${position.market}`);
        log.info(`  Side: ${position.side}`);
        log.info(
          `  Size: ${position.size} ${parseFloat(position.size) < 0 ? '(空仓)' : '(多仓)'}`
        );
        log.info(`  Status: ${position.status}`);
        log.info(`  Avg Entry Price: ${position.average_entry_price || 'N/A'}`);
        log.info(`  Unrealized PnL: ${position.unrealized_pnl || 'N/A'}`);
        log.info(`  Liquidation Price: ${position.liquidation_price || 'N/A'}`);
        log.info('');
        log.info(`  完整数据:`);
        console.log(JSON.stringify(position, null, 2));
        log.info('');
      });
    }

    // 测试 2: 调用 getPosition() 获取特定市场持仓
    log.info('\n' + '-'.repeat(80));
    log.info(`📊 测试 2: 调用 getPosition() - 查找 ${config.symbol}-USD-PERP`);
    log.info('-'.repeat(80));

    const positionValue = await client.getPosition();

    log.info(`持仓值: ${positionValue.toFixed(4)}`);

    if (positionValue > 0) {
      log.info(`✅ 多仓 (LONG): ${positionValue} ${config.symbol}`);
    } else if (positionValue < 0) {
      log.info(`✅ 空仓 (SHORT): ${Math.abs(positionValue)} ${config.symbol}`);
    } else {
      log.info(`⚠️  无持仓`);
    }

    // 测试 3: 验证 size 字段的方向信息
    log.info('\n' + '-'.repeat(80));
    log.info('📊 测试 3: 验证 size 字段包含方向信息');
    log.info('-'.repeat(80));

    if (positions.length > 0) {
      positions.forEach((position: any, index: number) => {
        const size = parseFloat(position.size);
        const expectedSign = position.side === 'LONG' ? '正数' : '负数';
        const actualSign = size >= 0 ? '正数' : '负数';
        const match = expectedSign === actualSign ? '✅' : '❌';

        log.info(`持仓 #${index + 1}:`);
        log.info(`  Market: ${position.market}`);
        log.info(`  Side: ${position.side}`);
        log.info(`  Size: ${position.size}`);
        log.info(`  预期符号: ${expectedSign}`);
        log.info(`  实际符号: ${actualSign}`);
        log.info(`  ${match} ${expectedSign === actualSign ? '符合预期' : '不符合预期'}`);
        log.info('');
      });
    }

    // 总结
    log.info('\n' + '='.repeat(80));
    log.info('📋 测试总结');
    log.info('='.repeat(80));
    log.info(`✅ /positions 端点调用成功`);
    log.info(`✅ 返回字段名: "results"`);
    log.info(`✅ 持仓数量: ${positions.length}`);
    if (positions.length > 0) {
      const markets = positions
        .map((p: any) => `${p.market} (${p.side}, size=${p.size})`)
        .join(', ');
      log.info(`✅ 持仓详情: ${markets}`);
    }
    log.info(`✅ ${config.symbol}-USD-PERP 持仓值: ${positionValue.toFixed(4)}`);
    log.info('='.repeat(80));

    log.info('\n✅ 所有测试完成！');

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
testParadexPositions();
