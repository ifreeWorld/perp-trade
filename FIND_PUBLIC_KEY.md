# 📖 如何找到 Starknet 公钥

## 🎯 你的信息

从图片中看到：

- **Ethereum 地址**：`0xbAF46C9b706eff6fb9C7dFDc26cB6CB0B3270Bc7`
- **Paradex (Starknet) 地址**：`0x4de5...f439`（完整应该是 64 位）

## 🔍 方法 1：从 Paradex 网站导出（最简单）

### 步骤：

1. **在 Paradex 网站上**
   - 点击右上角头像
   - 进入 **Settings** / **设置**
   - 查找 **Private Key** 或**私钥**选项

2. **点击"复制 Paradex 私钥"**
   - 这会显示你的 Starknet 私钥
   - **重要**：这不是公钥，但我们需要这个私钥来配置

3. **配置文件**

   ```bash
   # 在 .env.testnet 中配置
   PARADEX_TESTNET_ACCOUNT_ADDRESS=0x4de5b7feaa93a7c05566efe617cd2428ae9b2f7270c508cf6d53a5be0c4f439
   PARADEX_TESTNET_PRIVATE_KEY=你导出的Starknet私钥
   PARADEX_TESTNET_L1_ADDRESS=0xbAF46C9b706eff6fb9C7dFDc26cB6CB0B3270Bc7
   ```

4. **公钥可以从私钥计算**

   运行以下命令自动计算：

   ```bash
   node -e "
   const { ec } = require('starknet');
   const privateKey = '你的Starknet私钥';
   const publicKey = ec.starkCurve.getStarkKey(privateKey);
   console.log('Starknet 公钥:', publicKey);
   "
   ```

## 🔍 方法 2：从区块链浏览器查询

1. **访问 Starknet Voyager（Sepolia 测试网）**

   ```
   https://sepolia.voyager.online/
   ```

2. **搜索你的 Starknet 地址**

   ```
   0x4de5b7feaa93a7c05566efe617cd2428ae9b2f7270c508cf6d53a5be0c4f439
   ```

3. **查看合约详情**
   - 找到 **Read Contract** 标签
   - 找到 `get_signer` 或 `getSigner` 函数
   - 点击 **Query**
   - 返回的值就是公钥

## 🔍 方法 3：使用代码计算

如果你有 Starknet 私钥，可以计算出公钥：

```bash
# 安装后运行
pnpm install

# 创建临时脚本
cat << 'SCRIPT' > calc-pubkey.js
import { ec } from 'starknet';

const privateKey = process.argv[2];

if (!privateKey) {
  console.log('用法: node calc-pubkey.js 0x你的Starknet私钥');
  process.exit(1);
}

try {
  const publicKey = ec.starkCurve.getStarkKey(privateKey);
  console.log('Starknet 公钥:', publicKey);
} catch (error) {
  console.error('计算失败:', error.message);
}
SCRIPT

# 运行
node calc-pubkey.js 0x你的Starknet私钥
```

## 📋 完整配置示例

根据你的图片，配置应该是：

```bash
# ==================== Paradex 测试网配置 ====================
# Starknet 账户地址（从图片看到的）
PARADEX_TESTNET_ACCOUNT_ADDRESS=0x4de5b7feaa93a7c05566efe617cd2428ae9b2f7270c508cf6d53a5be0c4f439

# Starknet 公钥（需要查询或计算）
PARADEX_TESTNET_PUBLIC_KEY=0x...

# Starknet 私钥（从 Paradex 网站导出）
PARADEX_TESTNET_PRIVATE_KEY=0x...

# 以太坊地址（从图片看到的）
PARADEX_TESTNET_L1_ADDRESS=0xbAF46C9b706eff6fb9C7dFDc26cB6CB0B3270Bc7
```

## 🚀 快速方案（推荐）

实际上，**公钥可以从私钥自动计算**！

让我更新代码，让它自动计算公钥，你只需要提供：

1. Starknet 地址
2. Starknet 私钥
3. 以太坊地址

就可以了，公钥会自动生成！
