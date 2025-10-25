/**
 * 生成 Paradex JWT Token
 * 使用以太坊私钥生成有交易权限的 JWT
 */

import { ethers } from 'ethers';
import axios from 'axios';
import { config } from '../src/config/index.js';

async function generateJWT() {
  try {
    console.log('='.repeat(60));
    console.log('生成 Paradex JWT Token');
    console.log('='.repeat(60));

    const privateKey = config.paradex.privateKey;

    if (privateKey.startsWith('eyJ')) {
      console.log('⚠️ 当前配置的已经是 JWT Token，无需重新生成');
      console.log('如果需要重新生成，请配置以太坊私钥（0x开头）');
      process.exit(0);
      return;
    }

    // 创建钱包
    const wallet = new ethers.Wallet(privateKey);
    const address = wallet.address;

    console.log(`\n以太坊地址: ${address}`);
    console.log('正在生成 JWT Token...\n');

    // 获取 Starknet 公钥（从以太坊私钥派生）
    // 这里需要使用 Paradex SDK 来正确派生 Starknet 密钥
    // 简化版本：直接调用 Paradex API

    const apiUrl = config.paradex.apiUrl;

    // 方法 1：尝试用地址获取 JWT
    try {
      const response = await axios.post(`${apiUrl}/auth/jwt`, {
        address: address,
        chain_id:
          config.network === 'testnet' ? 'SN_SEPOLIA' : 'PRIVATE_SN_PARACLEAR_MAINNET',
      });

      console.log('✅ JWT Token 生成成功！');
      console.log('\n请将以下 Token 复制到 .env.testnet:');
      console.log('='.repeat(60));
      console.log(
        response.data.jwt_token || response.data.token || JSON.stringify(response.data)
      );
      console.log('='.repeat(60));
    } catch (error: any) {
      console.error('❌ 生成 JWT 失败:', error.response?.data || error.message);
      console.log('\n建议：');
      console.log('1. 访问 Paradex 网站: https://testnet.paradex.trade/');
      console.log('2. 用 MetaMask 连接（使用相同的私钥）');
      console.log('3. 在设置中生成 API Key（勾选 Trade 权限）');
      console.log('4. 使用生成的 API Key 或 JWT Token');
    }

    console.log('='.repeat(60));
  } catch (error: any) {
    console.error('错误:', error.message);
    process.exit(1);
  }
}

generateJWT();
