/**
 * 环境变量加载模块
 * ⚠️ 必须在所有其他模块之前导入此文件
 */

import { config as dotenvConfig } from 'dotenv';
import path from 'path';

// 获取环境
const ENV = process.env.NODE_ENV || 'testnet';

// 加载对应的 .env 文件（使用绝对路径）
const envPath = path.resolve(process.cwd(), `.env.${ENV}`);
const result = dotenvConfig({ path: envPath });

// 调试信息
if (result.error) {
  console.error(`❌ 加载环境变量文件失败: ${envPath}`);
  console.error(result.error);
} else {
  console.log(`✅ 已加载环境变量: ${envPath}`);
}

export { ENV };
