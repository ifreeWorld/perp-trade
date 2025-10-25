/**
 * Telegram 告警工具模块
 */

import axios from 'axios';
import log from './logger.js';

const BOT_TOKEN = process.env.TELEGRAM_BOT_TOKEN;
const CHAT_ID = process.env.TELEGRAM_CHAT_ID;

/**
 * 发送 Telegram 告警消息
 */
export async function sendTelegramAlert(message: string): Promise<void> {
  if (!BOT_TOKEN || !CHAT_ID) {
    log.warn('⚠️ Telegram 未配置，跳过告警');
    return;
  }

  try {
    const url = `https://api.telegram.org/bot${BOT_TOKEN}/sendMessage`;
    await axios.post(url, {
      chat_id: CHAT_ID,
      text: `🚨 *对冲交易告警*\n\n${message}`,
      parse_mode: 'Markdown',
    });
    log.info('✅ Telegram 告警已发送');
  } catch (error: any) {
    log.error('❌ Telegram 告警发送失败', error);
  }
}

/**
 * 发送净持仓告警
 */
export async function alertNetPosition(
  netPosition: number,
  threshold: number
): Promise<void> {
  const message =
    `⚠️ 净持仓超限\n` +
    `当前: ${netPosition.toFixed(4)} ETH\n` +
    `阈值: ${threshold} ETH\n` +
    `时间: ${new Date().toLocaleString('zh-CN')}`;

  await sendTelegramAlert(message);
}

/**
 * 发送单边成交告警
 */
export async function alertPartialFill(
  paradexFilled: boolean,
  lighterFilled: boolean
): Promise<void> {
  const message =
    `🚨 单边成交检测\n` +
    `Paradex: ${paradexFilled ? '✅ 已成交' : '❌ 未成交'}\n` +
    `Lighter: ${lighterFilled ? '✅ 已成交' : '❌ 未成交'}\n` +
    `已触发自动对冲\n` +
    `时间: ${new Date().toLocaleString('zh-CN')}`;

  await sendTelegramAlert(message);
}

/**
 * 发送订单失败告警
 */
export async function alertOrderFailure(exchange: string, error: string): Promise<void> {
  const message =
    `❌ 订单失败\n` +
    `交易所: ${exchange}\n` +
    `错误: ${error}\n` +
    `时间: ${new Date().toLocaleString('zh-CN')}`;

  await sendTelegramAlert(message);
}

/**
 * 发送紧急停机告警
 */
export async function alertEmergencyShutdown(
  reason: string,
  netPosition?: number
): Promise<void> {
  let message = `🚨 紧急停机\n` + `原因: ${reason}\n`;

  if (netPosition !== undefined) {
    message += `净持仓: ${netPosition.toFixed(4)} ETH\n`;
  }

  message += `时间: ${new Date().toLocaleString('zh-CN')}`;

  await sendTelegramAlert(message);
}

/**
 * 发送每轮盈亏通知
 */
export async function alertRoundPnL(
  roundNumber: number,
  paradexPnL: number,
  lighterPnL: number,
  totalPnL: number
): Promise<void> {
  const message =
    `💰 第 ${roundNumber} 轮交易完成\n\n` +
    `Paradex: ${paradexPnL >= 0 ? '+' : ''}$${paradexPnL.toFixed(4)}\n` +
    `Lighter: ${lighterPnL >= 0 ? '+' : ''}$${lighterPnL.toFixed(4)}\n` +
    `总计: ${totalPnL >= 0 ? '+' : ''}$${totalPnL.toFixed(4)}\n\n` +
    `时间: ${new Date().toLocaleString('zh-CN')}`;

  await sendTelegramAlert(message);
}

/**
 * 发送累计盈亏报告
 */
export async function alertCumulativePnL(
  totalRounds: number,
  paradexTotal: number,
  lighterTotal: number,
  totalPnL: number,
  runningTimeMin: number
): Promise<void> {
  const avgPnL = totalRounds > 0 ? totalPnL / totalRounds : 0;
  const hourlyPnL = runningTimeMin > 0 ? (totalPnL / runningTimeMin) * 60 : 0;

  const message =
    `📊 累计盈亏报告\n\n` +
    `运行时间: ${runningTimeMin} 分钟\n` +
    `完成轮数: ${totalRounds}\n\n` +
    `Paradex 累计: ${paradexTotal >= 0 ? '+' : ''}$${paradexTotal.toFixed(4)}\n` +
    `Lighter 累计: ${lighterTotal >= 0 ? '+' : ''}$${lighterTotal.toFixed(4)}\n` +
    `总计: ${totalPnL >= 0 ? '+' : ''}$${totalPnL.toFixed(4)}\n\n` +
    `平均每轮: ${avgPnL >= 0 ? '+' : ''}$${avgPnL.toFixed(4)}\n` +
    `预估时薪: ${hourlyPnL >= 0 ? '+' : ''}$${hourlyPnL.toFixed(2)}\n\n` +
    `时间: ${new Date().toLocaleString('zh-CN')}`;

  await sendTelegramAlert(message);
}

/**
 * 发送系统启动通知
 */
export async function alertSystemStart(symbol: string, orderSize: number): Promise<void> {
  const message =
    `🚀 对冲交易系统启动\n\n` +
    `币种: ${symbol}\n` +
    `订单大小: ${orderSize}\n` +
    `时间: ${new Date().toLocaleString('zh-CN')}`;

  await sendTelegramAlert(message);
}

/**
 * 发送系统停止通知
 */
export async function alertSystemStop(
  totalRounds: number,
  totalPnL: number,
  runningTimeMin: number
): Promise<void> {
  const message =
    `🛑 对冲交易系统停止\n\n` +
    `运行时间: ${runningTimeMin} 分钟\n` +
    `完成轮数: ${totalRounds}\n` +
    `总盈亏: ${totalPnL >= 0 ? '+' : ''}$${totalPnL.toFixed(4)}\n\n` +
    `时间: ${new Date().toLocaleString('zh-CN')}`;

  await sendTelegramAlert(message);
}

export default {
  sendTelegramAlert,
  alertNetPosition,
  alertPartialFill,
  alertOrderFailure,
  alertEmergencyShutdown,
  alertRoundPnL,
  alertCumulativePnL,
  alertSystemStart,
  alertSystemStop,
};
