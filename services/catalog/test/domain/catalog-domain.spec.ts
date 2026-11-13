/**
 * Pruebas de las entidades del catálogo: precio, categoría, producto y reserva.
 */
import { Category } from '../../src/domain/entities/category.js';
import { Product } from '../../src/domain/entities/product.js';
import { Reservation } from '../../src/domain/entities/reservation.js';
import {
  InvalidCategoryError,
  InvalidProductError,
  InvalidReservationTransitionError,
} from '../../src/domain/errors/catalog.errors.js';
import { Price } from '../../src/domain/value-objects/price.js';

const NOW = new Date('2026-01-15T10:00:00Z');
const cuaderno = {
  name: '  Cuaderno   Univalle ',
  description: 'Cuaderno argollado de 100 hojas',
  price: 12000,
  categoryId: 'cat-1',
  images: ['https://picsum.photos/600'],
};

describe('Price', () => {
  it('acepta enteros positivos y calcula subtotales', () => {
    expect(Price.of(12000).times(3)).toBe(36000);
  });

  it.each([0, -1, 10.5, Price.MAX + 1])('rechaza %s', (amount) => {
    expect(() => Price.of(amount)).toThrow(InvalidProductError);
  });
});

describe('Category', () => {
  it('limpia el nombre y calcula una clave sin tildes ni mayúsculas', () => {
    const c = Category.create('c1', '  Ropa   Univallé ', '', NOW);
    expect(c.name).toBe('Ropa Univallé');
    expect(c.nameKey).toBe('ropa univalle');
    expect(c.description).toBeNull();
  });

  it('valida la longitud del nombre', () => {
    expect(() => Category.create('c1', 'A', null, NOW)).toThrow(InvalidCategoryError);
  });
});

describe('Product', () => {
  it('se crea activo, con nombre limpio y disponible si hay stock', () => {
    const p = Product.create('p1', cuaderno, 5, NOW);
    expect(p.name).toBe('Cuaderno Univalle');
    expect(p.active).toBe(true);
    expect(p.isPurchasable).toBe(true);
  });

  it('no está disponible sin stock o desactivado', () => {
    expect(Product.create('p1', cuaderno, 0, NOW).isPurchasable).toBe(false);
    const p = Product.create('p2', cuaderno, 5, NOW);
    p.setActive(false);
    expect(p.isPurchasable).toBe(false);
  });

  it('valida stock inicial, imágenes y precio', () => {
    expect(() => Product.create('p', cuaderno, -1, NOW)).toThrow(InvalidProductError);
    expect(() => Product.create('p', { ...cuaderno, images: ['ftp://x/y.png'] }, 1, NOW)).toThrow(InvalidProductError);
    expect(() => Product.create('p', { ...cuaderno, images: Array(9).fill('https://x.co/a.png') }, 1, NOW)).toThrow(
      InvalidProductError,
    );
    expect(() => Product.create('p', { ...cuaderno, price: 0 }, 1, NOW)).toThrow(InvalidProductError);
  });

  it('update cambia solo lo indicado y valida el resultado', () => {
    const p = Product.create('p1', cuaderno, 5, NOW);
    p.update({ price: 15000 });
    expect(p.price.amount).toBe(15000);
    expect(p.name).toBe('Cuaderno Univalle');
    expect(() => p.update({ name: 'X' })).toThrow(InvalidProductError);
  });
});

describe('Reservation', () => {
  const items = [
    { productId: 'p1', name: 'Cuaderno', unitPrice: 12000, quantity: 2 },
    { productId: 'p2', name: 'Lápiz', unitPrice: 1500, quantity: 4 },
  ];

  it('calcula el total con los precios congelados', () => {
    expect(Reservation.create('o1', items, NOW).total).toBe(30000);
  });

  it('sigue las transiciones RESERVED → CONFIRMED → RELEASED', () => {
    const r = Reservation.create('o1', items, NOW);
    r.confirm();
    expect(r.status).toBe('CONFIRMED');
    expect(() => r.confirm()).toThrow(InvalidReservationTransitionError);
    r.release();
    expect(r.status).toBe('RELEASED');
    expect(() => r.release()).toThrow(InvalidReservationTransitionError);
  });
});
