/**
 * 测试 avgExecutionPrice 单位
 *
 * 用途：测试不同的 avgExecutionPrice 计算方式
 *
 * 使用方法：
 * NODE_ENV=mainnet pnpm tsx scripts/test-price-units.ts
 */

import { config } from '../src/config/index.js';
import { OrderApi, ApiClient } from 'lighter-ts-sdk';
import log from '../src/utils/logger.js';

async function testPriceUnits() {
  try {
    log.info('='.repeat(80));
    log.info('🧪 测试 avgExecutionPrice 单位计算');
    log.info('='.repeat(80));

    // 获取当前市场价格
    const apiClient = new ApiClient({ host: config.lighter.apiUrl });
    const orderApi = new OrderApi(apiClient);

    const response: any = await orderApi.getOrderBookDetails({
      market_id: 25, // BNB market_id
    });

    const details = response.order_book_details?.[0] || response;
    const currentPrice = parseFloat(details.last_trade_price?.toString() || '0');

    log.info(`\n当前 BNB 市场价格: $${currentPrice}`);
    log.info('='.repeat(80));

    // 假设我们要卖出平仓 0.05 BNB
    const size = 0.05;

    log.info(`\n📊 测试场景: 卖出平仓 ${size} BNB`);
    log.info('-'.repeat(80));

    // 方法 1：使用 decimals (× 100)
    log.info('\n方法 1: baseAmount 使用 decimals (× 100)');
    const baseAmount1 = Math.round(size * 100);
    const avgExecPrice1_cents = Math.round(currentPrice * 100);
    const avgExecPrice1_withSlippage = Math.round(currentPrice * 100 * 0.5);

    log.info(`  baseAmount = ${size} × 100 = ${baseAmount1}`);
    log.info(
      `  avgExecutionPrice (美分) = ${currentPrice} × 100 = ${avgExecPrice1_cents}`
    );
    log.info(`  avgExecutionPrice (美分, 50%滑点) = ${avgExecPrice1_withSlippage}`);

    // 方法 2：使用固定 1,000,000
    log.info('\n方法 2: baseAmount 使用 1,000,000');
    const baseAmount2 = Math.floor(size * 1000000);
    const avgExecPrice2 = Math.floor(currentPrice * 100000);
    const avgExecPrice2_withSlippage = Math.floor(avgExecPrice2 / 2);

    log.info(`  baseAmount = ${size} × 1,000,000 = ${baseAmount2}`);
    log.info(`  avgExecutionPrice = ${currentPrice} × 100,000 = ${avgExecPrice2}`);
    log.info(
      `  avgExecutionPrice (2倍滑点) = ${avgExecPrice2} / 2 = ${avgExecPrice2_withSlippage}`
    );

    // 方法 3：文档中的简单示例风格
    log.info('\n方法 3: 文档简单示例风格');
    log.info('  baseAmount: 10  // 直接 10 units');
    log.info('  avgExecutionPrice: 4500  // $45.00 in cents');
    log.info('  推断：如果是 10 个最小单位，那 price 就是美分');

    // 对比分析
    log.info('\n' + '='.repeat(80));
    log.info('📋 对比分析');
    log.info('='.repeat(80));

    log.info(`\n当前 BNB 价格: $${currentPrice}`);
    log.info('\n如果 avgExecutionPrice 单位是美分:');
    log.info(
      `  卖出时应设置: ${avgExecPrice1_withSlippage} (允许低至 $${avgExecPrice1_withSlippage / 100})`
    );

    log.info('\n如果 avgExecutionPrice 单位是 price × 100,000:');
    log.info(
      `  卖出时应设置: ${avgExecPrice2_withSlippage} (允许低至 $${avgExecPrice2_withSlippage / 100000})`
    );

    // 根据官方示例推断
    log.info('\n' + '='.repeat(80));
    log.info('📊 根据官方示例推断');
    log.info('='.repeat(80));

    log.info('\n官方 close_position.ts:');
    log.info(`  const priceInUnits = Math.floor(avgPrice * 100000);`);
    log.info(`  avgExecutionPrice: priceInUnits * 2`);
    log.info(`  → 单位 = 价格 × 100,000`);

    log.info('\n文档简单示例:');
    log.info(`  avgExecutionPrice: 4500  // Max price in cents: $45.00`);
    log.info(`  → 单位 = 美分`);

    log.info('\n文档完整示例:');
    log.info(`  avgExecutionPrice: 300000000  // Max $3000`);
    log.info(`  如果单位是美分: $3000 = 300,000 cents ❌`);
    log.info(`  如果单位是 × 100,000: $3000 = 300,000,000 ✅`);

    // 结论
    log.info('\n' + '='.repeat(80));
    log.info('🎯 结论');
    log.info('='.repeat(80));
    log.info('\navgExecutionPrice 的正确单位应该是:');
    log.info('  avgExecutionPrice = 价格（美元）× 100,000');
    log.info('');
    log.info('示例：');
    log.info(`  当前 BNB 价格: $${currentPrice}`);
    log.info(`  正确的 avgExecutionPrice: ${Math.floor(currentPrice * 100000)}`);
    log.info(`  卖出平仓（2倍滑点）: ${Math.floor((currentPrice * 100000) / 2)}`);
    log.info('='.repeat(80));

    // 检查用户当前代码
    log.info('\n📊 检查当前代码设置');
    log.info('-'.repeat(80));

    const decimals = 2; // BNB decimals
    const currentBaseAmount = Math.round(size * Math.pow(10, decimals));
    const currentPriceInUnits = Math.floor(currentPrice * 100000);
    const currentAvgExecPrice = Math.floor(currentPriceInUnits / 2);

    log.info(`当前代码使用:`);
    log.info(`  baseAmount = ${size} × 10^${decimals} = ${currentBaseAmount}`);
    log.info(`  priceInUnits = ${currentPrice} × 100,000 = ${currentPriceInUnits}`);
    log.info(`  avgExecutionPrice = ${currentPriceInUnits} / 2 = ${currentAvgExecPrice}`);

    log.info('\n⚠️  问题分析:');
    log.info(`  baseAmount 使用 decimals (× ${Math.pow(10, decimals)})`);
    log.info(`  avgExecutionPrice 使用固定 (× 100,000)`);
    log.info('  → 两者缩放倍数不一致！');

    log.info('\n💡 建议:');
    log.info('  选项 A: baseAmount 和 avgExecutionPrice 都使用固定倍数');
    log.info(`    baseAmount = ${size} × 1,000,000 = ${Math.floor(size * 1000000)}`);
    log.info(
      `    avgExecutionPrice = ${currentPrice} × 100,000 = ${currentPriceInUnits}`
    );
    log.info('');
    log.info('  选项 B: 都使用 decimals（但需要确认价格单位）');
    log.info(
      `    baseAmount = ${size} × ${Math.pow(10, decimals)} = ${currentBaseAmount}`
    );
    log.info(
      `    avgExecutionPrice = ${currentPrice} × ${Math.pow(10, decimals)} = ${Math.round(currentPrice * Math.pow(10, decimals))}`
    );

    log.info('\n='.repeat(80));

    await apiClient.close();
    process.exit(0);
  } catch (error: any) {
    log.error('测试失败', error);
    process.exit(1);
  }
}

testPriceUnits();
