/**
 * 测试 Lighter AccountApi.getAccount
 *
 * 用途：详细测试账户查询功能，诊断持仓数据问题
 *
 * 使用方法：
 * pnpm tsx scripts/test-lighter-account.ts
 */

import { ApiClient, AccountApi } from 'lighter-ts-sdk';
import { config } from '../src/config/index.js';
import log from '../src/utils/logger.js';

async function testLighterAccount() {
  let apiClient: ApiClient | null = null;

  try {
    log.info('='.repeat(80));
    log.info('🧪 测试 Lighter AccountApi.getAccount');
    log.info('='.repeat(80));
    log.info(`环境: ${config.network}`);
    log.info(`币种: ${config.symbol}`);
    log.info(`API URL: ${config.lighter.apiUrl}`);
    log.info(`Account Index: ${config.lighter.accountIndex}`);
    log.info('='.repeat(80));

    // 创建 API 客户端
    log.info('\n📡 正在创建 ApiClient...');
    apiClient = new ApiClient({ host: config.lighter.apiUrl });
    const accountApi = new AccountApi(apiClient);
    log.info('✅ ApiClient 创建成功');

    // 测试 1: 通过 index 查询账户
    log.info('\n' + '-'.repeat(80));
    log.info('📊 测试 1: 通过 account index 查询账户信息');
    log.info('-'.repeat(80));

    const accountIndex = config.lighter.accountIndex.toString();
    log.info(`查询参数: { by: 'index', value: '${accountIndex}' }`);

    const account = await accountApi.getAccount({
      by: 'index',
      value: accountIndex,
    });

    log.info('✅ 查询成功！');

    // 输出完整的账户信息（JSON 格式）
    log.info('\n📋 完整 API 响应 (JSON):');
    log.info('-'.repeat(80));
    console.log(JSON.stringify(account, null, 2));
    log.info('-'.repeat(80));

    // ⚠️ 重要：API 返回格式是 { code: 200, total: 1, accounts: [...] }
    // 需要从 accounts 数组中取第一个元素
    const accountData = (account as any).accounts?.[0];

    if (!accountData) {
      log.error('❌ API 返回的数据中没有 accounts 数组或为空');
      throw new Error('账户数据格式错误');
    }

    // 解析关键字段
    log.info('\n📊 账户关键字段:');
    log.info('-'.repeat(80));
    log.info(
      `├─ Account Index: ${accountData.index || accountData.account_index || 'N/A'}`
    );
    log.info(`├─ L1 Address: ${accountData.l1_address || 'N/A'}`);
    log.info(`├─ L2 Address: ${accountData.l2_address || 'N/A'}`);
    log.info(`├─ Available Balance: ${accountData.available_balance || 'N/A'}`);
    log.info(`├─ Collateral: ${accountData.collateral || 'N/A'}`);
    log.info(`└─ Positions Count: ${accountData.positions?.length || 0}`);

    // 测试 2: 详细分析 positions 数组
    log.info('\n' + '-'.repeat(80));
    log.info('📊 测试 2: 分析 Positions 数组');
    log.info('-'.repeat(80));

    const positions = accountData.positions || [];

    if (positions.length === 0) {
      log.info('⚠️  当前没有任何持仓');
    } else {
      log.info(`找到 ${positions.length} 个持仓:\n`);

      positions.forEach((position: any, index: number) => {
        log.info(`持仓 #${index + 1}:`);
        log.info('─'.repeat(60));
        log.info(`  Market ID: ${position.market_id}`);
        log.info(`  Symbol: ${position.symbol || 'N/A'}`);
        log.info(`  Sign: ${position.sign} (1=long, -1=short)`);
        log.info(`  Position Size: ${position.position}`);
        log.info(`  Avg Entry Price: ${position.avg_entry_price || 'N/A'}`);
        log.info(`  Position Value: ${position.position_value || 'N/A'}`);
        log.info(`  Unrealized PnL: ${position.unrealized_pnl || 'N/A'}`);
        log.info(`  Realized PnL: ${position.realized_pnl || 'N/A'}`);
        log.info(`  Liquidation Price: ${position.liquidation_price || 'N/A'}`);

        // 计算持仓方向值
        const size = parseFloat(position.position || '0');
        const sign = position.sign || 1;
        const positionValue = size * sign;
        log.info(`  持仓值 (正=多，负=空): ${positionValue.toFixed(4)}`);

        // 输出完整的持仓对象
        log.info(`  完整数据: ${JSON.stringify(position)}`);
        log.info('');
      });
    }

    // 测试 3: 查找特定市场的持仓
    log.info('\n' + '-'.repeat(80));
    log.info(`📊 测试 3: 查找 ${config.symbol} 的持仓`);
    log.info('-'.repeat(80));

    // 先获取市场索引
    const { OrderApi } = await import('lighter-ts-sdk');
    const orderApi = new OrderApi(apiClient);
    const orderBooks = await orderApi.getOrderBooks();
    const orderBooksArray =
      (orderBooks as any).order_books || (orderBooks as any).orderBooks || [];

    const market = orderBooksArray.find((ob: any) => {
      const symbol = (ob.symbol || '').toUpperCase();
      return symbol === config.symbol.toUpperCase();
    });

    if (!market) {
      log.warn(`⚠️  未找到 ${config.symbol} 市场`);
    } else {
      const marketId = market.market_id;
      log.info(`${config.symbol} 的 Market ID: ${marketId}`);

      const targetPosition = positions.find((p: any) => p.market_id === marketId);

      if (!targetPosition) {
        log.info(`❌ 在 ${config.symbol} (Market ID: ${marketId}) 中没有持仓`);
      } else {
        log.info(`✅ 找到 ${config.symbol} 的持仓:`);
        log.info('─'.repeat(60));
        log.info(`  Sign: ${targetPosition.sign} (1=long, -1=short)`);
        log.info(`  Position Size: ${targetPosition.position}`);
        log.info(`  Avg Entry Price: ${targetPosition.avg_entry_price || 'N/A'}`);
        log.info(`  Unrealized PnL: ${targetPosition.unrealized_pnl || 'N/A'}`);

        // 计算持仓方向值（正负数）
        const size = parseFloat(targetPosition.position || '0');
        const sign = targetPosition.sign || 1;
        const positionValue = size * sign;
        log.info(`  持仓值 (正=多，负=空): ${positionValue.toFixed(4)}`);
      }
    }

    // 测试 4: 测试字段兼容性
    log.info('\n' + '-'.repeat(80));
    log.info('📊 测试 4: 检查字段兼容性');
    log.info('-'.repeat(80));

    if (positions.length > 0) {
      const firstPosition = positions[0];
      log.info('检查第一个持仓的字段:');
      log.info(`  ✓ market_id 存在: ${firstPosition.market_id !== undefined}`);
      log.info(
        `  ✓ sign 存在: ${firstPosition.sign !== undefined} (值: ${firstPosition.sign})`
      );
      log.info(`  ✓ position 存在: ${firstPosition.position !== undefined}`);
      log.info(
        `  ✓ avg_entry_price 存在: ${firstPosition.avg_entry_price !== undefined}`
      );
      log.info(`  ✓ position_value 存在: ${firstPosition.position_value !== undefined}`);
      log.info(`  ✓ unrealized_pnl 存在: ${firstPosition.unrealized_pnl !== undefined}`);
      log.info(`  ✓ realized_pnl 存在: ${firstPosition.realized_pnl !== undefined}`);
      log.info(
        `  ✓ liquidation_price 存在: ${firstPosition.liquidation_price !== undefined}`
      );
    }

    // 总结
    log.info('\n' + '='.repeat(80));
    log.info('📋 测试总结');
    log.info('='.repeat(80));
    log.info(`✅ AccountApi.getAccount() 调用成功`);
    log.info(`✅ 账户索引: ${accountIndex}`);
    log.info(`✅ 持仓数量: ${positions.length}`);
    if (positions.length > 0) {
      const markets = positions
        .map((p: any) => `${p.symbol || p.market_id} (${p.side})`)
        .join(', ');
      log.info(`✅ 持仓市场: ${markets}`);
    }
    log.info('='.repeat(80));

    log.info('\n✅ 所有测试完成！');

    // 关闭客户端
    if (apiClient) {
      await apiClient.close();
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

    // 关闭客户端
    if (apiClient) {
      await apiClient.close();
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
testLighterAccount();
