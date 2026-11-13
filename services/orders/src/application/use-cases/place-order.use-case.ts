/**
 * Aplicación · Caso de uso: comprar (checkout).
 */
import { Order } from '../../domain/entities/order.js';
import { EmptyCartError, PaymentServiceUnavailableError } from '../../domain/errors/order.errors.js';
import { ShippingAddress } from '../../domain/value-objects/shipping-address.js';
import { PlaceOrderCommand, PlaceOrderPort } from '../ports/in/order.ports.js';
import { AppLogger } from '../ports/out/app-logger.js';
import { CartRepository } from '../ports/out/cart.repository.js';
import { CatalogClient } from '../ports/out/catalog.client.js';
import { Clock } from '../ports/out/clock.js';
import { IdGenerator } from '../ports/out/id-generator.js';
import { OrderRepository } from '../ports/out/order.repository.js';
import { ChargeResult, PaymentClient } from '../ports/out/payment.client.js';
import { OrderView, toOrderView } from '../views/order.views.js';

/**
 * Coordina la compra entre Catálogo y Pagos (patrón saga con compensación):
 *
 * 1. Valida que el carrito no esté vacío y la dirección de envío.
 * 2. Reserva el stock en Catálogo. Si falla, no se guarda nada y el carrito queda igual.
 * 3. Guarda el pedido en PENDING_PAYMENT con los precios que fijó la reserva.
 * 4. Cobra en Pagos:
 *    - aprobado → pedido PAID, se confirma la reserva y se vacía el carrito;
 *    - rechazado → pedido PAYMENT_FAILED y se libera la reserva (compensación);
 *    - Pagos no responde → igual que rechazado, queda "por conciliar" y responde 503.
 *
 * Confirmar o liberar la reserva se intenta "sin detener la compra": si
 * Catálogo justo se cayó, el pedido ya tiene su estado correcto y el fallo
 * queda registrado en el log para revisarlo.
 */
export class PlaceOrderUseCase implements PlaceOrderPort {
  constructor(
    private readonly carts: CartRepository,
    private readonly orders: OrderRepository,
    private readonly catalog: CatalogClient,
    private readonly payments: PaymentClient,
    private readonly ids: IdGenerator,
    private readonly clock: Clock,
    private readonly logger: AppLogger,
  ) {}

  /**
   * @returns El pedido en estado PAID o PAYMENT_FAILED (con el motivo del rechazo).
   * @throws EmptyCartError Si el carrito está vacío.
   * @throws InvalidShippingAddressError Si la dirección no es válida.
   * @throws OutOfStockError | ProductUnavailableError Si Catálogo no puede reservar.
   * @throws CatalogUnavailableError Si Catálogo no responde.
   * @throws PaymentServiceUnavailableError Si Pagos no responde (el pedido queda PAYMENT_FAILED).
   */
  async execute(command: PlaceOrderCommand): Promise<OrderView> {
    const cart = await this.carts.findByUserId(command.userId);
    if (!cart || cart.isEmpty) throw new EmptyCartError();
    const address = ShippingAddress.create(command.shippingAddress);

    const orderId = this.ids.generate();
    const items = await this.catalog.reserve(
      orderId,
      cart.lines.map((l) => ({ productId: l.productId, quantity: l.quantity })),
    );

    const order = Order.place(orderId, command.userId, items, address, this.clock.now());
    await this.orders.save(order);

    let result: ChargeResult;
    try {
      result = await this.payments.charge({ orderId, userId: command.userId, amount: order.total, card: command.card });
    } catch {
      // No se sabe si Pagos alcanzó a cobrar: queda por conciliar (ver ReconcilePaymentsUseCase).
      order.markPaymentFailed(
        'No pudimos confirmar el pago con el banco. Si se alcanzó a cobrar, lo reembolsaremos automáticamente.',
        null,
        null,
        this.clock.now(),
        true,
      );
      await this.orders.save(order);
      await this.releaseQuietly(orderId);
      throw new PaymentServiceUnavailableError();
    }

    if (result.status === 'APPROVED') {
      order.markPaid(result.paymentId, result.cardLast4, this.clock.now());
      await this.orders.save(order);
      await this.confirmQuietly(orderId);
      cart.clear();
      await this.carts.save(cart);
    } else {
      order.markPaymentFailed(result.reason ?? 'El pago fue rechazado.', result.paymentId, result.cardLast4, this.clock.now());
      await this.orders.save(order);
      await this.releaseQuietly(orderId);
    }
    return toOrderView(order);
  }

  /** Confirma la reserva; si Catálogo falla, lo registra sin interrumpir. */
  private async confirmQuietly(orderId: string): Promise<void> {
    try {
      await this.catalog.confirm(orderId);
    } catch (error) {
      this.logger.warn(`No se pudo confirmar la reserva del pedido ${orderId}: ${(error as Error).message}`);
    }
  }

  /** Libera la reserva; si Catálogo falla, lo registra sin interrumpir. */
  private async releaseQuietly(orderId: string): Promise<void> {
    try {
      await this.catalog.release(orderId);
    } catch (error) {
      this.logger.warn(`No se pudo liberar la reserva del pedido ${orderId}; revisar stock: ${(error as Error).message}`);
    }
  }
}
