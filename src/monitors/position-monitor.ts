/**
 * 持仓监控模块
 * 
 * 功能：
 * - 实时监控两边持仓
 * - 计算净持仓
 * - 检测持仓异常
 * - 生成监控报告
 */

import { ParadexClient } from '../connectors/paradex-client.js';
import { LighterClient } from '../connectors/lighter-client.js';
import { TradingConfig } from '../types/index.js';
import log from '../utils/logger.js';
import { sleep } from '../utils/math-helper.js';
import { sendTelegramAlert } from '../utils/telegram-alert.js';

export class PositionMonitor {
  private paradex: ParadexClient;
  private lighter: LighterClient;
  private config: TradingConfig;
  private isRunning: boolean = false;

  constructor(
    paradexClient: ParadexClient,
    lighterClient: LighterClient,
    config: TradingConfig
  ) {
    this.paradex = paradexClient;
    this.lighter = lighterClient;
    this.config = config;
  }

  /**
   * 启动监控循环
   */
  async start(): Promise<void> {
    this.isRunning = true;
    log.info('持仓监控启动');

    while (this.isRunning) {
      try {
        await this.checkPositions();
        await sleep(this.config.monitoring.intervalSeconds * 1000);
      } catch (error: any) {
        log.error('持仓监控错误', error);
        await sleep(60000); // 错误后等待1分钟
      }
    }
  }

  /**
   * 检查持仓
   */
  private async checkPositions(): Promise<void> {
    try {
      const [paradexPosition, lighterPosition] = await Promise.all([
        this.paradex.getPosition(),
        this.lighter.getPosition(),
      ]);

      const netPosition = paradexPosition + lighterPosition;

      log.info(
        `持仓监控 | Paradex: ${paradexPosition.toFixed(4)} | ` +
          `Lighter: ${lighterPosition.toFixed(4)} | ` +
          `净持仓: ${netPosition.toFixed(4)}`
      );

      // 检查净持仓是否异常
      if (Math.abs(netPosition) > this.config.risk.maxNetPosition) {
        const message =
          `⚠️ 净持仓超限警告\n` +
          `当前净持仓: ${netPosition.toFixed(4)} ${this.config.symbol}\n` +
          `阈值: ${this.config.risk.maxNetPosition}\n` +
          `Paradex: ${paradexPosition.toFixed(4)}\n` +
          `Lighter: ${lighterPosition.toFixed(4)}\n` +
          `时间: ${new Date().toLocaleString('zh-CN')}`;

        log.warn(message);
        await sendTelegramAlert(message);
      }

      // 检查持仓偏差
      const deviation = Math.abs(paradexPosition + lighterPosition);
      if (deviation > this.config.risk.maxPositionDeviation) {
        log.warn(
          `持仓偏差过大: ${deviation.toFixed(4)} (阈值: ${
            this.config.risk.maxPositionDeviation
          })`
        );
      }
    } catch (error: any) {
      log.error('检查持仓失败', error);
    }
  }

  /**
   * 停止监控
   */
  stop(): void {
    this.isRunning = false;
    log.info('持仓监控停止');
  }
}

