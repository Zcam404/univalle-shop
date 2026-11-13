/**
 * Pruebas del dominio de Pedidos: carrito, dirección de envío y estados del pedido.
 */
import { Cart } from '../../src/domain/entities/cart.js';
import { Order } from '../../src/domain/entities/order.js';
import {
  CartItemNotFoundError,
  CartLimitReachedError,
  InvalidCartItemError,
  InvalidOrderTransitionError,
  InvalidShippingAddressError,
} from '../../src/domain/errors/order.errors.js';
import { ShippingAddress } from '../../src/domain/value-objects/shipping-address.js';
import { address } from '../fakes/fakes.js';

const NOW = new Date('2026-01-15T10:00:00Z');
const snapshot = (id: string, price = 1000) => ({ productId: id, name: `Producto ${id}`, unitPrice: price, imageUrl: null });

describe('Cart', () => {
  it('suma cantidades del mismo producto y calcula el total estimado', () => {
    const cart = Cart.empty('u1');
    cart.add(snapshot('a', 1000), 2);
    cart.add(snapshot('a', 1200), 1); // precio actualizado
    cart.add(snapshot('b', 500), 4);
    expect(cart.quantityOf('a')).toBe(3);
    expect(cart.estimatedTotal).toBe(3 * 1200 + 4 * 500);
  });

  it('valida cantidades y límites', () => {
    const cart = Cart.empty('u1');
    expect(() => cart.add(snapshot('a'), 0)).toThrow(InvalidCartItemError);
    cart.add(snapshot('a'), 100);
    expect(() => cart.add(snapshot('a'), 1)).toThrow(InvalidCartItemError);
    for (let i = 1; i < Cart.MAX_LINES; i++) cart.add(snapshot(`p${i}`), 1);
    expect(() => cart.add(snapshot('extra'), 1)).toThrow(CartLimitReachedError);
  });

  it('cambia cantidades, quita y vacía', () => {
    const cart = Cart.empty('u1');
    cart.add(snapshot('a'), 1);
    cart.setQuantity('a', 5);
    expect(cart.quantityOf('a')).toBe(5);
    expect(() => cart.setQuantity('zz', 1)).toThrow(CartItemNotFoundError);
    cart.remove('a');
    expect(cart.isEmpty).toBe(true);
  });
});

describe('ShippingAddress', () => {
  it('limpia el teléfono y exige los campos obligatorios', () => {
    expect(ShippingAddress.create(address).toPrimitives().phone).toBe('3001234567');
    expect(() => ShippingAddress.create({ ...address, city: ' ' })).toThrow(InvalidShippingAddressError);
    expect(() => ShippingAddress.create({ ...address, phone: '12' })).toThrow(InvalidShippingAddressError);
  });
});

describe('Order', () => {
  const newOrder = () =>
    Order.place('o1', 'u1', [{ productId: 'a', name: 'A', unitPrice: 12000, quantity: 2 }], ShippingAddress.create(address), NOW);

  it('nace pendiente de pago y calcula el total', () => {
    const o = newOrder();
    expect(o.status).toBe('PENDING_PAYMENT');
    expect(o.total).toBe(24000);
  });

  it('sigue el flujo pagado → enviado → entregado y lo registra en el historial', () => {
    const o = newOrder();
    o.markPaid('pay-1', '4242', NOW);
    expect(o.isCancellable).toBe(true);
    o.ship(NOW);
    expect(o.isCancellable).toBe(false);
    o.deliver(NOW);
    expect(o.history.map((h) => h.status)).toEqual(['PENDING_PAYMENT', 'PAID', 'SHIPPED', 'DELIVERED']);
  });

  it('no permite saltos de estado', () => {
    const o = newOrder();
    expect(() => o.ship(NOW)).toThrow(InvalidOrderTransitionError);
    o.markPaymentFailed('Fondos insuficientes', null, null, NOW);
    expect(() => o.markPaid('p', null, NOW)).toThrow(InvalidOrderTransitionError);
    expect(() => o.cancel(NOW)).toThrow(InvalidOrderTransitionError);
  });
});
