/**
 * 从以太坊私钥派生 Starknet 账户
 * 使用 @paradex/sdk 自动生成所需的 Starknet 参数
 */

import { Account, Config, Signer, ParaclearProvider } from '@paradex/sdk';
import { ethers } from 'ethers';
import log from '../src/utils/logger.js';

async function deriveStarknetAccount() {
  try {
    console.log('='.repeat(60));
    console.log('从以太坊私钥派生 Starknet 账户');
    console.log('='.repeat(60));

    // 从环境变量获取以太坊私钥
    const ethPrivateKey =
      process.env.ETH_PRIVATE_KEY || process.env.PARADEX_TESTNET_PRIVATE_KEY;

    if (!ethPrivateKey) {
      console.error('\n❌ 缺少以太坊私钥');
      console.log('\n使用方法:');
      console.log('ETH_PRIVATE_KEY=0x你的私钥 NODE_ENV=testnet pnpm run derive:starknet');
      process.exit(1);
      return;
    }

    if (!ethPrivateKey.startsWith('0x') || ethPrivateKey.length !== 66) {
      console.error('\n❌ 以太坊私钥格式错误');
      console.log(`当前长度: ${ethPrivateKey.length}，应该是 66 个字符（0x + 64位）`);
      process.exit(1);
      return;
    }

    console.log('\n1. 创建以太坊钱包...');
    const wallet = new ethers.Wallet(ethPrivateKey);
    console.log(`   以太坊地址 (L1): ${wallet.address}`);

    console.log('\n2. 获取 Paradex 配置...');
    const environment = process.env.NODE_ENV === 'mainnet' ? 'prod' : 'testnet';
    const config = await Config.fetchConfig(environment);
    console.log(`   环境: ${environment}`);

    console.log('\n3. 创建 Signer...');
    const signer = Signer.ethersSignerAdapter(wallet);

    console.log('\n4. 创建 Starknet Provider...');
    const starkProvider = ParaclearProvider.DefaultProvider(config);

    console.log('\n5. 派生 Starknet 账户...');
    const account = await Account.fromEthSigner({
      provider: starkProvider,
      config,
      signer,
    });

    console.log('\n✅ Starknet 账户派生成功！');
    console.log('\n='.repeat(60));
    console.log('📋 请将以下配置添加到 .env.testnet:');
    console.log('='.repeat(60));
    console.log('');
    console.log(`PARADEX_TESTNET_ACCOUNT_ADDRESS=${account.address}`);
    console.log(`PARADEX_TESTNET_PUBLIC_KEY=请从 Starknet 浏览器查询`);
    console.log(`PARADEX_TESTNET_PRIVATE_KEY=请从 Paradex 网站导出`);
    console.log(`PARADEX_TESTNET_L1_ADDRESS=${wallet.address}`);
    console.log('');
    console.log('='.repeat(60));
    console.log('\n⚠️ 注意：');
    console.log('1. Starknet 公钥和私钥需要从 Paradex 网站或区块链浏览器获取');
    console.log('2. 公钥查询：https://voyager.testnet.paradex.trade/');
    console.log('   搜索上面的 ACCOUNT_ADDRESS，在合约中找到 getSigner');
    console.log('3. 私钥需要从 Paradex 账户设置中导出');
    console.log('');
  } catch (error: any) {
    console.error('\n❌ 派生失败:', error.message);
    console.error('\n详细错误:', error);
    process.exit(1);
  }
}

deriveStarknetAccount();
