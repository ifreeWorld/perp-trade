/**
 * 盈亏追踪器
 *
 * 用于统计每轮对冲交易的盈亏和累计盈亏
 */

import log from './logger.js';

interface RoundPnL {
  roundNumber: number;
  paradexPnL: number;
  lighterPnL: number;
  totalPnL: number;
  timestamp: number;
}

export class PnLTracker {
  private rounds: RoundPnL[] = [];
  private startTime: number;
  private totalParadexPnL: number = 0;
  private totalLighterPnL: number = 0;

  constructor() {
    this.startTime = Date.now();
  }

  /**
   * 记录一轮交易的盈亏
   */
  recordRound(roundNumber: number, paradexPnL: number, lighterPnL: number): void {
    const totalPnL = paradexPnL + lighterPnL;

    this.rounds.push({
      roundNumber,
      paradexPnL,
      lighterPnL,
      totalPnL,
      timestamp: Date.now(),
    });

    this.totalParadexPnL += paradexPnL;
    this.totalLighterPnL += lighterPnL;
  }

  /**
   * 打印单次交易盈亏
   */
  async printRoundPnL(
    roundNumber: number,
    paradexPnL: number,
    lighterPnL: number
  ): Promise<void> {
    const totalPnL = paradexPnL + lighterPnL;

    log.info('\n' + '='.repeat(80));
    log.info(`💰 第 ${roundNumber} 轮交易盈亏`);
    log.info('='.repeat(80));
    log.info(`Paradex 盈亏: ${this.formatPnL(paradexPnL)}`);
    log.info(`Lighter 盈亏: ${this.formatPnL(lighterPnL)}`);
    log.info(`本轮总盈亏: ${this.formatPnL(totalPnL)}`);
    log.info('='.repeat(80));

    // 记录到历史
    this.recordRound(roundNumber, paradexPnL, lighterPnL);

    // 打印累计盈亏
    this.printCumulativePnL();

    // 发送 Telegram 通知
    const { alertRoundPnL } = await import('./telegram-alert.js');
    await alertRoundPnL(roundNumber, paradexPnL, lighterPnL, totalPnL);
  }

  /**
   * 打印累计盈亏
   */
  printCumulativePnL(): void {
    const totalPnL = this.totalParadexPnL + this.totalLighterPnL;
    const runningTimeMs = Date.now() - this.startTime;
    const runningTimeMin = Math.floor(runningTimeMs / 60000);
    const runningTimeSec = Math.floor((runningTimeMs % 60000) / 1000);

    log.info('\n' + '='.repeat(80));
    log.info('📊 累计盈亏统计');
    log.info('='.repeat(80));
    log.info(`运行时间: ${runningTimeMin} 分 ${runningTimeSec} 秒`);
    log.info(`完成轮数: ${this.rounds.length}`);
    log.info(`Paradex 累计盈亏: ${this.formatPnL(this.totalParadexPnL)}`);
    log.info(`Lighter 累计盈亏: ${this.formatPnL(this.totalLighterPnL)}`);
    log.info(`总累计盈亏: ${this.formatPnL(totalPnL)}`);

    if (this.rounds.length > 0) {
      const avgPnL = totalPnL / this.rounds.length;
      log.info(`平均每轮盈亏: ${this.formatPnL(avgPnL)}`);
    }

    log.info('='.repeat(80) + '\n');
  }

  /**
   * 打印最终总结
   */
  async printFinalSummary(): Promise<void> {
    const totalPnL = this.totalParadexPnL + this.totalLighterPnL;
    const runningTimeMs = Date.now() - this.startTime;
    const runningTimeHours = runningTimeMs / 3600000;

    log.info('\n' + '='.repeat(80));
    log.info('📋 最终盈亏总结');
    log.info('='.repeat(80));
    log.info(`程序运行时间: ${this.formatRunningTime(runningTimeMs)}`);
    log.info(`完成交易轮数: ${this.rounds.length}`);
    log.info('');
    log.info(`Paradex 总盈亏: ${this.formatPnL(this.totalParadexPnL)}`);
    log.info(`Lighter 总盈亏: ${this.formatPnL(this.totalLighterPnL)}`);
    log.info(`总盈亏: ${this.formatPnL(totalPnL)}`);
    log.info('');

    if (this.rounds.length > 0) {
      const avgPnL = totalPnL / this.rounds.length;
      log.info(`平均每轮盈亏: ${this.formatPnL(avgPnL)}`);
    }

    if (runningTimeHours > 0) {
      const hourlyPnL = totalPnL / runningTimeHours;
      log.info(`预估小时盈亏: ${this.formatPnL(hourlyPnL)}`);
    }

    // 打印每轮详情
    if (this.rounds.length > 0 && this.rounds.length <= 10) {
      log.info('\n每轮详情:');
      log.info('-'.repeat(80));
      this.rounds.forEach((round) => {
        log.info(
          `第 ${round.roundNumber} 轮: Paradex ${this.formatPnL(round.paradexPnL)}, ` +
            `Lighter ${this.formatPnL(round.lighterPnL)}, ` +
            `总计 ${this.formatPnL(round.totalPnL)}`
        );
      });
    }

    log.info('='.repeat(80) + '\n');

    // 发送 Telegram 停止通知
    const { alertSystemStop } = await import('./telegram-alert.js');
    const runningTimeMin = Math.floor(runningTimeMs / 60000);
    await alertSystemStop(this.rounds.length, totalPnL, runningTimeMin);
  }

  /**
   * 格式化盈亏显示
   */
  private formatPnL(pnl: number): string {
    const color = pnl >= 0 ? '+' : '';
    return `${color}$${pnl.toFixed(4)}`;
  }

  /**
   * 格式化运行时间
   */
  private formatRunningTime(ms: number): string {
    const hours = Math.floor(ms / 3600000);
    const minutes = Math.floor((ms % 3600000) / 60000);
    const seconds = Math.floor((ms % 60000) / 1000);

    if (hours > 0) {
      return `${hours} 小时 ${minutes} 分 ${seconds} 秒`;
    } else if (minutes > 0) {
      return `${minutes} 分 ${seconds} 秒`;
    } else {
      return `${seconds} 秒`;
    }
  }

  /**
   * 获取统计数据
   */
  getStats() {
    return {
      totalRounds: this.rounds.length,
      totalParadexPnL: this.totalParadexPnL,
      totalLighterPnL: this.totalLighterPnL,
      totalPnL: this.totalParadexPnL + this.totalLighterPnL,
      runningTimeMs: Date.now() - this.startTime,
    };
  }
}
