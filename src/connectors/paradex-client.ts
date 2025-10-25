/**
 * Paradex 客户端（基于官方 demo 实现）
 *
 * 使用 Starknet 账户系统进行认证和交易
 * 参考：demo/src/utils/api.ts
 */

import axios, { AxiosInstance } from 'axios';
import { shortString, ec, typedData as starkTypedData, TypedData } from 'starknet';
import { getUnixTime } from 'date-fns';
import { ParadexPosition, MarketPrice } from '../types/index.js';
import log from '../utils/logger.js';

const SEVEN_DAYS_MS = 7 * 24 * 60 * 60 * 1000;
const TOKEN_REFRESH_BUFFER_MS = 30 * 1000; // Token 过期前 30 秒刷新

interface Account {
  address: string; // Starknet 账户地址
  publicKey: string; // Starknet 公钥
  privateKey: string; // Starknet 私钥
  ethereumAccount: string; // 以太坊账户地址
  jwtToken?: string;
  tokenExpiry?: number; // Token 过期时间戳
}

export class ParadexClient {
  private client: AxiosInstance;
  private symbol: string;
  private account: Account;
  private chainId: string;

  constructor(
    apiUrl: string,
    starknetPrivateKey: string, // Starknet 私钥
    baseSymbol: string,
    starknetAddress: string, // Starknet 账户地址
    starknetPublicKey: string, // Starknet 公钥（可选，会自动从私钥计算）
    ethereumAddress: string, // 以太坊地址
    network: string = 'testnet'
  ) {
    this.symbol = `${baseSymbol}-USD-PERP`;
    this.chainId =
      network === 'testnet'
        ? shortString.encodeShortString('PRIVATE_SN_POTC_SEPOLIA')
        : shortString.encodeShortString('PRIVATE_SN_PARACLEAR_MAINNET');

    // 如果没有提供公钥，从私钥自动计算
    let publicKey = starknetPublicKey;
    if (!publicKey || publicKey === '') {
      try {
        publicKey = ec.starkCurve.getStarkKey(starknetPrivateKey);
        log.info(`✅ 已从私钥自动计算公钥: ${publicKey.substring(0, 10)}...`);
      } catch (error) {
        log.error('从私钥计算公钥失败，请手动提供公钥', error);
        throw error;
      }
    }

    this.account = {
      address: starknetAddress,
      publicKey,
      privateKey: starknetPrivateKey,
      ethereumAccount: ethereumAddress,
    };

    this.client = axios.create({
      baseURL: apiUrl,
      headers: {
        'Content-Type': 'application/json',
        Accept: 'application/json',
      },
    });
  }

  /**
   * 初始化 - Onboarding 和认证
   */
  async initialize(): Promise<void> {
    try {
      log.info('Paradex 初始化（Starknet 账户系统）...');

      // 1. Onboarding（注册账户）
      await this.onboardUser();

      // 2. 认证获取 JWT Token
      await this.authenticate();

      // 3. 验证市场
      await this.validateMarket();

      log.info('✅ Paradex 初始化成功');
    } catch (error: any) {
      log.error('Paradex 初始化失败', error);
      throw error;
    }
  }

  /**
   * Onboarding - 注册用户
   */
  private async onboardUser(): Promise<void> {
    try {
      const timestamp = Date.now();
      const signature = this.signOnboardingRequest();

      const headers = {
        'PARADEX-ETHEREUM-ACCOUNT': this.account.ethereumAccount,
        'PARADEX-STARKNET-ACCOUNT': this.account.address,
        'PARADEX-STARKNET-SIGNATURE': signature,
        'PARADEX-TIMESTAMP': timestamp.toString(),
      };

      await this.client.post(
        '/onboarding',
        { public_key: this.account.publicKey },
        { headers }
      );

      log.info('✅ Paradex Onboarding 成功');
    } catch (error: any) {
      // Onboarding 可能已完成，401/409 错误可以忽略
      if (error.response?.status === 401 || error.response?.status === 409) {
        log.info('账户已 onboarded，跳过');
      } else {
        log.error('Onboarding 失败', error);
        throw error;
      }
    }
  }

  /**
   * 认证 - 获取 JWT Token
   */
  private async authenticate(): Promise<void> {
    try {
      const { signature, timestamp, expiration } = this.signAuthRequest();

      const headers = {
        'PARADEX-STARKNET-ACCOUNT': this.account.address,
        'PARADEX-STARKNET-SIGNATURE': signature,
        'PARADEX-TIMESTAMP': timestamp.toString(),
        'PARADEX-SIGNATURE-EXPIRATION': expiration.toString(),
      };

      const response = await this.client.post('/auth', {}, { headers });

      this.account.jwtToken = response.data.jwt_token;

      if (!this.account.jwtToken) {
        throw new Error('JWT Token 获取失败');
      }

      // ⚠️ 解析并保存 Token 过期时间
      try {
        const payload = JSON.parse(atob(this.account.jwtToken.split('.')[1]));
        this.account.tokenExpiry = payload.exp * 1000; // 转换为毫秒

        const expiryDate = new Date(this.account.tokenExpiry);
        const now = Date.now();
        const remainingMs = this.account.tokenExpiry - now;
        const remainingMin = Math.floor(remainingMs / 60000);

        log.info('✅ JWT Token 获取成功');
        log.info(
          `Token 过期时间: ${expiryDate.toLocaleString('zh-CN')} (${remainingMin} 分钟后)`
        );
      } catch (e) {
        log.warn('无法解析 Token 过期时间');
      }
    } catch (error: any) {
      log.error('认证失败', error);
      throw error;
    }
  }

  /**
   * 检查并刷新 Token（如果即将过期）
   */
  private async ensureTokenValid(): Promise<void> {
    if (!this.account.tokenExpiry) {
      // 如果没有过期时间，尝试重新认证
      await this.authenticate();
      return;
    }

    const now = Date.now();
    const timeUntilExpiry = this.account.tokenExpiry - now;

    // 如果 Token 在 30 秒内过期，重新认证
    if (timeUntilExpiry < TOKEN_REFRESH_BUFFER_MS) {
      log.warn(`Token 即将过期（${Math.floor(timeUntilExpiry / 1000)}秒后），刷新中...`);
      await this.authenticate();
    }
  }

  /**
   * 带 401 自动重试的请求包装器
   *
   * @param fn - 需要执行的异步函数
   * @param maxRetries - 最大重试次数（默认 1 次）
   */
  private async withTokenRetry<T>(
    fn: () => Promise<T>,
    maxRetries: number = 1
  ): Promise<T> {
    let attempt = 0;

    while (attempt <= maxRetries) {
      try {
        return await fn();
      } catch (error: any) {
        // 检查是否是 401 错误
        const is401 =
          error.response?.status === 401 ||
          error.response?.data?.error === 'INVALID_TOKEN';

        if (is401 && attempt < maxRetries) {
          attempt++;
          log.warn(`检测到 401 错误，重新认证并重试（第 ${attempt} 次）...`);

          // 重新认证
          await this.authenticate();

          // 继续下一次循环重试
          continue;
        }

        // 非 401 错误或重试次数用尽，抛出错误
        throw error;
      }
    }

    throw new Error('重试次数用尽');
  }

  /**
   * 签名 Onboarding 请求
   */
  private signOnboardingRequest(): string {
    const typedData = this.buildOnboardingTypedData();
    return this.signatureFromTypedData(typedData);
  }

  /**
   * 签名认证请求
   */
  private signAuthRequest(): {
    signature: string;
    timestamp: number;
    expiration: number;
  } {
    const dateNow = new Date();
    const dateExpiration = new Date(dateNow.getTime() + SEVEN_DAYS_MS);

    const timestamp = getUnixTime(dateNow);
    const expiration = getUnixTime(dateExpiration);

    const request = {
      method: 'POST',
      path: '/v1/auth',
      body: '',
      timestamp,
      expiration,
    };

    const typedData = this.buildAuthTypedData(request);
    const signature = this.signatureFromTypedData(typedData);

    return { signature, timestamp, expiration };
  }

  /**
   * 从 TypedData 生成签名
   */
  private signatureFromTypedData(typedData: TypedData): string {
    const msgHash = starkTypedData.getMessageHash(typedData, this.account.address);
    const { r, s } = ec.starkCurve.sign(msgHash, this.account.privateKey);
    return JSON.stringify([r.toString(), s.toString()]);
  }

  /**
   * 构建 Onboarding TypedData
   */
  private buildOnboardingTypedData(): TypedData {
    return {
      domain: {
        name: 'Paradex',
        chainId: this.chainId,
        version: '1',
      },
      primaryType: 'Constant',
      types: {
        StarkNetDomain: [
          { name: 'name', type: 'felt' },
          { name: 'chainId', type: 'felt' },
          { name: 'version', type: 'felt' },
        ],
        Constant: [{ name: 'action', type: 'felt' }],
      },
      message: {
        action: 'Onboarding',
      },
    };
  }

  /**
   * 构建认证 TypedData
   */
  private buildAuthTypedData(request: any): TypedData {
    return {
      domain: {
        name: 'Paradex',
        chainId: this.chainId,
        version: '1',
      },
      primaryType: 'Request',
      types: {
        StarkNetDomain: [
          { name: 'name', type: 'felt' },
          { name: 'chainId', type: 'felt' },
          { name: 'version', type: 'felt' },
        ],
        Request: [
          { name: 'method', type: 'felt' },
          { name: 'path', type: 'felt' },
          { name: 'body', type: 'felt' },
          { name: 'timestamp', type: 'felt' },
          { name: 'expiration', type: 'felt' },
        ],
      },
      message: request,
    };
  }

  /**
   * 签名订单
   */
  private signOrder(orderDetails: any, timestamp: number): string {
    const sideForSigning = orderDetails.side === 'BUY' ? '1' : '2';
    const priceForSigning = this.toQuantums(orderDetails.price || '0', 8);
    const sizeForSigning = this.toQuantums(orderDetails.size, 8);
    const orderTypeForSigning = shortString.encodeShortString(orderDetails.type);
    const marketForSigning = shortString.encodeShortString(orderDetails.market);

    const message = {
      timestamp,
      market: marketForSigning,
      side: sideForSigning,
      orderType: orderTypeForSigning,
      size: sizeForSigning,
      price: priceForSigning,
    };

    const typedData = this.buildOrderTypedData(message);
    return this.signatureFromTypedData(typedData);
  }

  /**
   * 构建订单 TypedData
   */
  private buildOrderTypedData(message: any): TypedData {
    return {
      domain: {
        name: 'Paradex',
        chainId: this.chainId,
        version: '1',
      },
      primaryType: 'Order',
      types: {
        StarkNetDomain: [
          { name: 'name', type: 'felt' },
          { name: 'chainId', type: 'felt' },
          { name: 'version', type: 'felt' },
        ],
        Order: [
          { name: 'timestamp', type: 'felt' },
          { name: 'market', type: 'felt' },
          { name: 'side', type: 'felt' },
          { name: 'orderType', type: 'felt' },
          { name: 'size', type: 'felt' },
          { name: 'price', type: 'felt' },
        ],
      },
      message,
    };
  }

  /**
   * 转换为 Quantum 值
   */
  private toQuantums(value: string, decimals: number): string {
    const multiplier = BigInt(10) ** BigInt(decimals);
    const floatValue = parseFloat(value);
    const quantumValue = BigInt(Math.round(floatValue * Number(multiplier)));
    return quantumValue.toString();
  }

  /**
   * 验证市场
   */
  async validateMarket(): Promise<void> {
    const markets = await this.getAvailableMarkets();
    const market = markets.find((m: any) => m.symbol === this.symbol);

    if (!market) {
      const availableSymbols = markets.map((m: any) => m.symbol).join(', ');
      throw new Error(
        `市场 ${this.symbol} 在 Paradex 中不存在。可用市场: ${availableSymbols}`
      );
    }

    log.info(`✅ Paradex 市场验证成功: ${this.symbol}`);
  }

  /**
   * 获取所有可用市场
   */
  async getAvailableMarkets(): Promise<any[]> {
    try {
      const response = await this.client.get('/markets');
      return response.data.results || response.data || [];
    } catch (error: any) {
      log.error('获取 Paradex 市场列表失败', error);
      throw error;
    }
  }

  /**
   * 创建市价单
   */
  async createMarketOrder(side: 'buy' | 'sell', size: number): Promise<any> {
    return this.withTokenRetry(async () => {
      // ⚠️ 确保 Token 有效
      await this.ensureTokenValid();

      const timestamp = Date.now();

      const orderDetails = {
        market: this.symbol,
        side: side.toUpperCase(),
        type: 'MARKET',
        size: size.toString(),
        // ⚠️ 市价单不能包含 price 字段
        instruction: 'GTC',
      };

      // 签名时需要 price='0'，但提交时不能包含
      const detailsForSigning = {
        ...orderDetails,
        price: '0', // 签名时需要
      };

      const signature = this.signOrder(detailsForSigning, timestamp);

      const orderBody = {
        ...orderDetails,
        signature,
        signature_timestamp: timestamp,
      };

      const headers = {
        Authorization: `Bearer ${this.account.jwtToken}`,
      };

      try {
        const response = await this.client.post('/orders', orderBody, { headers });

        log.info(
          `✅ Paradex 市价单创建成功: ${response.data.id || response.data.order_id}`
        );
        return response.data;
      } catch (error: any) {
        log.error(`Paradex 市价单创建失败 (${side} ${size})`, error);
        log.error(`错误详情: ${JSON.stringify(error.response?.data)}`);
        throw error;
      }
    });
  }

  /**
   * 创建限价单
   */
  async createLimitOrder(
    side: 'buy' | 'sell',
    size: number,
    price: number
  ): Promise<any> {
    return this.withTokenRetry(async () => {
      // ⚠️ 确保 Token 有效
      await this.ensureTokenValid();

      const timestamp = Date.now();

      const orderDetails = {
        market: this.symbol,
        side: side.toUpperCase(),
        type: 'LIMIT',
        size: size.toString(),
        price: price.toString(),
        instruction: 'GTC',
      };

      const signature = this.signOrder(orderDetails, timestamp);

      const orderBody = {
        ...orderDetails,
        signature,
        signature_timestamp: timestamp,
      };

      const headers = {
        Authorization: `Bearer ${this.account.jwtToken}`,
      };

      try {
        const response = await this.client.post('/orders', orderBody, { headers });

        log.info(
          `✅ Paradex 限价单创建成功: ${response.data.id || response.data.order_id}`
        );
        return response.data;
      } catch (error: any) {
        log.error(`Paradex 限价单创建失败 (${side} ${size} @ ${price})`, error);
        throw error; // 抛出错误以便 withTokenRetry 处理
      }
    });
  }

  /**
   * 获取账户信息（包括持仓）
   */
  async getAccountInfo(): Promise<any> {
    return this.withTokenRetry(async () => {
      // ⚠️ 确保 Token 有效
      await this.ensureTokenValid();

      const headers = {
        Authorization: `Bearer ${this.account.jwtToken}`,
      };

      try {
        const response = await this.client.get('/account', { headers });
        return response.data;
      } catch (error: any) {
        log.error('获取 Paradex 账户信息失败', error);
        throw error; // 抛出错误以便 withTokenRetry 处理
      }
    });
  }

  /**
   * 获取持仓列表
   */
  async getPositions(): Promise<ParadexPosition[]> {
    try {
      // ⚠️ 确保 Token 有效
      await this.ensureTokenValid();

      const headers = {
        Authorization: `Bearer ${this.account.jwtToken}`,
      };

      // ⚠️ 使用专门的 /positions 端点
      const response = await this.client.get('/positions', { headers });

      // API 返回格式: { results: [...] }
      const allPositions = response.data.results || [];

      // ⚠️ 只返回状态为 OPEN 的持仓
      const openPositions = allPositions.filter((p: any) => p.status === 'OPEN');

      log.debug(
        `Paradex 持仓数量: ${openPositions.length} (总共 ${allPositions.length})`
      );

      return openPositions;
    } catch (error: any) {
      log.error('获取 Paradex 持仓失败', error);
      log.error(`错误详情: ${JSON.stringify(error.response?.data)}`);
      return [];
    }
  }

  /**
   * 获取指定市场的持仓
   */
  async getPosition(): Promise<number> {
    const positions = await this.getPositions();

    log.debug(`查找 ${this.symbol} 的持仓，总持仓数: ${positions.length}`);

    const position = positions.find((p: any) => p.market === this.symbol);

    if (!position) {
      log.debug(`未找到 ${this.symbol} 的持仓`);
      if (positions.length > 0) {
        log.debug(`现有持仓市场: ${positions.map((p: any) => p.market).join(', ')}`);
      }
      return 0;
    }

    log.debug(
      `找到持仓: market=${position.market}, side=${position.side}, size=${position.size}`
    );

    // ⚠️ 注意：Paradex 的 size 字段本身已经包含了方向
    // - LONG: size 为正数（如 "0.345"）
    // - SHORT: size 为负数（如 "-0.345"）
    // 所以直接使用 size 值即可
    const size = parseFloat(position.size || '0');

    log.debug(`${this.symbol} 持仓值: ${size}`);

    return size;
  }

  /**
   * 计算最近一轮的盈亏
   *
   * @returns 最近一次开平仓的盈亏（支持多笔订单）
   */
  async getLastRoundPnL(): Promise<number> {
    try {
      const orders = await this.getOrderHistory(10);

      if (orders.length < 2) {
        return 0;
      }

      const { openOrders, closeOrders } = this.groupOrdersBySide(orders);

      if (openOrders.length === 0 || closeOrders.length === 0) {
        return 0;
      }

      const openTotalPrice = this.calculateTotalPrice(openOrders);
      const closeTotalPrice = this.calculateTotalPrice(closeOrders);

      const isOpenBuy = openOrders[0].side === 'BUY';
      const pnl = isOpenBuy
        ? closeTotalPrice - openTotalPrice
        : openTotalPrice - closeTotalPrice;

      log.debug(
        `Paradex PnL: ${openOrders.length}笔开仓 @ $${openTotalPrice.toFixed(2)}, ` +
          `${closeOrders.length}笔平仓 @ $${closeTotalPrice.toFixed(2)}, 盈亏=$${pnl.toFixed(4)}`
      );

      return pnl;
    } catch (error: any) {
      log.error('计算 Paradex 盈亏失败', error);
      return 0;
    }
  }

  /**
   * 按side方向分组订单（只取最近一对）
   *
   * 由于flags实际返回空数组，改用side方向变化来分组：
   * - 第一组连续同方向 = 平仓组
   * - 第二组连续同方向 = 开仓组
   * - 方向再次改变时停止
   *
   * 同时验证size是否一致，确保是配对的开平仓
   */
  private groupOrdersBySide(orders: any[]): { openOrders: any[]; closeOrders: any[] } {
    const closeOrders: any[] = [];
    const openOrders: any[] = [];
    let currentSide: string | null = null;
    let groupIndex = 0; // 0=平仓组, 1=开仓组

    for (const order of orders) {
      const side = order.side; // BUY 或 SELL

      if (groupIndex === 0) {
        // 收集平仓组（第一组连续同方向）
        if (currentSide === null) {
          currentSide = side;
          closeOrders.push(order);
        } else if (currentSide === side) {
          closeOrders.push(order);
        } else {
          // 方向改变，进入开仓组
          groupIndex = 1;
          currentSide = side;
          openOrders.push(order);

          // 如果openOrders的size和closeOrders的size一致，则不认为是配对的开平仓
          if (openOrders[0].size === closeOrders[0].size) {
            break;
          }
        }
      } else if (groupIndex === 1) {
        // 收集开仓组（第二组连续同方向）
        if (currentSide === side) {
          openOrders.push(order);
        } else {
          // 方向再次改变，停止（只要最近一对）
          break;
        }
      }
    }

    // 验证：检查平仓和开仓的总size是否基本一致（允许小误差）
    const closeSize = closeOrders.reduce((sum, o) => sum + parseFloat(o.size || '0'), 0);
    const openSize = openOrders.reduce((sum, o) => sum + parseFloat(o.size || '0'), 0);

    if (Math.abs(closeSize - openSize) > 0.001) {
      log.warn(
        `⚠️ 开平仓size不匹配: 平仓=${closeSize.toFixed(4)}, 开仓=${openSize.toFixed(4)}, ` +
          `可能不是配对的开平仓`
      );
    }

    return { openOrders, closeOrders };
  }

  /**
   * 计算加权平均价
   */
  private calculateTotalPrice(orders: any[]): number {
    let totalValue = 0;
    let totalSize = 0;

    for (const order of orders) {
      const price = parseFloat(order.avg_fill_price || '0');
      const size = parseFloat(order.size || '0');
      totalValue += price * size;
      totalSize += size;
    }

    return totalSize > 0 ? totalValue : 0;
  }

  /**
   * 获取订单历史
   *
   * @param limit - 限制返回数量（默认10）
   * @param orderId - 可选的订单ID过滤
   */
  async getOrderHistory(limit: number = 10): Promise<any[]> {
    return this.withTokenRetry(async () => {
      await this.ensureTokenValid();

      const headers = {
        Authorization: `Bearer ${this.account.jwtToken}`,
      };

      try {
        const params = {
          page_size: limit,
        };

        const response = await this.client.get('/orders-history', { headers, params });
        return response.data.results || [];
      } catch (error: any) {
        log.error('获取 Paradex 订单历史失败', error);
        throw error;
      }
    }, 1).catch(() => []);
  }

  /**
   * 获取市场价格
   */
  async getMarketPrice(): Promise<MarketPrice> {
    try {
      const response = await this.client.get(`/markets/summary`, {
        params: { market: this.symbol },
      });

      const data = response.data;
      const orderbook = data.results?.[0] || data;

      const bidPrice = parseFloat(orderbook.bid || '0');
      const askPrice = parseFloat(orderbook.ask || '0');
      const lastPrice = parseFloat(
        orderbook.last_traded_price ||
          orderbook.mark_price ||
          ((bidPrice + askPrice) / 2).toString()
      );

      return { bidPrice, askPrice, lastPrice };
    } catch (error: any) {
      log.error('获取 Paradex 市场价格失败', error);
      return { bidPrice: 0, askPrice: 0, lastPrice: 0 };
    }
  }

  /**
   * 订阅 WebSocket 更新（暂未实现）
   */
  subscribeToUpdates(_onUpdate: (data: any) => void): void {
    log.warn('Paradex WebSocket 订阅暂未实现');
  }

  /**
   * 关闭连接
   */
  close(): void {
    log.info('Paradex 客户端关闭');
  }
}
