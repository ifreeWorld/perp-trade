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
export async function alertNetPosition(netPosition: number, threshold: number): Promise<void> {
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
export async function alertOrderFailure(
  exchange: string,
  error: string
): Promise<void> {
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
  let message =
    `🚨 紧急停机\n` +
    `原因: ${reason}\n`;
  
  if (netPosition !== undefined) {
    message += `净持仓: ${netPosition.toFixed(4)} ETH\n`;
  }
  
  message += `时间: ${new Date().toLocaleString('zh-CN')}`;
  
  await sendTelegramAlert(message);
}

export default {
  sendTelegramAlert,
  alertNetPosition,
  alertPartialFill,
  alertOrderFailure,
  alertEmergencyShutdown,
};

