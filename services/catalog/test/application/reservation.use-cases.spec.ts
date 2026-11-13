/**
 * Pruebas de las reservas de inventario: todo o nada, idempotencia y liberación.
 */
import {
  ConfirmReservationUseCase,
  ReleaseReservationUseCase,
  ReserveStockUseCase,
} from '../../src/application/use-cases/reservation.use-cases.js';
import { Product } from '../../src/domain/entities/product.js';
import {
  InsufficientStockError,
  InvalidReservationError,
  InvalidReservationTransitionError,
  ProductNotAvailableError,
  ReservationNotFoundError,
} from '../../src/domain/errors/catalog.errors.js';
import { FixedClock, InMemoryProductRepository, InMemoryReservationRepository } from '../fakes/fakes.js';

async function setup() {
  const products = new InMemoryProductRepository();
  const reservations = new InMemoryReservationRepository();
  const now = new Date();
  const make = (id: string, name: string, price: number, stock: number) =>
    Product.create(id, { name, description: '', price, categoryId: 'c', images: [] }, stock, now);
  await products.save(make('cuaderno', 'Cuaderno', 12000, 5));
  await products.save(make('lapiz', 'Lápiz', 1500, 2));
  const inactivo = make('viejo', 'Producto viejo', 1000, 10);
  inactivo.setActive(false);
  await products.save(inactivo);

  const stock = async (id: string) => (await products.findById(id))!.stock;
  return {
    stock,
    reserve: new ReserveStockUseCase(products, reservations, new FixedClock()),
    confirm: new ConfirmReservationUseCase(reservations),
    release: new ReleaseReservationUseCase(reservations, products),
  };
}

describe('ReserveStockUseCase', () => {
  it('descuenta el stock y congela nombre y precio', async () => {
    const t = await setup();
    const r = await t.reserve.execute({
      orderId: 'o1',
      items: [
        { productId: 'cuaderno', quantity: 2 },
        { productId: 'lapiz', quantity: 1 },
        { productId: 'cuaderno', quantity: 1 }, // línea repetida: se une con la primera
      ],
    });
    expect(r).toMatchObject({ status: 'RESERVED', total: 3 * 12000 + 1500 });
    expect(r.items).toEqual([
      { productId: 'cuaderno', name: 'Cuaderno', unitPrice: 12000, quantity: 3 },
      { productId: 'lapiz', name: 'Lápiz', unitPrice: 1500, quantity: 1 },
    ]);
    expect(await t.stock('cuaderno')).toBe(2);
    expect(await t.stock('lapiz')).toBe(1);
  });

  it('si un producto no alcanza, no descuenta nada (todo o nada)', async () => {
    const t = await setup();
    await expect(
      t.reserve.execute({ orderId: 'o1', items: [{ productId: 'cuaderno', quantity: 2 }, { productId: 'lapiz', quantity: 3 }] }),
    ).rejects.toThrow(InsufficientStockError);
    expect(await t.stock('cuaderno')).toBe(5);
    expect(await t.stock('lapiz')).toBe(2);
  });

  it('repetir la misma reserva no descuenta dos veces', async () => {
    const t = await setup();
    const cmd = { orderId: 'o1', items: [{ productId: 'cuaderno', quantity: 2 }] };
    await t.reserve.execute(cmd);
    await t.reserve.execute(cmd);
    expect(await t.stock('cuaderno')).toBe(3);
  });

  it('rechaza productos inexistentes o desactivados y cantidades inválidas', async () => {
    const t = await setup();
    await expect(t.reserve.execute({ orderId: 'o1', items: [{ productId: 'viejo', quantity: 1 }] })).rejects.toThrow(
      ProductNotAvailableError,
    );
    await expect(t.reserve.execute({ orderId: 'o2', items: [{ productId: 'nope', quantity: 1 }] })).rejects.toThrow(
      ProductNotAvailableError,
    );
    await expect(t.reserve.execute({ orderId: 'o3', items: [{ productId: 'cuaderno', quantity: 0 }] })).rejects.toThrow(
      InvalidReservationError,
    );
    await expect(t.reserve.execute({ orderId: 'o4', items: [] })).rejects.toThrow(InvalidReservationError);
  });
});

describe('Confirmar y liberar', () => {
  it('liberar devuelve el stock una sola vez aunque se repita', async () => {
    const t = await setup();
    await t.reserve.execute({ orderId: 'o1', items: [{ productId: 'cuaderno', quantity: 4 }] });
    await t.release.execute('o1');
    await t.release.execute('o1');
    expect(await t.stock('cuaderno')).toBe(5);
  });

  it('una reserva confirmada también se puede liberar (pedido cancelado antes del envío)', async () => {
    const t = await setup();
    await t.reserve.execute({ orderId: 'o1', items: [{ productId: 'lapiz', quantity: 2 }] });
    expect((await t.confirm.execute('o1')).status).toBe('CONFIRMED');
    expect((await t.confirm.execute('o1')).status).toBe('CONFIRMED'); // idempotente
    expect((await t.release.execute('o1')).status).toBe('RELEASED');
    expect(await t.stock('lapiz')).toBe(2);
  });

  it('no se confirma ni se reutiliza una reserva liberada', async () => {
    const t = await setup();
    const cmd = { orderId: 'o1', items: [{ productId: 'lapiz', quantity: 1 }] };
    await t.reserve.execute(cmd);
    await t.release.execute('o1');
    await expect(t.confirm.execute('o1')).rejects.toThrow(InvalidReservationTransitionError);
    await expect(t.reserve.execute(cmd)).rejects.toThrow(InvalidReservationTransitionError);
  });

  it('falla si el pedido no tiene reserva', async () => {
    const t = await setup();
    await expect(t.release.execute('nope')).rejects.toThrow(ReservationNotFoundError);
  });
});
