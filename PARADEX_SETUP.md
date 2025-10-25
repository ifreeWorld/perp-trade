# Paradex 配置指南

## 🔑 需要的配置

Paradex 使用 **Starknet 账户系统**，需要以下 4 个参数：

### 必需的环境变量

```bash
# ==================== Paradex 测试网 Starknet 账户 ====================
PARADEX_TESTNET_ACCOUNT_ADDRESS=0x...    # Starknet 账户地址
PARADEX_TESTNET_PUBLIC_KEY=0x...         # Starknet 公钥
PARADEX_TESTNET_PRIVATE_KEY=0x...        # Starknet 私钥
PARADEX_TESTNET_L1_ADDRESS=0x...         # 以太坊地址（L1 地址）
```

## 📝 如何获取这些参数

### 方法 1：从 Paradex 网站获取（推荐）

1. **访问 Paradex 测试网**

   ```
   https://testnet.paradex.trade/
   ```

2. **连接钱包并注册**
   - 用 MetaMask 连接
   - 完成 Paradex 账户注册
   - 系统会自动为你生成 Starknet 账户

3. **获取 Starknet 账户信息**

   **方法 A：从页面查看**
   - 登录后，点击右上角头像
   - 进入 **Account Settings** 或 **Profile**
   - 查找 Starknet Account Address

   **方法 B：从浏览器开发者工具**
   - 按 F12 打开开发者工具
   - 进入 **Application** → **Local Storage**
   - 查找相关的账户信息

   **方法 C：从区块链浏览器**
   - 访问 https://voyager.testnet.paradex.trade/
   - 搜索你的以太坊地址
   - 查看关联的 Starknet 合约地址
   - 在合约详情中找到 `getSigner` 函数获取公钥

4. **获取 Starknet 私钥**
   - 在 Paradex 网站的设置中
   - 查找 **Export Private Key** 或类似选项
   - **⚠️ 警告**：私钥非常重要，务必安全保管！

### 方法 2：使用 @paradex/sdk 派生（高级）

如果你只有以太坊私钥，可以使用 Paradex SDK 派生 Starknet 账户：

```typescript
import { Account, Config } from '@paradex/sdk';
import { ethers } from 'ethers';

const wallet = new ethers.Wallet('你的以太坊私钥');
const signer = Config.Signer.ethersSignerAdapter(wallet);

const config = await Config.fetchConfig('testnet');
const starkProvider = Config.ParaclearProvider.DefaultProvider(config);

const account = await Account.fromEthSigner({
  provider: starkProvider,
  config,
  signer,
});

console.log('Starknet Address:', account.address);
console.log('Starknet Private Key:', '需要从 account 对象中提取');
```

## 📋 示例配置

在 `.env.testnet` 中添加：

```bash
# ==================== Paradex 测试网配置 ====================
# 以下所有参数都是必需的！

# Starknet 账户地址（从 Paradex 网站获取）
PARADEX_TESTNET_ACCOUNT_ADDRESS=0x1234...5678

# Starknet 公钥（从区块链浏览器或 Paradex 获取）
PARADEX_TESTNET_PUBLIC_KEY=0xabcd...ef12

# Starknet 私钥（从 Paradex 导出，妥善保管！）
PARADEX_TESTNET_PRIVATE_KEY=0x9876...4321

# 以太坊地址（你的 MetaMask 地址）
PARADEX_TESTNET_L1_ADDRESS=0xbAF46C9b706eff6fb9C7dFDc26cB6CB0B3270Bc7
```

## ✅ 验证配置

配置完成后，运行：

```bash
NODE_ENV=testnet pnpm run verify:config
```

应该看到所有配置项都显示 ✅ 已配置。

## 🚀 测试连接

```bash
NODE_ENV=testnet pnpm run test:connection:paradex
```

**预期输出**：

```
✅ Paradex Onboarding 成功
✅ JWT Token 获取成功
✅ Paradex 市场验证成功: ETH-USD-PERP
当前持仓: X.XXXX ETH
```

## ⚠️ 常见问题

### 1. 找不到 Starknet 私钥

- 如果 Paradex 网站没有导出私钥的选项
- 你可能需要使用网站提供的 API Key 功能
- 或者通过开发者工具查找 localStorage

### 2. Onboarding 失败

- 确保你的以太坊地址已经在 Paradex 上注册
- 确保 Starknet 地址和以太坊地址匹配

### 3. 认证失败

- 检查所有 4 个参数是否正确
- 确保私钥格式正确（0x + 64位十六进制）
- 确保地址和私钥对应

## 📚 参考资料

- Paradex 官方文档：https://docs.paradex.trade/
- Demo 代码：`demo/src/utils/api.ts`
- Starknet 文档：https://www.starknet.io/

---

**重要提示**：Paradex 的认证系统基于 Starknet，比以太坊认证复杂。所有请求都需要用 Starknet 私钥签名。
