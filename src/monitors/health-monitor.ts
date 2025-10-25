/**
 * 系统健康检查模块
 * 
 * 功能：
 * - 检查 API 连接状态
 * - 监控系统资源
 * - 生成健康报告
 */

import { ParadexClient } from '../connectors/paradex-client.js';
import { LighterClient } from '../connectors/lighter-client.js';
import log from '../utils/logger.js';
import { sleep } from '../utils/math-helper.js';

export class HealthMonitor {
  private paradex: ParadexClient;
  private lighter: LighterClient;
  private isRunning: boolean = false;

  constructor(paradexClient: ParadexClient, lighterClient: LighterClient) {
    this.paradex = paradexClient;
    this.lighter = lighterClient;
  }

  /**
   * 启动健康检查
   */
  async start(): Promise<void> {
    this.isRunning = true;
    log.info('系统健康检查启动');

    while (this.isRunning) {
      try {
        await this.performHealthCheck();
        await sleep(60000); // 每分钟检查一次
      } catch (error: any) {
        log.error('健康检查错误', error);
        await sleep(60000);
      }
    }
  }

  /**
   * 执行健康检查
   */
  private async performHealthCheck(): Promise<void> {
    const checks = {
      paradex: false,
      lighter: false,
      timestamp: new Date().toISOString(),
    };

    // 检查 Paradex 连接
    try {
      await this.paradex.getPosition();
      checks.paradex = true;
    } catch (error: any) {
      log.error('Paradex 健康检查失败', error);
    }

    // 检查 Lighter 连接
    try {
      await this.lighter.getPosition();
      checks.lighter = true;
    } catch (error: any) {
      log.error('Lighter 健康检查失败', error);
    }

    // 记录健康状态
    if (checks.paradex && checks.lighter) {
      log.debug('系统健康检查: 所有服务正常');
    } else {
      log.warn(
        `系统健康检查: Paradex=${checks.paradex ? '✅' : '❌'}, Lighter=${
          checks.lighter ? '✅' : '❌'
        }`
      );
    }
  }

  /**
   * 停止健康检查
   */
  stop(): void {
    this.isRunning = false;
    log.info('系统健康检查停止');
  }
}

