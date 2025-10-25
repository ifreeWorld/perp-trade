# 对冲刷量交易系统

[![TypeScript](https://img.shields.io/badge/TypeScript-5.0+-blue.svg)](https://www.typescriptlang.org/)
[![Node.js](https://img.shields.io/badge/Node.js-18+-green.svg)](https://nodejs.org/)
[![License](https://img.shields.io/badge/License-MIT-yellow.svg)](./LICENSE)

在 Paradex 和 Lighter 两个平台进行反向对冲交易，实现零成本、零风险的交易量刷单策略。同一时间市价单开仓，市价单平仓。

## ✨ 核心特性

- ✅ **市价单策略**：消除价格磨损，成本节省 50%
- ✅ **5 层风控保护**：实时监控、单边对冲、净持仓修正、紧急平仓
- ✅ **多币种支持**：支持 ETH、BTC 等多种币种对冲
- ✅ **官方 SDK 集成**：Paradex 官方 SDK + Lighter 社区 SDK
- ✅ **自动成交监控**：每 500ms 检查持仓，防止单边暴露
- ✅ **Telegram 告警**：实时推送异常告警

## 🎯 核心原理

1. **反向对冲**：在 Paradex 开多仓，同时在 Lighter 开空仓（或相反）
2. **市价单开仓**：快速成交（1-2 秒），无价格磨损
3. **实时监控**：轮询检查成交状态，发现单边立即对冲
4. **净持仓控制**：目标净持仓 = 0，容忍度 < 0.1 ETH

## 📦 快速开始

### 1. 安装依赖

```bash
# 安装 pnpm
npm install -g pnpm

# 安装项目依赖
pnpm install
```

### 2. 配置环境变量

```bash
# 复制测试网配置模板
cp .env.testnet.example .env.testnet

# 编辑配置文件，填写 API 密钥
nano .env.testnet
```

必填配置项：

```bash
SYMBOL=ETH                                    # 交易币种
ORDER_SIZE=0.01                               # 订单大小
PARADEX_TESTNET_PRIVATE_KEY=0x...            # Paradex 私钥
LIGHTER_TESTNET_PRIVATE_KEY=0x...            # Lighter 私钥
LIGHTER_TESTNET_ACCOUNT_INDEX=123            # Lighter 账户索引
LIGHTER_TESTNET_API_KEY_INDEX=1              # Lighter API 密钥索引
```

### 3. 测试连接

```bash
# 验证配置
NODE_ENV=testnet pnpm run verify:config

# 测试 Paradex 连接
NODE_ENV=testnet pnpm run test:connection:paradex

# 测试 Lighter 连接
NODE_ENV=testnet pnpm run test:connection:lighter
```

### 4. 启动策略

```bash
# 测试网运行
NODE_ENV=testnet pnpm start

# 主网运行（仅在测试网验证通过后）
NODE_ENV=mainnet pnpm start
```

## 📊 监控和管理

### 查看持仓

```bash
NODE_ENV=testnet pnpm run monitor:positions
```

### 紧急平仓

```bash
NODE_ENV=testnet pnpm run emergency:close
```

### 查看日志

```bash
# 实时查看日志
tail -f logs/trading.log

# 查看错误日志
tail -f logs/error.log

# 查看告警日志
tail -f logs/alerts.log
```

## 🛡️ 风控机制

系统采用 5 层风控保护：

```
第1层：预检查
  └─ 每轮交易前检查净持仓，不为 0 则先平仓

第2层：实时监控
  └─ 提交订单后每 500ms 检查持仓
  └─ 5 秒超时保护

第3层：单边对冲
  └─ 发现单边成交 → 立即市价对冲（1 秒内）
  └─ Telegram 告警通知

第4层：净持仓修正
  └─ 开仓后验证，|净持仓| > 0.01 → 立即修正

第5层：紧急平仓
  └─ 重试失败 → 全部平仓 → 停止策略
```

## 📈 性能指标

测试网运行 24 小时后，应达到以下指标：

| 指标         | 目标值  | 说明                   |
| ------------ | ------- | ---------------------- |
| 订单成交率   | > 98%   | 市价单立即成交         |
| 平均成交时间 | < 3 秒  | 95%+ 时间              |
| 单边成交率   | < 5%    | 检测和对冲机制工作正常 |
| 净持仓       | < 0.01  | 99%+ 时间              |
| 平均滑点     | < 0.02% | 流动性充足             |
| 紧急平仓次数 | 0 次    | 无重大风控触发         |

## 🔧 配置说明

### 策略参数

```bash
ORDER_SIZE=0.01              # 订单大小
ORDER_TYPE=market            # 订单类型（推荐 market）
MAX_NET_POSITION=0.1         # 最大净持仓容忍度
```

### Telegram 告警配置

1. 与 [@BotFather](https://t.me/BotFather) 对话创建机器人
2. 获取 Bot Token
3. 与 [@userinfobot](https://t.me/userinfobot) 对话获取 Chat ID
4. 配置环境变量：

```bash
TELEGRAM_BOT_TOKEN=your_bot_token
TELEGRAM_CHAT_ID=your_chat_id
```

## 📚 文档

- [快速开始指南](./QUICK_START.md) - 详细的安装和配置说明
- [技术设计文档](./TECHNICAL_DESIGN.md) - 完整的技术架构和策略说明

## 🚨 风险提示

1. ⚠️ **测试优先**：在主网运行前，必须在测试网运行至少 24 小时
2. ⚠️ **小额开始**：主网运行时，建议从小额订单开始
3. ⚠️ **密切监控**：主网启动后前 2 小时需密切监控
4. ⚠️ **配置告警**：强烈建议配置 Telegram 告警
5. ⚠️ **私钥安全**：妥善保管私钥，不要泄露

## 🏗️ 项目结构

```
perp-trade/
├── src/
│   ├── config/              # 配置管理
│   ├── connectors/          # 交易所客户端
│   ├── strategies/          # 对冲策略
│   ├── monitors/            # 监控模块
│   ├── utils/               # 工具函数
│   ├── types/               # 类型定义
│   └── index.ts             # 主程序入口
├── scripts/                 # 辅助脚本
├── logs/                    # 日志目录
├── package.json             # 依赖管理
└── tsconfig.json            # TypeScript 配置
```

## 🤝 贡献

欢迎提交 Issue 和 Pull Request！

## 📄 许可证

MIT License

---

**⚠️ 免责声明**：本项目仅供学习和研究使用。使用本软件进行交易的所有风险由使用者自行承担。作者不对任何损失负责。
