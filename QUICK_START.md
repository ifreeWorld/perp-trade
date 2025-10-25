# 快速开始指南

## ⚠️ 重要提示

在开始之前，请注意：

1. **SDK 兼容性**：`lighter-ts-sdk` 可能不存在或 API 与预期不同，需要根据实际情况调整代码
2. **Paradex SDK 版本**：当前使用 `@paradex/sdk@0.6.0`，请查阅官方文档确认 API
3. **测试优先**：强烈建议先在测试网充分测试，确保所有功能正常
4. **私钥安全**：切勿将私钥提交到 Git 或泄露给他人

## 📦 安装依赖

```bash
# 安装 pnpm（如果还没有）
npm install -g pnpm

# 克隆或进入项目目录
cd perp-trade

# 安装项目依赖
pnpm install
```

**注意**：如果安装过程中遇到 SDK 相关的错误，可能需要：

1. 检查 `@paradex/sdk` 的最新版本和 API 文档
2. 确认 `lighter-ts-sdk` 是否存在，或使用 Lighter 的 HTTP API
3. 根据实际 SDK 调整 `src/connectors/` 中的客户端代码

## ⚙️ 配置环境变量

### 测试网环境

1. 创建测试网环境变量文件：

```bash
# 直接创建 .env.testnet 文件
touch .env.testnet
```

2. 编辑 `.env.testnet` 文件，填写以下配置：

```bash
# ==================== 环境配置 ====================
NODE_ENV=testnet

# ==================== 币种配置 ====================
SYMBOL=ETH                                    # 交易币种（ETH、BTC 等）
ORDER_SIZE=0.01                               # 订单大小（测试网建议小额）
ORDER_TYPE=market                             # 订单类型（market 推荐）

# ==================== 风控参数 ====================
MAX_NET_POSITION=0.1                          # 最大净持仓容忍度

# ==================== Paradex 测试网 ====================
PARADEX_TESTNET_API_KEY=                      # 可选，某些 SDK 版本可能需要
PARADEX_TESTNET_PRIVATE_KEY=0x...             # 必填：以太坊钱包私钥

# ==================== Lighter 测试网 ====================
LIGHTER_TESTNET_PRIVATE_KEY=0x...             # 必填：Lighter API 私钥
LIGHTER_TESTNET_ACCOUNT_INDEX=123             # 必填：账户索引
LIGHTER_TESTNET_API_KEY_INDEX=1               # 必填：API 密钥索引

# ==================== Telegram 告警（可选但推荐）====================
TELEGRAM_BOT_TOKEN=                           # Telegram Bot Token
TELEGRAM_CHAT_ID=                             # Telegram Chat ID
```

### 获取必要的密钥

#### Paradex 私钥

- 使用你的以太坊钱包私钥（MetaMask、Ledger 等）
- **警告**：这是真实的私钥，请妥善保管

#### Lighter 配置

- 访问 Lighter 官网注册账户
- 获取 API 密钥、账户索引等信息
- 查看 Lighter 官方文档了解具体配置方式

## ✅ 验证和测试

### 第一步：验证配置

```bash
NODE_ENV=testnet pnpm run verify:config
```

这将检查：

- 环境变量是否正确加载
- 必填配置项是否都已填写
- 配置格式是否正确

**预期输出**：显示所有配置项，标记哪些已配置 ✅ 哪些未配置 ❌

### 第二步：测试交易所连接

⚠️ **注意**：由于 SDK 可能不完全兼容，这些测试可能失败。如果失败：

1. **检查错误信息**：仔细阅读错误提示
2. **查阅 SDK 文档**：确认当前版本的正确 API 用法
3. **调整代码**：根据实际 SDK API 修改 `src/connectors/` 中的客户端代码

```bash
# 测试 Paradex 连接（可能需要调整代码）
NODE_ENV=testnet pnpm run test:connection:paradex

# 测试 Lighter 连接（SDK 可能不存在，需要使用 HTTP API）
NODE_ENV=testnet pnpm run test:connection:lighter
```

**如果测试失败，建议**：

1. 直接查看 `src/connectors/paradex-client.ts` 和 `lighter-client.ts`
2. 根据官方 SDK 文档调整代码
3. 或者改用 HTTP API 直接调用

### 第三步：监控当前持仓

```bash
NODE_ENV=testnet pnpm run monitor:positions
```

这将显示：

- Paradex 当前持仓
- Lighter 当前持仓
- 净持仓（应接近 0）

## 🚀 启动策略

### ⚠️ 启动前的最后检查

在启动策略之前，请确保：

1. ✅ 已安装所有依赖（`pnpm install` 成功）
2. ✅ 配置文件验证通过
3. ✅ 两个交易所连接测试通过（或已根据实际 API 调整代码）
4. ✅ 账户有足够的测试网余额
5. ✅ 理解策略运行原理和风险

### 测试网运行

```bash
NODE_ENV=testnet pnpm start
```

**预期输出**：

```
============================================================
🚀 启动对冲交易系统
环境: testnet
币种: ETH
订单类型: market
订单大小: 0.01
============================================================
验证配置...
✅ 配置验证通过
初始化 Paradex 客户端...
✅ Paradex 登录成功
✅ Paradex 市场验证成功: ETH-USD-PERP
初始化 Lighter 客户端...
✅ Lighter 初始化成功: ETH -> Market ID: 0
创建对冲策略...
创建监控模块...
启动监控模块...
启动对冲策略...
============================================================

--- 第 1 轮交易 ---
...
```

### 运行中的监控

在另一个终端窗口，可以实时查看日志：

```bash
# 查看所有日志
tail -f logs/trading.log

# 查看错误日志
tail -f logs/error.log

# 查看告警日志
tail -f logs/alerts.log
```

### 停止策略

在运行的终端按 `Ctrl+C`，系统会优雅退出：

```
接收到 SIGINT 信号，正在关闭系统...
停止对冲策略...
停止持仓监控...
停止健康监控...
✅ 系统已安全关闭
```

### 主网运行（⚠️ 仅在测试网充分验证后）

**强制要求**：

1. ✅ 测试网运行至少 24 小时无重大问题
2. ✅ 订单成交率 > 98%
3. ✅ 净持仓始终 < 0.1
4. ✅ 无紧急平仓触发
5. ✅ 已配置 Telegram 告警

**启动主网**：

```bash
# 1. 创建主网配置
touch .env.mainnet
nano .env.mainnet  # 填写主网配置

# 2. 验证主网配置
NODE_ENV=mainnet pnpm run verify:config

# 3. 小额测试（建议先手动交易验证）
NODE_ENV=mainnet pnpm run monitor:positions

# 4. 启动主网策略
NODE_ENV=mainnet pnpm start
```

## 📊 监控和管理

### 查看日志

日志文件保存在 `logs/` 目录：

- `trading.log` - 所有日志
- `error.log` - 错误日志
- `alerts.log` - 告警日志

实时查看日志：

```bash
tail -f logs/trading.log
```

### 监控持仓

```bash
NODE_ENV=testnet pnpm run monitor:positions
```

### 紧急平仓

如果需要立即平掉所有持仓：

```bash
NODE_ENV=testnet pnpm run emergency:close
```

## 🛑 停止策略

在运行的终端按 `Ctrl+C` 即可优雅退出。

## 🔧 故障排查

### 问题 1: SDK 安装失败

**现象**：`pnpm install` 时报错，提示找不到某个 SDK

**解决方案**：✅ 已修复

- **Paradex**：不再使用 `@paradex/sdk`，改用直接 HTTP API
- **Lighter**：`lighter-ts-sdk` 已验证可用，直接安装即可

如果安装失败，检查：

```bash
# 检查网络连接
ping registry.npmjs.org

# 清除缓存重试
pnpm store prune
pnpm install
```

### 问题 2: Paradex SDK API 不匹配

**现象**：运行时报错 `The requested module '@paradex/sdk' does not provide an export named 'Environment'`

**原因**：`@paradex/sdk` 主要用于链上操作（充值/提现），不包含交易 API

**解决方案**：✅ 已修复

当前实现已改为直接使用 Paradex REST API，不依赖 SDK。如果测试成功，无需额外操作。

**说明**：

- `@paradex/sdk` 可以卸载（`pnpm remove @paradex/sdk`）
- 代码现在直接使用 axios 调用 Paradex API
- 认证方式：使用 JWT Token（环境变量中的私钥实际上是 JWT Token）

### 问题 3: 配置验证失败

**现象**：运行 `verify:config` 报错

**常见原因**：

- 环境变量文件名错误（应该是 `.env.testnet` 而不是 `.env`）
- 私钥格式错误（应该包含 `0x` 前缀）
- 缺少必填字段

**检查清单**：

```bash
# 1. 确认文件存在
ls -la .env.testnet

# 2. 检查文件内容（注意：不要泄露私钥）
cat .env.testnet | grep -v "PRIVATE_KEY"

# 3. 确认环境变量已加载
NODE_ENV=testnet node -e "require('dotenv').config({path:'.env.testnet'}); console.log(process.env.SYMBOL)"
```

### 问题 4: 连接测试失败

**Paradex 连接失败**：

- 检查网络连接
- 验证私钥格式（必须是完整的以太坊私钥）
- 确认 SDK 版本和 API 兼容性

**Lighter 连接失败**：

- 可能需要改用 HTTP API
- 检查账户索引和 API 密钥索引是否正确
- 查阅 Lighter 官方文档

### 问题 5: 运行时报错

**类型错误**：

```bash
# 重新编译 TypeScript
npx tsc --noEmit

# 查看具体错误，根据提示修复
```

**模块导入错误**：

```typescript
// 确保所有导入都使用 .js 扩展名（即使是 .ts 文件）
import { config } from './config/index.js'; // ✅ 正确
import { config } from './config/index'; // ❌ 错误
```

### 问题 6: Telegram 告警未收到

**检查步骤**：

1. 确认配置正确：

   ```bash
   echo $TELEGRAM_BOT_TOKEN
   echo $TELEGRAM_CHAT_ID
   ```

2. 测试 Bot Token：

   ```bash
   curl "https://api.telegram.org/bot<YOUR_BOT_TOKEN>/getMe"
   ```

3. 确认 Bot 已添加到聊天

4. 检查网络是否能访问 Telegram API

## 🛠️ 开发和调试

### 修改代码后重新运行

```bash
# TypeScript 会自动编译，直接运行即可
NODE_ENV=testnet pnpm start
```

### 查看日志定位问题

```bash
# 查看最近的错误
tail -100 logs/error.log

# 搜索特定错误
grep "ERROR" logs/trading.log

# 查看完整日志
less logs/trading.log
```

### 调整策略参数

编辑 `.env.testnet`：

```bash
# 减小订单大小
ORDER_SIZE=0.001

# 增加持仓时间
# 编辑 src/config/testnet.config.ts
holdTimeMin: 120,  # 从 60 改为 120
holdTimeMax: 240,  # 从 120 改为 240
```

## 📚 相关资源

### 官方文档

- **Paradex**：https://docs.paradex.trade/
- **Lighter**：https://lighter.xyz/docs（需确认实际文档地址）

### 技术文档

- [技术设计文档](./TECHNICAL_DESIGN.md) - 详细的技术架构和策略说明
- [项目总结](./PROJECT_SUMMARY.md) - 项目结构和开发总结

### SDK 文档

- **@paradex/sdk**: 检查 npm 或 GitHub 获取当前版本的文档
- **ethers.js**: https://docs.ethers.org/v6/
- **Winston**: https://github.com/winstonjs/winston

## ⚠️ 重要警告

### 关于代码调整

**本项目代码基于技术文档假设编写，实际运行前需要：**

1. ✅ **验证 SDK 可用性**：确认所有 SDK 包存在且版本正确
2. ✅ **调整 API 调用**：根据实际 SDK 文档修改客户端代码
3. ✅ **测试每个模块**：分别测试 Paradex、Lighter 连接
4. ✅ **小额测试**：先用极小金额测试完整流程
5. ✅ **充分验证**：测试网运行 24-48 小时确认稳定

### 关于风险

1. ⚠️ **代码未经生产验证**：这是新开发的代码，可能存在 bug
2. ⚠️ **SDK 兼容性**：实际 SDK 可能与代码假设不符
3. ⚠️ **市场风险**：即使是对冲策略，也存在执行风险
4. ⚠️ **资金安全**：私钥泄露将导致资金损失
5. ⚠️ **测试充分**：不充分的测试可能导致资金损失

### 关于责任

**本项目仅供学习和研究使用。使用本软件进行交易的所有风险由使用者自行承担。作者不对任何损失负责。**

## 📞 获取帮助

如果遇到问题：

1. 仔细阅读错误信息和本文档
2. 检查 `logs/` 目录下的日志文件
3. 查阅相关 SDK 的官方文档
4. 在测试网环境调试，不要直接在主网尝试

---

**最后提醒**：这是一个复杂的交易系统，涉及真实资金。请务必：

- ✅ 完全理解代码逻辑
- ✅ 在测试网充分测试
- ✅ 小额开始，逐步增加
- ✅ 持续监控，及时响应

祝你交易顺利！🎉
