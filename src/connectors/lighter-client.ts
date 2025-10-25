/**
 * Lighter 客户端（使用 lighter-ts-sdk）
 *
 * 根据官方文档重写：
 * - 使用 ApiClient 和 OrderApi 查询市场信息
 * - 使用 SignerClient 进行交易操作
 * - WASM 签名器（跨平台，无需 Go）
 */

import { SignerClient, ApiClient, OrderApi, AccountApi } from 'lighter-ts-sdk';
import { LighterPosition } from '../types/index.js';
import log from '../utils/logger.js';

export class LighterClient {
  private signer: SignerClient;
  private apiClient: ApiClient;
  private orderApi: OrderApi;
  private accountApi: AccountApi;
  private baseSymbol: string;
  private marketIndex?: number;
  private accountIndex: number;
  private marketInfo?: {
    sizeDecimals: number;
    priceDecimals: number;
    minBaseAmount: string;
  };

  constructor(
    apiUrl: string,
    _wsUrl: string, // 暂未使用，但保留接口
    privateKey: string,
    accountIndex: number,
    apiKeyIndex: number,
    baseSymbol: string
  ) {
    this.accountIndex = accountIndex;
    this.baseSymbol = baseSymbol;

    // 创建 API 客户端（用于查询）
    this.apiClient = new ApiClient({ host: apiUrl });
    this.orderApi = new OrderApi(this.apiClient);
    this.accountApi = new AccountApi(this.apiClient);

    // 创建 SignerClient（用于交易）
    this.signer = new SignerClient({
      url: apiUrl,
      privateKey, // API 私钥
      accountIndex,
      apiKeyIndex,
    });
  }

  /**
   * 初始化
   */
  async initialize(): Promise<void> {
    try {
      log.info('Lighter SDK 初始化...');

      // 初始化 SignerClient
      await this.signer.initialize();

      // 确保 WASM 客户端已加载
      await this.signer.ensureWasmClient();

      // 动态查询 marketIndex
      await this.findMarketIndex();

      log.info(
        `✅ Lighter 初始化成功: ${this.baseSymbol} -> Market Index: ${this.marketIndex}`
      );
    } catch (error: any) {
      log.error('Lighter 初始化失败', error);
      throw error;
    }
  }

  /**
   * 查找市场索引（通过 getOrderBooks API）
   */
  async findMarketIndex(): Promise<number> {
    try {
      const response = await this.orderApi.getOrderBooks();

      // 返回格式：{code: 200, order_books: [...]}
      const orderBooks =
        (response as any).order_books || (response as any).orderBooks || [];

      const market = orderBooks.find((ob: any) => {
        const symbol = (ob.symbol || '').toUpperCase();
        return symbol === this.baseSymbol.toUpperCase();
      });

      if (!market) {
        const available = orderBooks.map((ob: any) => ob.symbol).join(', ');
        throw new Error(
          `币种 ${this.baseSymbol} 在 Lighter 中不存在。可用市场: ${available}`
        );
      }

      // 保存市场索引
      this.marketIndex = market.market_id;

      if (this.marketIndex === undefined || this.marketIndex === null) {
        throw new Error(`market_id 为空: ${JSON.stringify(market)}`);
      }

      // 保存市场信息（包括 decimals，支持多币种）
      this.marketInfo = {
        sizeDecimals: market.supported_size_decimals || 4,
        priceDecimals: market.supported_price_decimals || 2,
        minBaseAmount: market.min_base_amount || '0.001',
      };

      log.info(
        `市场信息: decimals=${this.marketInfo.sizeDecimals}, ` +
          `最小订单=${this.marketInfo.minBaseAmount} ${this.baseSymbol}`
      );

      return this.marketIndex;
    } catch (error: any) {
      log.error('查找 Lighter 市场索引失败', error);
      throw error;
    }
  }

  /**
   * 创建市价单
   *
   * 注意：
   * - baseAmount 使用市场的 decimals（不同币种有不同的精度）
   * - avgExecutionPrice 使用美分（× 100）
   *
   * @param isAsk - true=卖出, false=买入
   * @param size - 订单大小（小数格式）
   * @param reduceOnly - 是否仅减仓（平仓时应设为 true）
   */
  async createMarketOrder(
    isAsk: boolean,
    size: string,
    reduceOnly: boolean = false
  ): Promise<any> {
    try {
      const marketIndex = this.marketIndex!;

      if (!this.marketInfo) {
        throw new Error('市场信息未初始化');
      }

      // ⚠️ 重要：baseAmount 使用市场的 decimals（不同币种有不同的精度）
      // BNB: decimals=2 → × 100
      const sizeFloat = parseFloat(size);
      const decimals = this.marketInfo.sizeDecimals;
      const baseAmount = Math.round(sizeFloat * Math.pow(10, decimals));

      if (baseAmount < 1) {
        throw new Error(
          `订单大小太小: ${size} ${this.baseSymbol} = ${baseAmount} (最小单位)，必须 >= 1\n` +
            `最小订单量: ${this.marketInfo.minBaseAmount} ${this.baseSymbol}`
        );
      }

      // 获取当前盘口价格（买入用 ask，卖出用 bid）
      const isBuy = !isAsk; // isAsk=false 表示买入
      const price = await this.getCurrentPrice(isBuy);

      let tx, txHash, err;

      const maxSlippage = 0.05; // 5% 滑点

      log.info(
        `创建市价单(平仓): ${isAsk ? '卖出' : '买入'} ${size} ${this.baseSymbol}, ` +
          `baseAmount=${baseAmount} (× 10^${decimals}), ` +
          `盘口价=$${price.toFixed(2)} (${isBuy ? 'ask' : 'bid'}), maxSlippage=${maxSlippage * 100}%, ` +
          `仅减仓=YES`
      );

      [tx, txHash, err] = await this.signer.createMarketOrder_maxSlippage({
        marketIndex,
        clientOrderIndex: Date.now(),
        baseAmount,
        maxSlippage,
        isAsk,
        reduceOnly,
        idealPrice: price * 10000,
      });

      if (err) {
        throw new Error(`Lighter 市价单创建失败: ${err}`);
      }

      log.info(`✅ Lighter 市价单创建成功: TxHash ${txHash}`);
      return { tx, txHash };
    } catch (error: any) {
      log.error(`Lighter 市价单创建失败 (${isAsk ? 'SELL' : 'BUY'} ${size})`, error);
      throw error;
    }
  }

  /**
   * 创建限价单
   */
  async createLimitOrder(isAsk: boolean, size: string, price: string): Promise<any> {
    try {
      const marketIndex = this.marketIndex!;

      if (!this.marketInfo) {
        throw new Error('市场信息未初始化');
      }

      // ⚠️ 转换 baseAmount 为整数（使用市场的 decimals，与市价单保持一致）
      const sizeFloat = parseFloat(size);
      const decimals = this.marketInfo.sizeDecimals;
      const baseAmount = Math.round(sizeFloat * Math.pow(10, decimals));

      // ⚠️ 价格使用美分（× 100）
      const priceInCents = Math.round(parseFloat(price) * 100);

      const [tx, txHash, err] = await this.signer.createOrder({
        marketIndex,
        clientOrderIndex: Date.now(),
        baseAmount,
        price: priceInCents,
        isAsk,
        timeInForce: SignerClient.ORDER_TIME_IN_FORCE_GOOD_TILL_TIME,
      });

      if (err) {
        throw new Error(`Lighter 限价单创建失败: ${err}`);
      }

      log.info(`⚠️ Lighter 限价单创建成功: TxHash ${txHash}`);
      return { tx, txHash };
    } catch (error: any) {
      log.error(
        `Lighter 限价单创建失败 (${isAsk ? 'SELL' : 'BUY'} ${size} @ ${price})`,
        error
      );
      throw error;
    }
  }

  /**
   * 获取当前市场价格（用于市价单）
   *
   * ⚠️ 使用盘口价格，而不是历史成交价
   */
  private async getCurrentPrice(isBuy: boolean): Promise<number> {
    const market_id = this.marketIndex!;

    // 从订单簿详情获取（返回格式：{code: 200, order_book_details: [...]}）
    const response: any = await this.orderApi.getOrderBookDetails({ market_id });
    const details = response.order_book_details?.[0] || response;

    // ✅ 使用当前盘口价格
    // 买入时使用 ask（卖盘最低价），卖出时使用 bid（买盘最高价）
    const askPrice = details.ask ? parseFloat(details.ask.toString()) : 0;
    const bidPrice = details.bid ? parseFloat(details.bid.toString()) : 0;
    const lastTradePrice = details.last_trade_price
      ? parseFloat(details.last_trade_price.toString())
      : 0;

    // 根据买卖方向选择合适的价格
    let price: number;
    if (isBuy) {
      // 买入：使用 ask 价格（卖盘最低价）
      price = askPrice > 0 ? askPrice : lastTradePrice;
      log.info(`买入使用价格: ask=$${askPrice} (备用: last=$${lastTradePrice})`);
    } else {
      // 卖出：使用 bid 价格（买盘最高价）
      price = bidPrice > 0 ? bidPrice : lastTradePrice;
      log.info(`卖出使用价格: bid=$${bidPrice} (备用: last=$${lastTradePrice})`);
    }

    if (price > 0) {
      return price;
    }

    // 如果没有价格，抛出错误
    throw new Error(
      `无法获取 ${this.baseSymbol} 的实时价格。` +
        `订单簿返回: ${JSON.stringify(details).substring(0, 200)}`
    );
  }

  /**
   * 计算最近一轮的盈亏
   *
   * @returns 最近一次开平仓的盈亏（支持多笔订单）
   */
  async getLastRoundPnL(): Promise<number> {
    try {
      const orders = await this.getAccountOrders(10);

      if (orders.length < 2) {
        return 0;
      }

      const { openOrders, closeOrders } = this.groupOrdersBySide(orders);

      if (openOrders.length === 0 || closeOrders.length === 0) {
        return 0;
      }

      const openTotalPrice = this.calculatePrice(openOrders);
      const closeTotalPrice = this.calculatePrice(closeOrders);

      const isOpenBuy =
        (openOrders[0] as any).side === 'buy' || !(openOrders[0] as any).is_ask;
      const pnl = isOpenBuy
        ? closeTotalPrice - openTotalPrice
        : openTotalPrice - closeTotalPrice;

      log.debug(
        `Lighter PnL: ${openOrders.length}笔开仓 @ $${openTotalPrice.toFixed(2)}, ` +
          `${closeOrders.length}笔平仓 @ $${closeTotalPrice.toFixed(2)}, 盈亏=$${pnl.toFixed(4)}`
      );

      return pnl;
    } catch (error: any) {
      log.error('计算 Lighter 盈亏失败', error);
      return 0;
    }
  }

  /**
   * 按side分组订单（只取最近一对）
   *
   * 注意：Lighter的side字段是空字符串，用is_ask判断
   * 同时用reduce_only区分开平仓可能更准确
   */
  private groupOrdersBySide(orders: any[]): { openOrders: any[]; closeOrders: any[] } {
    const closeOrders: any[] = [];
    const openOrders: any[] = [];

    // 方法1：通过 reduce_only 分组（更可靠）
    let foundNonReduceOnly = false;

    for (const order of orders) {
      const isReduceOnly = (order as any).reduce_only === true;

      if (!foundNonReduceOnly) {
        if (isReduceOnly) {
          // reduce_only = true → 平仓订单
          closeOrders.push(order);
        } else {
          // reduce_only = false → 开仓订单
          foundNonReduceOnly = true;
          openOrders.push(order);
        }
      } else {
        // 已经找到开仓订单，继续收集
        const isStillOpen = !(order as any).reduce_only;
        if (isStillOpen) {
          openOrders.push(order);
        } else {
          // 又遇到平仓订单，停止（只要最近一对）
          break;
        }
      }
    }

    return { openOrders, closeOrders };
  }

  /**
   * 计算加权平均价
   */
  private calculatePrice(orders: any[]): number {
    let totalValue = 0;
    let totalSize = 0;

    for (const order of orders) {
      totalValue += parseFloat(order.filled_quote_amount);
      totalSize += parseFloat(order.filled_base_amount);
    }

    return totalSize > 0 ? totalValue : 0;
  }

  /**
   * 获取账户订单历史
   *
   * @param limit - 返回订单数量限制（默认10）
   */
  async getAccountOrders(limit: number = 10): Promise<any[]> {
    try {
      // ⚠️ getAccountInactiveOrders 需要认证 token
      const authToken = await this.signer.createAuthTokenWithExpiry(600);

      const response = await this.apiClient.get('/api/v1/accountInactiveOrders', {
        account_index: this.accountIndex,
        limit,
        sort: 'desc',
        auth: authToken,
      });

      const orders = response.data.orders || [];
      log.debug(`查询到 ${orders.length} 个 Lighter 历史订单`);

      return orders;
    } catch (error: any) {
      log.error('获取 Lighter 账户订单失败', error);
      log.error(`错误详情: ${error.message}`);
      return [];
    }
  }

  /**
   * 获取持仓
   */
  async getPosition(): Promise<number> {
    try {
      const response: any = await this.accountApi.getAccount({
        by: 'index',
        value: this.accountIndex.toString(),
      });

      // ⚠️ API 返回格式：{ code: 200, total: 1, accounts: [...] }
      // 需要从 accounts 数组中取第一个元素
      const account = response.accounts?.[0];

      if (!account) {
        log.warn('Lighter API 返回的账户数据为空');
        return 0;
      }

      // positions 是数组
      const positions = account.positions || [];
      const position = positions.find((p: any) => p.market_id === this.marketIndex);

      if (!position) {
        return 0;
      }

      // ⚠️ 注意：API 返回的字段是 position (持仓大小) 和 sign (方向)
      // sign: 1 = long (多), -1 = short (空)
      const size = parseFloat(position.position || '0');
      const sign = position.sign || 1;

      // 根据 sign 决定正负：1 = 正(多), -1 = 负(空)
      return size * sign;
    } catch (error: any) {
      log.error('获取 Lighter 持仓失败', error);
      log.error(
        `错误详情: ${error.response?.data ? JSON.stringify(error.response.data) : error.message}`
      );
      // 如果查询失败，返回 0 而不是抛出错误
      return 0;
    }
  }

  /**
   * 获取详细持仓信息
   */
  async getPositionDetails(): Promise<LighterPosition | null> {
    try {
      const response: any = await this.accountApi.getAccount({
        by: 'index',
        value: this.accountIndex.toString(),
      });

      // ⚠️ API 返回格式：{ code: 200, total: 1, accounts: [...] }
      const account = response.accounts?.[0];

      if (!account) {
        log.warn('Lighter API 返回的账户数据为空');
        return null;
      }

      // positions 是数组
      const positions = account.positions || [];
      const position = positions.find((p: any) => p.market_id === this.marketIndex);

      if (!position) {
        return null;
      }

      // ⚠️ API 实际返回的字段
      return {
        marketId: position.market_id,
        symbol: position.symbol || this.baseSymbol,
        position: position.position, // 使用 position 字段（而不是 size）
        avgEntryPrice: position.avg_entry_price, // 使用 avg_entry_price
        unrealizedPnl: position.unrealized_pnl,
        liquidationPrice: position.liquidation_price || '0',
      };
    } catch (error: any) {
      log.error('获取 Lighter 详细持仓失败', error);
      return null;
    }
  }

  /**
   * 订阅 WebSocket 更新（暂未实现）
   */
  async subscribeToPositions(
    _onUpdate: (position: LighterPosition) => void
  ): Promise<void> {
    log.warn('Lighter WebSocket 订阅暂未实现');
    // TODO: 实现 WebSocket 订阅
  }

  /**
   * 关闭连接
   */
  close(): void {
    log.info('Lighter 客户端关闭');
  }
}
