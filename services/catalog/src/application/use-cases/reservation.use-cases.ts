/**
 * Aplicación · Casos de uso de reservas de inventario.
 *
 * Los usa el servicio de Pedidos durante la compra:
 * 1. `ReserveStock` al confirmar el carrito (aparta unidades y congela precios);
 * 2. `ConfirmReservation` si el pago se aprueba;
 * 3. `ReleaseReservation` si el pago falla o el pedido se cancela.
 *
 * Todas son idempotentes: repetir la misma petición (por ejemplo, porque la
 * red falló y Pedidos reintenta) no aparta ni devuelve unidades dos veces.
 */
import { Product } from '../../domain/entities/product.js';
import { Reservation, ReservationItem } from '../../domain/entities/reservation.js';
import {
  InsufficientStockError,
  InvalidReservationError,
  InvalidReservationTransitionError,
  ProductNotAvailableError,
  ReservationNotFoundError,
} from '../../domain/errors/catalog.errors.js';
import {
  ConfirmReservationPort,
  ReleaseReservationPort,
  ReserveStockCommand,
  ReserveStockPort,
} from '../ports/in/reservation.ports.js';
import { Clock } from '../ports/out/clock.js';
import { ProductRepository } from '../ports/out/product.repository.js';
import { ReservationRepository } from '../ports/out/reservation.repository.js';
import { ReservationView, toReservationView } from '../views/catalog.views.js';

/**
 * Aparta el stock de todos los productos de un pedido, o de ninguno.
 *
 * Descuenta producto por producto con operaciones atómicas. Si alguno no
 * alcanza, devuelve lo que ya había descontado (compensación) y falla, así
 * nunca queda una reserva a medias.
 */
export class ReserveStockUseCase implements ReserveStockPort {
  static readonly MAX_LINES = 50;
  static readonly MAX_QUANTITY_PER_LINE = 100;

  constructor(
    private readonly products: ProductRepository,
    private readonly reservations: ReservationRepository,
    private readonly clock: Clock,
  ) {}

  /**
   * @returns La reserva creada, o la existente si ese pedido ya tenía una activa.
   * @throws InvalidReservationError Si las líneas no son válidas.
   * @throws ProductNotAvailableError Si un producto no existe o está desactivado.
   * @throws InsufficientStockError Si no hay unidades suficientes de algún producto.
   * @throws InvalidReservationTransitionError Si la reserva de ese pedido ya fue liberada.
   */
  async execute(command: ReserveStockCommand): Promise<ReservationView> {
    const existing = await this.reservations.findByOrderId(command.orderId);
    if (existing) return this.reuse(existing);

    const lines = this.validateLines(command);
    const products = new Map((await this.products.findByIds(lines.map((l) => l.productId))).map((p) => [p.id, p]));
    for (const line of lines) {
      const product = products.get(line.productId);
      if (!product || !product.active) throw new ProductNotAvailableError(line.productId);
    }

    const items = await this.decrementAll(lines, products);
    const reservation = Reservation.create(command.orderId, items, this.clock.now());

    if (!(await this.reservations.create(reservation))) {
      // Otra petición con el mismo pedido se adelantó: se deshace lo nuestro y se devuelve la suya.
      await this.restock(items);
      return this.reuse((await this.reservations.findByOrderId(command.orderId))!);
    }
    return toReservationView(reservation);
  }

  /** Una reserva existente se reutiliza si sigue activa; si fue liberada, el pedido debe crearse de nuevo. */
  private reuse(existing: Reservation): ReservationView {
    if (existing.status === 'RELEASED') {
      throw new InvalidReservationTransitionError('RELEASED', 'RESERVED');
    }
    return toReservationView(existing);
  }

  /** Comprueba cantidades y une líneas repetidas del mismo producto. */
  private validateLines(command: ReserveStockCommand): { productId: string; quantity: number }[] {
    if (!command.orderId.trim()) throw new InvalidReservationError('La reserva necesita el id del pedido.');
    if (command.items.length === 0) throw new InvalidReservationError('El pedido no tiene productos.');

    const merged = new Map<string, number>();
    for (const item of command.items) {
      if (!Number.isInteger(item.quantity) || item.quantity <= 0) {
        throw new InvalidReservationError('Las cantidades deben ser enteros mayores que cero.');
      }
      merged.set(item.productId, (merged.get(item.productId) ?? 0) + item.quantity);
    }
    if (merged.size > ReserveStockUseCase.MAX_LINES) {
      throw new InvalidReservationError(`Un pedido puede tener como máximo ${ReserveStockUseCase.MAX_LINES} productos distintos.`);
    }
    for (const quantity of merged.values()) {
      if (quantity > ReserveStockUseCase.MAX_QUANTITY_PER_LINE) {
        throw new InvalidReservationError(`Se pueden comprar como máximo ${ReserveStockUseCase.MAX_QUANTITY_PER_LINE} unidades de cada producto.`);
      }
    }
    return [...merged].map(([productId, quantity]) => ({ productId, quantity }));
  }

  /** Descuenta cada línea; si una falla, devuelve las anteriores y lanza el error. */
  private async decrementAll(
    lines: { productId: string; quantity: number }[],
    products: Map<string, Product>,
  ): Promise<ReservationItem[]> {
    const reserved: ReservationItem[] = [];
    for (const line of lines) {
      const product = products.get(line.productId)!;
      const remaining = await this.products.adjustStock(line.productId, -line.quantity);
      if (remaining === null) {
        await this.restock(reserved);
        const current = await this.products.findById(line.productId);
        throw new InsufficientStockError(product.id, product.name, current?.stock ?? 0);
      }
      reserved.push({ productId: product.id, name: product.name, unitPrice: product.price.amount, quantity: line.quantity });
    }
    return reserved;
  }

  /** Devuelve al inventario las unidades de las líneas indicadas. */
  private async restock(items: readonly ReservationItem[]): Promise<void> {
    for (const item of items) {
      await this.products.adjustStock(item.productId, item.quantity);
    }
  }
}

/** Confirma la reserva de un pedido pagado. Si ya estaba confirmada, no hace nada. */
export class ConfirmReservationUseCase implements ConfirmReservationPort {
  constructor(private readonly reservations: ReservationRepository) {}

  /**
   * @throws ReservationNotFoundError Si el pedido no tiene reserva.
   * @throws InvalidReservationTransitionError Si la reserva ya fue liberada.
   */
  async execute(orderId: string): Promise<ReservationView> {
    const reservation = await this.reservations.findByOrderId(orderId);
    if (!reservation) throw new ReservationNotFoundError();
    if (reservation.status === 'CONFIRMED') return toReservationView(reservation);

    reservation.confirm();
    if (!(await this.reservations.updateStatus(orderId, 'RESERVED', 'CONFIRMED'))) {
      // Otra petición cambió el estado primero: se responde según el estado real.
      return this.execute(orderId);
    }
    return toReservationView(reservation);
  }
}

/** Libera la reserva y devuelve el stock. Si ya estaba liberada, no hace nada. */
export class ReleaseReservationUseCase implements ReleaseReservationPort {
  constructor(
    private readonly reservations: ReservationRepository,
    private readonly products: ProductRepository,
  ) {}

  /** @throws ReservationNotFoundError Si el pedido no tiene reserva. */
  async execute(orderId: string): Promise<ReservationView> {
    const reservation = await this.reservations.findByOrderId(orderId);
    if (!reservation) throw new ReservationNotFoundError();
    if (reservation.status === 'RELEASED') return toReservationView(reservation);

    const previous = reservation.status;
    reservation.release();
    // Solo quien logra el cambio de estado devuelve el stock: así nunca se devuelve dos veces.
    if (!(await this.reservations.updateStatus(orderId, previous, 'RELEASED'))) {
      return this.execute(orderId);
    }
    for (const item of reservation.items) {
      await this.products.adjustStock(item.productId, item.quantity);
    }
    return toReservationView(reservation);
  }
}
