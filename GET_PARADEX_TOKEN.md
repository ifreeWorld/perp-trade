# 获取 Paradex JWT Token 指南

## 🎯 目标

获取一个有**交易权限**的 JWT Token 用于自动化交易。

## 📝 步骤

### 方法 1：从网站直接复制 JWT（最简单）

1. **访问 Paradex 测试网**

   ```
   https://testnet.paradex.trade/
   ```

2. **连接钱包**
   - 点击右上角 "Connect Wallet"
   - 使用 MetaMask 连接
   - 确保使用的钱包地址是：`0xC45A84bC937425024d5f73755de2EdD9dd26310a`
   - （这是你当前私钥对应的地址）

3. **获取 JWT Token**

   打开浏览器开发者工具（F12）：
   - 进入 **Application** / **应用程序** 标签
   - 找到 **Local Storage** → `https://testnet.paradex.trade`
   - 查找 `jwtToken` 或 `paradex_jwt` 或类似的键
   - 复制对应的值（一个很长的字符串，以 `eyJ` 开头）

   或者：
   - 进入 **Network** / **网络** 标签
   - 刷新页面
   - 找到任何发往 `api.testnet.paradex.trade` 的请求
   - 查看 **Request Headers**
   - 找到 `Authorization: Bearer eyJ...`
   - 复制 `eyJ` 后面的整个 Token

4. **更新配置**

   编辑 `.env.testnet`：

   ```bash
   PARADEX_TESTNET_PRIVATE_KEY=eyJhbGciOiJFUzI1NiIsInR5cCI6IkpXVCJ9.eyJ...（完整的JWT）
   ```

5. **验证 Token**
   ```bash
   NODE_ENV=testnet pnpm run test:connection:paradex
   ```

---

### 方法 2：使用 API Key（如果 Paradex 支持）

1. 登录 Paradex 测试网
2. 进入 **Settings** → **API Keys**
3. 点击 **Create API Key**
4. 勾选权限：
   - ✅ Read
   - ✅ Trade
5. 复制生成的 API Key
6. 更新配置：
   ```bash
   PARADEX_TESTNET_PRIVATE_KEY=你的API_Key
   ```

---

## 🔍 验证 Token 权限

生成的 Token 应该有交易权限，可以用这个命令检查：

```bash
# 解析 JWT Token 查看权限
node -e "
const token = process.env.PARADEX_TESTNET_PRIVATE_KEY || '';
if (token.startsWith('eyJ')) {
  const payload = JSON.parse(Buffer.from(token.split('.')[1], 'base64').toString());
  console.log('Token 信息:');
  console.log('  - 地址:', payload.sub);
  console.log('  - 权限:', payload.token_usage || '完整权限');
  console.log('  - 过期时间:', new Date(payload.exp * 1000).toLocaleString('zh-CN'));
  if (payload.token_usage === 'readonly') {
    console.log('  ⚠️ 警告：这是只读 Token，无法交易');
  } else {
    console.log('  ✅ 此 Token 可用于交易');
  }
} else {
  console.log('不是 JWT Token，可能是 API Key');
}
" 2>/dev/null
```

---

## ⚠️ 注意事项

1. **Token 会过期**：JWT Token 通常有有效期（几天到几周），过期后需要重新生成

2. **安全性**：
   - 不要将 Token 提交到 Git
   - 不要分享给他人
   - 定期更换

3. **权限确认**：
   - 必须有 **Trade** 权限才能下单
   - 只读 Token 只能查询，无法交易

---

## 🚨 如果仍然失败

如果使用从网站复制的 JWT 仍然返回 401/403：

1. **检查 Token 是否完整**：应该是很长的字符串，包含两个点（`.`）

2. **检查 Token 是否过期**：用上面的命令查看过期时间

3. **尝试重新登录**：
   - 退出 Paradex 网站
   - 清除浏览器缓存
   - 重新登录
   - 重新复制 Token

4. **联系支持**：如果以上都不行，可能需要联系 Paradex 支持获取帮助

---

**当前你的地址**: `0xC45A84bC937425024d5f73755de2EdD9dd26310a`

用这个地址在 Paradex 测试网上登录，然后复制 JWT Token 即可！
