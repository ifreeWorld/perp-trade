/**
 * 对冲策略核心模块
 *
 * 策略说明：
 * - 在 Paradex 和 Lighter 进行反向对冲交易
 * - 使用市价单策略，消除价格磨损
 * - 5 层风控保护机制
 * - 实时成交监控，防止单边暴露
 */

import { ParadexClient } from '../connectors/paradex-client.js';
import { LighterClient } from '../connectors/lighter-client.js';
import { TradingConfig, PositionInfo, FillStatus } from '../types/index.js';
import log from '../utils/logger.js';
import { randomInt, sleep } from '../utils/math-helper.js';
import {
  alertPartialFill,
  alertNetPosition,
  alertEmergencyShutdown,
} from '../utils/telegram-alert.js';
import { PnLTracker } from '../utils/pnl-tracker.js';

export class HedgeStrategy {
  private paradex: ParadexClient;
  private lighter: LighterClient;
  private config: TradingConfig;
  private isRunning: boolean = false;
  private pnlTracker: PnLTracker;

  // 用于记录每轮开始时的总盈亏（用于计算增量）
  private roundStartPnL: {
    paradex: number;
    lighter: number;
  } = {
    paradex: 0,
    lighter: 0,
  };

  constructor(
    paradexClient: ParadexClient,
    lighterClient: LighterClient,
    config: TradingConfig
  ) {
    this.paradex = paradexClient;
    this.lighter = lighterClient;
    this.config = config;
    this.pnlTracker = new PnLTracker();
  }

  /**
   * 初始化 - 验证市场并初始化客户端
   */
  async initialize(): Promise<void> {
    log.info(`初始化交易对: ${this.config.symbol}`);

    // 1. 验证 Paradex 市场
    await this.paradex.validateMarket();

    // 2. 初始化 Lighter 客户端（包含 marketId 查询）
    await this.lighter.initialize();

    log.info('✅ 所有市场验证成功，系统已就绪');
  }

  /**
   * 主循环
   */
  async run(): Promise<void> {
    this.isRunning = true;
    log.info(`策略启动 - 环境: ${this.config.network}, 币种: ${this.config.symbol}`);

    // 启动前先初始化
    await this.initialize();

    let roundCount = 0;

    while (this.isRunning) {
      try {
        roundCount++;
        log.info(`\n--- 第 ${roundCount} 轮交易 ---`);

        // 2. 检查净持仓
        await this.checkAndRebalance();

        // 3-5. 开仓
        await this.openPositions();

        // 5. 随机持仓时间
        const holdTime = randomInt(
          this.config.strategy.holdTimeMin,
          this.config.strategy.holdTimeMax
        );
        log.info(`持仓 ${holdTime} 秒`);
        await sleep(holdTime * 1000);

        // 6. 平仓（并记录订单ID）
        await this.closePositions(roundCount);

        // 7. 随机间隔时间
        const intervalTime = randomInt(
          this.config.strategy.intervalTimeMin,
          this.config.strategy.intervalTimeMax
        );
        log.info(`等待 ${intervalTime} 秒后开始下一轮`);
        await sleep(intervalTime * 1000);
      } catch (error: any) {
        log.error('策略执行错误', error);
        await sleep(60000); // 错误后等待 1 分钟
      }
    }
  }

  /**
   * 开仓逻辑（优化版 - 市价单 + 成交监控）
   *
   * 优化要点：
   * 1. 使用市价单，无价格磨损
   * 2. 实时监控两边成交状态，防止单边暴露
   * 3. 单边成交立即对冲，确保风险可控
   */
  async openPositions(): Promise<void> {
    const maxRetries = this.config.strategy.maxRetries;
    let attempt = 0;

    while (attempt < maxRetries) {
      try {
        attempt++;
        log.info(`开仓尝试 ${attempt}/${maxRetries}`);

        // 1. 随机决定方向
        const paradexSide: 'buy' | 'sell' = Math.random() > 0.5 ? 'buy' : 'sell';
        const lighterSide = paradexSide === 'buy'; // 反向: buy -> ask(卖)

        log.info(
          `开仓方向: Paradex ${paradexSide.toUpperCase()}, Lighter ${
            lighterSide ? 'SELL' : 'BUY'
          }`
        );

        // 2. 记录开仓前的持仓（用于后续验证成交）
        const positionsBefore = await this.getCurrentPositions();
        log.info(
          `开仓前: Paradex=${positionsBefore.paradexPosition.toFixed(4)}, ` +
            `Lighter=${positionsBefore.lighterPosition.toFixed(4)}`
        );

        // 3. ✅ 同时提交两边市价单（快速成交，减少单边暴露时间）
        const size = this.config.strategy.orderSize;
        log.info(`提交市价单: 两边同时 ${size} 单位`);

        const [paradexResult, lighterResult] = await Promise.allSettled([
          this.paradex.createMarketOrder(paradexSide, size),
          this.lighter.createMarketOrder(lighterSide, size.toString(), false), // 开仓 reduceOnly=false
        ]);

        // 4. 检查订单提交是否成功
        if (paradexResult.status === 'rejected') {
          throw new Error(
            `Paradex 订单提交失败: ${
              (paradexResult.reason as any).message || paradexResult.reason
            }`
          );
        }
        if (lighterResult.status === 'rejected') {
          throw new Error(
            `Lighter 订单提交失败: ${
              (lighterResult.reason as any).message || lighterResult.reason
            }`
          );
        }

        log.info('✅ 两边订单提交成功，等待成交确认...');

        // 5. ⚠️ 关键：监控成交状态（轮询检查持仓，最多 5 秒）
        const filled = await this.waitForOrdersFilled(
          positionsBefore,
          size,
          this.config.strategy.fillTimeoutMs
        );

        if (!filled.bothFilled) {
          // 🚨 单边成交风险处理
          await this.handlePartialFill(filled, paradexSide, lighterSide, size);
        }

        // 6. 最终验证对冲成功并记录开仓价格
        const positionsAfter = await this.getCurrentPositions();
        const netPosition = positionsAfter.netPosition;

        log.info(
          `开仓后: Paradex=${positionsAfter.paradexPosition.toFixed(4)}, ` +
            `Lighter=${positionsAfter.lighterPosition.toFixed(4)}, ` +
            `净=${netPosition.toFixed(4)}`
        );

        // 7. 如果净持仓异常，立即修正
        if (Math.abs(netPosition) > 0.01) {
          log.warn(`⚠️ 净持仓异常: ${netPosition.toFixed(4)}，触发修正`);
          await this.correctNetPosition(netPosition);
        }

        log.info('✅ 开仓成功');
        return; // 成功退出
      } catch (error: any) {
        log.error(`开仓失败 (尝试 ${attempt}/${maxRetries})`, error);

        if (attempt >= maxRetries) {
          log.critical('开仓重试次数用尽，执行紧急平仓');
          await this.emergencyClose();
          throw error;
        }

        // 重试前等待
        await sleep(1000);
      }
    }
  }

  /**
   * 等待订单成交（轮询检查持仓变化）
   */
  private async waitForOrdersFilled(
    positionsBefore: PositionInfo,
    expectedSize: number,
    timeoutMs: number
  ): Promise<FillStatus> {
    const startTime = Date.now();
    const checkInterval = this.config.strategy.fillCheckIntervalMs;

    while (Date.now() - startTime < timeoutMs) {
      await sleep(checkInterval);

      const positionsNow = await this.getCurrentPositions();

      // 计算持仓变化
      const paradexChange = Math.abs(
        positionsNow.paradexPosition - positionsBefore.paradexPosition
      );
      const lighterChange = Math.abs(
        positionsNow.lighterPosition - positionsBefore.lighterPosition
      );

      const paradexFilled = paradexChange >= expectedSize * 0.95; // 允许 5% 误差
      const lighterFilled = lighterChange >= expectedSize * 0.95;

      log.debug(
        `成交检查: Paradex ${paradexFilled ? '✅' : '⏳'} (${paradexChange.toFixed(
          4
        )}/${expectedSize}), ` +
          `Lighter ${lighterFilled ? '✅' : '⏳'} (${lighterChange.toFixed(
            4
          )}/${expectedSize})`
      );

      if (paradexFilled && lighterFilled) {
        log.info('✅ 两边订单都已成交');
        return { bothFilled: true, paradexFilled: true, lighterFilled: true };
      }
    }

    // 超时后检查最终状态
    const positionsFinal = await this.getCurrentPositions();
    const paradexChange = Math.abs(
      positionsFinal.paradexPosition - positionsBefore.paradexPosition
    );
    const lighterChange = Math.abs(
      positionsFinal.lighterPosition - positionsBefore.lighterPosition
    );

    const paradexFilled = paradexChange >= expectedSize * 0.95;
    const lighterFilled = lighterChange >= expectedSize * 0.95;

    log.warn(
      `⏱️ 成交确认超时: Paradex ${paradexFilled ? '✅' : '❌'}, Lighter ${
        lighterFilled ? '✅' : '❌'
      }`
    );

    return {
      bothFilled: paradexFilled && lighterFilled,
      paradexFilled,
      lighterFilled,
    };
  }

  /**
   * 处理单边成交情况（立即对冲）
   *
   * 这是防止单边暴露的关键函数
   */
  private async handlePartialFill(
    filled: FillStatus,
    paradexSide: 'buy' | 'sell',
    lighterSide: boolean,
    size: number
  ): Promise<void> {
    log.critical('🚨 检测到单边成交，立即执行对冲！');

    // 发送 Telegram 告警
    await alertPartialFill(filled.paradexFilled, filled.lighterFilled);

    if (filled.paradexFilled && !filled.lighterFilled) {
      // Paradex 成交了，Lighter 没成交 → 在 Lighter 市价对冲
      log.warn('Paradex 已成交，Lighter 未成交 → 在 Lighter 市价对冲');
      // 对冲订单不需要 reduceOnly（因为是开新仓以对冲）
      await this.lighter.createMarketOrder(lighterSide, size.toString(), false);
      await sleep(1000); // 等待对冲成交
    } else if (!filled.paradexFilled && filled.lighterFilled) {
      // Lighter 成交了，Paradex 没成交 → 在 Paradex 市价对冲
      log.warn('Lighter 已成交，Paradex 未成交 → 在 Paradex 市价对冲');
      await this.paradex.createMarketOrder(paradexSide, size);
      await sleep(1000); // 等待对冲成交
    } else if (!filled.paradexFilled && !filled.lighterFilled) {
      // 都没成交 → 重试
      log.warn('两边都未成交，将重试');
      throw new Error('订单未成交');
    }
  }

  /**
   * 修正净持仓（通过市价单对冲差额）
   */
  private async correctNetPosition(netPosition: number): Promise<void> {
    const absNet = Math.abs(netPosition);

    if (netPosition > 0.01) {
      // 净多仓 → 需要卖出差额
      log.info(
        `净多仓 ${netPosition.toFixed(4)}，在 Paradex 市价卖出 ${absNet.toFixed(4)}`
      );
      await this.paradex.createMarketOrder('sell', absNet);
    } else if (netPosition < -0.01) {
      // 净空仓 → 需要买入差额
      log.info(
        `净空仓 ${netPosition.toFixed(4)}，在 Paradex 市价买入 ${absNet.toFixed(4)}`
      );
      await this.paradex.createMarketOrder('buy', absNet);
    }

    await sleep(1000);

    // 验证修正结果
    const positionsAfter = await this.getCurrentPositions();
    log.info(`修正后净持仓: ${positionsAfter.netPosition.toFixed(4)}`);
  }

  /**
   * 平仓逻辑（优化版 - 市价单 + 成交验证）
   */
  async closePositions(roundCount: number = 0): Promise<void> {
    const maxRetries = this.config.strategy.maxRetries;
    let attempt = 0;

    while (attempt < maxRetries) {
      try {
        attempt++;

        const positions = await this.getCurrentPositions();

        log.info(
          `平仓 (尝试 ${attempt}): Paradex=${positions.paradexPosition.toFixed(4)}, ` +
            `Lighter=${positions.lighterPosition.toFixed(4)}`
        );

        // 如果没有持仓，直接返回
        if (
          Math.abs(positions.paradexPosition) < 0.001 &&
          Math.abs(positions.lighterPosition) < 0.001
        ) {
          log.info('无持仓，跳过平仓');
          return;
        }

        const tasks: Promise<any>[] = [];

        // 同时提交两边市价平仓单
        if (Math.abs(positions.paradexPosition) >= 0.001) {
          const side: 'buy' | 'sell' = positions.paradexPosition > 0 ? 'sell' : 'buy';
          const size = Math.abs(positions.paradexPosition);
          log.info(`Paradex 平仓: ${side} ${size.toFixed(4)}`);
          tasks.push(this.paradex.createMarketOrder(side, size));
        }

        if (Math.abs(positions.lighterPosition) >= 0.001) {
          const isAsk = positions.lighterPosition > 0;
          const size = Math.abs(positions.lighterPosition);
          log.info(`Lighter 平仓: ${isAsk ? 'sell' : 'buy'} ${size.toFixed(4)}`);
          // ⚠️ 平仓时必须设置 reduceOnly = true
          tasks.push(this.lighter.createMarketOrder(isAsk, size.toString(), true));
        }

        if (tasks.length > 0) {
          await Promise.allSettled(tasks);
        }

        // 等待平仓成交
        await sleep(2000);

        // 验证平仓成功
        const positionsAfter = await this.getCurrentPositions();

        if (
          Math.abs(positionsAfter.paradexPosition) < 0.001 &&
          Math.abs(positionsAfter.lighterPosition) < 0.001
        ) {
          log.info('✅ 平仓成功');

          // ⚠️ 计算并打印本轮盈亏
          await this.calculateAndPrintPnL(roundCount);

          return;
        }

        log.warn(
          `平仓后仍有残留: Paradex=${positionsAfter.paradexPosition.toFixed(4)}, ` +
            `Lighter=${positionsAfter.lighterPosition.toFixed(4)}`
        );

        if (attempt >= maxRetries) {
          log.error('平仓重试次数用尽，残留持仓将在下次循环处理');
          return;
        }
      } catch (error: any) {
        log.error(`平仓失败 (尝试 ${attempt})`, error);

        if (attempt >= maxRetries) {
          throw error;
        }

        await sleep(1000);
      }
    }
  }

  /**
   * 检查并重新平衡持仓
   */
  async checkAndRebalance(): Promise<void> {
    const positions = await this.getCurrentPositions();
    const netPosition = positions.netPosition;

    if (Math.abs(netPosition) > this.config.risk.maxNetPosition) {
      log.warn(`净持仓超限: ${netPosition.toFixed(4)} ${this.config.symbol}`);

      // 发送 Telegram 告警
      await alertNetPosition(netPosition, this.config.risk.maxNetPosition);

      // 触发紧急平仓
      await this.emergencyClose();
    }
  }

  /**
   * 获取当前持仓
   */
  private async getCurrentPositions(): Promise<PositionInfo> {
    const [paradexPosition, lighterPosition] = await Promise.all([
      this.paradex.getPosition(),
      this.lighter.getPosition(),
    ]);

    const netPosition = paradexPosition + lighterPosition;

    return {
      paradexPosition,
      lighterPosition,
      netPosition,
    };
  }

  /**
   * 紧急平仓
   */
  private async emergencyClose(): Promise<void> {
    log.critical('触发紧急平仓');

    const positions = await this.getCurrentPositions();
    await alertEmergencyShutdown('风控触发', positions.netPosition);

    await this.closePositions();
  }

  /**
   * 计算并打印本轮盈亏
   *
   * 简化版：直接调用各 client 的 getLastRoundPnL() 方法
   */
  private async calculateAndPrintPnL(roundNumber: number): Promise<void> {
    try {
      // 等待API数据更新
      await sleep(1000);

      // ✅ 直接调用 client 的方法获取盈亏
      const paradexPnL = await this.paradex.getLastRoundPnL();
      const lighterPnL = await this.lighter.getLastRoundPnL();

      // 打印盈亏
      this.pnlTracker.printRoundPnL(roundNumber, paradexPnL, lighterPnL);

      // 发送到Telegram
    } catch (error: any) {
      log.error('计算盈亏失败', error);
      this.pnlTracker.printRoundPnL(roundNumber, 0, 0);
    }
  }

  /**
   * 获取 PnL Tracker
   */
  getPnLTracker(): PnLTracker {
    return this.pnlTracker;
  }

  /**
   * 停止策略
   */
  stop(): void {
    this.isRunning = false;
    log.info('策略停止');

    // 打印最终盈亏总结
    this.pnlTracker.printFinalSummary();
  }
}
