# Lighter API Key 问题排查

## 🚨 问题

所有签名都返回 `invalid signature`，即使：

- ✅ `initialize()` 成功
- ✅ `ensureWasmClient()` 成功
- ✅ 账户状态正常（Account 130, Balance: $499）
- ✅ 参数格式正确

## 🔍 原因分析

这种情况下，问题通常是：

1. **API Key 私钥不正确**
   - 复制时可能有遗漏
   - 或者是其他账户的私钥

2. **API Key Index 不对**
   - 配置的是 Index 2
   - 但实际可能是其他索引（0, 1, 3...）

3. **API Key 已过期或被撤销**
   - Lighter 的 API Key 可能有有效期
   - 或被手动撤销了

4. **API Key 没有交易权限**
   - 可能是只读 API Key
   - 需要有 Trade 权限

## ✅ 解决方案

### 步骤 1：登录 Lighter 网站

访问：https://testnet.zklighter.elliot.ai/

**重要**：需要用 Account 130 对应的地址连接：

```
0x5570C275A5a445394047219d79426a0b30B9ba8e
```

### 步骤 2：检查或重新生成 API Key

1. 进入 **Settings** → **API Keys**
2. 查看现有的 API Keys
3. **删除所有旧的 API Keys**
4. **创建新的 API Key**：
   - Name: `Trading Bot`
   - Permissions: 勾选 **Trade**（必须）
   - 点击 **Create**

### 步骤 3：记录新的配置

创建成功后，记录：

```
API Key Index: X （通常是 0, 1, 2...）
API Key Private Key: 0xabcd...（一个很长的十六进制字符串）
```

### 步骤 4：更新 `.env.testnet`

```bash
# Account Index 保持不变
LIGHTER_TESTNET_ACCOUNT_INDEX=130

# 更新为新的 API 私钥
LIGHTER_TESTNET_PRIVATE_KEY=新生成的API私钥

# 更新为新的 API Key Index
LIGHTER_TESTNET_API_KEY_INDEX=新的索引（通常是0）
```

### 步骤 5：重新测试

```bash
NODE_ENV=testnet pnpm run test:connection:lighter
```

应该看到：

```
✅ Lighter 初始化成功
✅ 持仓查询成功
```

然后测试订单创建：

```bash
NODE_ENV=testnet pnpm start
```

## 🎯 快速验证 API Key

如果你获取了新的 API Key，可以用这个脚本快速测试：

```bash
cat << 'SCRIPT' > test-new-api-key.js
import { SignerClient } from 'lighter-ts-sdk';

const signer = new SignerClient({
  url: 'https://testnet.zklighter.elliot.ai',
  privateKey: '你的新API私钥',
  accountIndex: 130,
  apiKeyIndex: 0,  // 通常新创建的是 0
});

await signer.initialize();
await signer.ensureWasmClient();

const [tx, txHash, err] = await signer.createMarketOrder({
  marketIndex: 0,
  clientOrderIndex: Date.now(),
  baseAmount: 100,
  avgExecutionPrice: 4000,
  isAsk: true,
});

console.log(err ? `❌ ${err}` : `✅ 成功! TxHash: ${txHash}`);
SCRIPT

node test-new-api-key.js
```

## ⚠️ 注意

**每次重新生成 API Key，私钥都会改变**，必须更新配置！

---

**当前配置可能的问题**：

- API Key Private Key 可能是旧的或错误的
- API Key Index 2 可能不存在或已被删除
- 建议重新生成一个全新的 API Key
