/**
 * 数学计算工具模块
 */

/**
 * 生成随机整数 [min, max]
 */
export function randomInt(min: number, max: number): number {
  return Math.floor(Math.random() * (max - min + 1)) + min;
}

/**
 * 休眠函数
 */
export function sleep(ms: number): Promise<void> {
  return new Promise((resolve) => setTimeout(resolve, ms));
}

/**
 * 格式化数字为固定小数位
 */
export function toFixed(num: number, decimals: number = 4): string {
  return num.toFixed(decimals);
}

/**
 * 安全的浮点数相加
 */
export function safeAdd(a: number, b: number): number {
  return Number((a + b).toFixed(10));
}

/**
 * 安全的浮点数相减
 */
export function safeSubtract(a: number, b: number): number {
  return Number((a - b).toFixed(10));
}

/**
 * 计算百分比
 */
export function percentage(value: number, total: number): number {
  if (total === 0) return 0;
  return (value / total) * 100;
}

/**
 * 检查数值是否在容忍范围内
 */
export function isWithinTolerance(
  value: number,
  target: number,
  tolerance: number
): boolean {
  return Math.abs(value - target) <= tolerance;
}

