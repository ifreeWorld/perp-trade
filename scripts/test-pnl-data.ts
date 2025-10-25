/**
 * 测试使用增量方式计算盈亏
 *
 * 原理：记录开仓前和平仓后的总盈亏，计算差值
 * 这种方式更可靠，自动包含所有成本（手续费、资金费率等）
 *
 * 使用方法：
 * NODE_ENV=mainnet pnpm tsx scripts/test-pnl-data.ts
 */

import { ParadexClient } from '../src/connectors/paradex-client.js';
import { LighterClient } from '../src/connectors/lighter-client.js';
import { config } from '../src/config/index.js';
import log from '../src/utils/logger.js';
import { ApiClient, AccountApi } from 'lighter-ts-sdk';

async function testPnLData() {
  let paradexClient: ParadexClient | null = null;
  let lighterClient: LighterClient | null = null;
  let lighterApiClient: ApiClient | null = null;

  try {
    log.info('='.repeat(80));
    log.info('🧪 测试使用增量方式计算盈亏');
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

    lighterApiClient = new ApiClient({ host: config.lighter.apiUrl });

    // ===== 步骤 1: 记录开始时的盈亏 =====
    log.info('\n' + '='.repeat(80));
    log.info('📊 步骤 1: 记录开始时的盈亏（模拟开仓前）');
    log.info('='.repeat(80));

    // === Paradex 开始盈亏 ===
    log.info('\nParadex:');
    const paradexAccount1 = await paradexClient.getAccountInfo();
    const paradexPositions1 = await paradexClient.getPositions();

    log.info(`  账户 total_pnl: ${paradexAccount1.total_pnl || 'N/A'}`);
    log.info(`  账户 realized_pnl: ${paradexAccount1.realized_pnl || 'N/A'}`);

    if (paradexPositions1.length > 0) {
      const pos: any = paradexPositions1[0];
      log.info(`  持仓 realized_positional_pnl: ${pos.realized_positional_pnl || 'N/A'}`);
      log.info(`  持仓 unrealized_pnl: ${pos.unrealized_pnl || 'N/A'}`);
    } else {
      log.info('  无持仓');
    }

    // 记录起始盈亏
    const paradexStartPnL = parseFloat(
      paradexAccount1.total_pnl || paradexAccount1.realized_pnl || '0'
    );
    log.info(`  ✅ 记录起始盈亏: $${paradexStartPnL.toFixed(4)}`);

    // === Lighter 开始盈亏 ===
    log.info('\nLighter:');
    const accountApi = new AccountApi(lighterApiClient);
    const lighterAccountResp1: any = await accountApi.getAccount({
      by: 'index',
      value: config.lighter.accountIndex.toString(),
    });

    const lighterAccount1 = lighterAccountResp1.accounts?.[0];
    let lighterStartPnL = 0;

    if (lighterAccount1) {
      const bnbPos1 = lighterAccount1.positions?.find(
        (p: any) => p.symbol === config.symbol
      );

      if (bnbPos1) {
        log.info(`  持仓 realized_pnl: ${bnbPos1.realized_pnl}`);
        log.info(`  持仓 unrealized_pnl: ${bnbPos1.unrealized_pnl}`);

        lighterStartPnL = parseFloat(bnbPos1.realized_pnl || '0');
        log.info(`  ✅ 记录起始盈亏: $${lighterStartPnL.toFixed(4)}`);
      } else {
        log.info('  无持仓');
      }
    }

    // ===== 步骤 2: 模拟交易（提示用户操作）=====
    log.info('\n' + '='.repeat(80));
    log.info('📊 步骤 2: 执行一轮完整交易');
    log.info('='.repeat(80));
    log.info('\n提示: 请运行主程序完成一轮交易（开仓 -> 持仓 -> 平仓）');
    log.info('或者如果刚完成一轮，继续下一步查看盈亏变化');
    log.info('\n按 Enter 继续查询结束后的盈亏...');

    // 等待用户按键
    await new Promise<void>((resolve) => {
      process.stdin.once('data', () => resolve());
    });

    // ===== 步骤 3: 记录结束时的盈亏 =====
    log.info('\n' + '='.repeat(80));
    log.info('📊 步骤 3: 记录结束时的盈亏（模拟平仓后）');
    log.info('='.repeat(80));

    // === Paradex 结束盈亏 ===
    log.info('\nParadex:');
    const paradexAccount2 = await paradexClient.getAccountInfo();
    const paradexPositions2 = await paradexClient.getPositions();

    log.info(`  账户 total_pnl: ${paradexAccount2.total_pnl || 'N/A'}`);

    if (paradexPositions2.length > 0) {
      const pos: any = paradexPositions2[0];
      log.info(`  持仓 realized_positional_pnl: ${pos.realized_positional_pnl || 'N/A'}`);
    }

    const paradexEndPnL = parseFloat(
      paradexAccount2.total_pnl || paradexAccount2.realized_pnl || '0'
    );
    log.info(`  ✅ 记录结束盈亏: $${paradexEndPnL.toFixed(4)}`);

    // === Lighter 结束盈亏 ===
    log.info('\nLighter:');
    const lighterAccountResp2: any = await accountApi.getAccount({
      by: 'index',
      value: config.lighter.accountIndex.toString(),
    });

    const lighterAccount2 = lighterAccountResp2.accounts?.[0];
    let lighterEndPnL = 0;

    if (lighterAccount2) {
      const bnbPos2 = lighterAccount2.positions?.find(
        (p: any) => p.symbol === config.symbol
      );

      if (bnbPos2) {
        log.info(`  持仓 realized_pnl: ${bnbPos2.realized_pnl}`);
        lighterEndPnL = parseFloat(bnbPos2.realized_pnl || '0');
        log.info(`  ✅ 记录结束盈亏: $${lighterEndPnL.toFixed(4)}`);
      } else {
        log.info('  无持仓');
      }
    }

    // ===== 步骤 4: 计算盈亏差值 =====
    log.info('\n' + '='.repeat(80));
    log.info('📊 步骤 4: 计算本轮盈亏（增量）');
    log.info('='.repeat(80));

    const paradexPnL = paradexEndPnL - paradexStartPnL;
    const lighterPnL = lighterEndPnL - (lighterStartPnL || 0);
    const totalPnL = paradexPnL + lighterPnL;

    log.info('\nParadex:');
    log.info(`  开始盈亏: $${paradexStartPnL.toFixed(4)}`);
    log.info(`  结束盈亏: $${paradexEndPnL.toFixed(4)}`);
    log.info(`  ✅ 本轮盈亏: ${paradexPnL >= 0 ? '+' : ''}$${paradexPnL.toFixed(4)}`);

    log.info('\nLighter:');
    log.info(`  开始盈亏: $${(lighterStartPnL || 0).toFixed(4)}`);
    log.info(`  结束盈亏: $${lighterEndPnL.toFixed(4)}`);
    log.info(`  ✅ 本轮盈亏: ${lighterPnL >= 0 ? '+' : ''}$${lighterPnL.toFixed(4)}`);

    log.info('\n总计:');
    log.info(`  ✅ 本轮总盈亏: ${totalPnL >= 0 ? '+' : ''}$${totalPnL.toFixed(4)}`);

    // ===== 总结 =====
    log.info('\n' + '='.repeat(80));
    log.info('📋 总结');
    log.info('='.repeat(80));

    log.info('\n✅ 增量方式计算盈亏的优势:');
    log.info('  1. 简单直接，不需要复杂的订单匹配');
    log.info('  2. 自动包含所有成本（手续费、资金费率、滑点）');
    log.info('  3. 不受多笔成交影响');
    log.info('  4. Paradex 和 Lighter 使用相同逻辑');

    log.info('\n✅ 实现步骤:');
    log.info('  1. 开仓前: 记录 total_pnl 或 realized_pnl');
    log.info('  2. 平仓后: 再次查询 total_pnl 或 realized_pnl');
    log.info('  3. 计算差值: endPnL - startPnL');
    log.info('  4. 这就是本轮的净盈亏');

    log.info('\n📌 字段使用:');
    log.info('  Paradex: accountInfo.total_pnl');
    log.info('  Lighter: position.realized_pnl');

    log.info('\n='.repeat(80));

    if (lighterApiClient) await lighterApiClient.close();
    if (paradexClient) paradexClient.close();
    if (lighterClient) lighterClient.close();

    process.exit(0);
  } catch (error: any) {
    log.error('\n❌ 测试失败', error);
    log.error(`错误信息: ${error.message}`);
    if (error.stack) {
      log.error(`错误堆栈:\n${error.stack}`);
    }

    if (lighterApiClient) await lighterApiClient.close();
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
testPnLData();
