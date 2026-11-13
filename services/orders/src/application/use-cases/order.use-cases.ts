/**
 * Aplicación · Casos de uso de consulta y gestión de pedidos.
 */
import { InvalidOrderTransitionError, OrderNotFoundError } from '../../domain/errors/order.errors.js';
import {
  CancelOrderPort,
  GetOrderPort,
  GetTopProductsPort,
  GetUserPurchasesPort,
  ListAllOrdersPort,
  ListAllOrdersQuery,
  ListMyOrdersPort,
  Requester,
  UpdateOrderStatusPort,
} from '../ports/in/order.ports.js';
import { AppLogger } from '../ports/out/app-logger.js';
import { CatalogClient } from '../ports/out/catalog.client.js';
import { Clock } from '../ports/out/clock.js';
import { OrderPage, OrderRepository, ProductSales, PurchasedProduct } from '../ports/out/order.repository.js';
import { PaymentClient } from '../ports/out/payment.client.js';
import { normalizePage } from '../services/pagination.js';
import { OrderPageView, OrderView, toOrderView } from '../views/order.views.js';

/** Convierte una página del repositorio en su vista. */
function toPageView(result: OrderPage, page: number, pageSize: number): OrderPageView {
  return {
    items: result.items.map(toOrderView),
    total: result.total,
    page,
    pageSize,
    totalPages: Math.ceil(result.total / pageSize),
  };
}

/** Historial de pedidos del usuario autenticado. */
export class ListMyOrdersUseCase implements ListMyOrdersPort {
  constructor(private readonly orders: OrderRepository) {}

  async execute(userId: string, page?: number, pageSize?: number): Promise<OrderPageView> {
    const p = normalizePage(page, pageSize);
    return toPageView(await this.orders.find({ userId, ...p }), p.page, p.pageSize);
  }
}

/** Detalle de un pedido. Un cliente solo ve los suyos; para él, el pedido de otro "no existe". */
export class GetOrderUseCase implements GetOrderPort {
  constructor(private readonly orders: OrderRepository) {}

  /** @throws OrderNotFoundError Si no existe o es de otro usuario. */
  async execute(orderId: string, requester: Requester): Promise<OrderView> {
    const order = await this.orders.findById(orderId);
    if (!order || (!requester.isAdmin && order.userId !== requester.userId)) throw new OrderNotFoundError();
    return toOrderView(order);
  }
}

/**
 * El cliente cancela un pedido pagado antes del envío. Primero se reembolsa
 * (si Pagos no responde, no se cancela nada y se informa 503); después se
 * marca CANCELLED y se devuelve el stock a Catálogo.
 */
export class CancelOrderUseCase implements CancelOrderPort {
  constructor(
    private readonly orders: OrderRepository,
    private readonly payments: PaymentClient,
    private readonly catalog: CatalogClient,
    private readonly clock: Clock,
    private readonly logger: AppLogger,
  ) {}

  /**
   * @throws OrderNotFoundError Si no existe o es de otro usuario.
   * @throws InvalidOrderTransitionError Si ya no se puede cancelar.
   * @throws PaymentServiceUnavailableError Si no se pudo reembolsar.
   */
  async execute(orderId: string, userId: string): Promise<OrderView> {
    const order = await this.orders.findById(orderId);
    if (!order || order.userId !== userId) throw new OrderNotFoundError();
    if (!order.isCancellable) throw new InvalidOrderTransitionError(order.status, 'CANCELLED');

    await this.payments.refund(orderId);
    order.cancel(this.clock.now());
    await this.orders.save(order);

    try {
      await this.catalog.release(orderId);
    } catch (error) {
      this.logger.warn(`Pedido ${orderId} cancelado pero no se pudo devolver el stock: ${(error as Error).message}`);
    }
    return toOrderView(order);
  }
}

/** Todos los pedidos, con filtro por estado (panel de administración). */
export class ListAllOrdersUseCase implements ListAllOrdersPort {
  constructor(private readonly orders: OrderRepository) {}

  async execute(query: ListAllOrdersQuery): Promise<OrderPageView> {
    const p = normalizePage(query.page, query.pageSize, 20);
    return toPageView(await this.orders.find({ status: query.status, ...p }), p.page, p.pageSize);
  }
}

/** El admin avanza el pedido: PAID → SHIPPED → DELIVERED. */
export class UpdateOrderStatusUseCase implements UpdateOrderStatusPort {
  constructor(
    private readonly orders: OrderRepository,
    private readonly clock: Clock,
  ) {}

  /**
   * @throws OrderNotFoundError Si no existe.
   * @throws InvalidOrderTransitionError Si el cambio no sigue el orden permitido.
   */
  async execute(orderId: string, status: 'SHIPPED' | 'DELIVERED'): Promise<OrderView> {
    const order = await this.orders.findById(orderId);
    if (!order) throw new OrderNotFoundError();

    if (status === 'SHIPPED') order.ship(this.clock.now());
    else if (status === 'DELIVERED') order.deliver(this.clock.now());
    else throw new InvalidOrderTransitionError(order.status, status);

    await this.orders.save(order);
    return toOrderView(order);
  }
}

/** Lo que compró un usuario, para personalizar sus recomendaciones. */
export class GetUserPurchasesUseCase implements GetUserPurchasesPort {
  constructor(private readonly orders: OrderRepository) {}

  execute(userId: string): Promise<PurchasedProduct[]> {
    return this.orders.purchasedByUser(userId);
  }
}

/** Los productos más vendidos (entre 1 y 50; por defecto 20). */
export class GetTopProductsUseCase implements GetTopProductsPort {
  constructor(private readonly orders: OrderRepository) {}

  execute(limit = 20): Promise<ProductSales[]> {
    return this.orders.topSelling(Math.min(50, Math.max(1, Math.floor(limit))));
  }
}
